/** Amazon v Google image recognition comparison
 *  Checks to see if Amazon or Google is better at recognising products for sale on amazon
 *
 *  Created for SplayIt by Philip Kubin
 */

const fs = require('fs');

// Requirements for Google
const vision = require('@google-cloud/vision');
const client = new vision.ImageAnnotatorClient({
    credentials: require("./credentials/google-creds.json")
});

// Requirements for Amazon
const AWS = require('aws-sdk');
AWS.config.loadFromPath('./credentials/aws-creds.json');
let rekognition = new AWS.Rekognition();


/**
 * Scans the ./img/ directory for all files
 * @returns {Promise<[]>}   Array of filepaths
 */
function read_img_dir(){
    return new Promise((resolve,reject) => {
        fs.readdir("./img/", function (err, files) {

            if (err) {
                return console.log('Unable to scan directory: ' + err);
            }

            return resolve(files.map(file => {return "./img/" + file})) // Array of file paths
        });
    });
}


/**
 * Creates buffers from images so they can be sent to APIs
 * @param {Array} input_files - An array containing strings representing the filepaths of all images to check
 * @returns {Promise<[]>}  Returns a Promise containing an Array objects with path and buffer values
 */
function createBuffers(input_files) {
    return Promise.all(
        input_files.map(file => {
            return new Promise((resolve,reject)=>{
                return fs.readFile(file, function (err, data) {
                    if (err) throw err;
                    return resolve(data);
                });
            });
        })
    ).then(r=>{

        let input_files_encoded = [];

        Object.keys(r).forEach(i => {
            input_files_encoded.push({
                "path": input_files[i],
                "buffer": r[i]
            })
        });

        return Promise.resolve(input_files_encoded);
    });
}


/**
 * Feed image through analysis: Google, and Amazon.
 * @param {*} image_buffer - The Buffer/base64 encoded image to send to APIs
 * @returns {Promise[Array]} Array of keywords
 */
function image_analysis(image_buffer){

    function google() {
        // Send image to
        return client.annotateImage({
            // Run detection
            image: {content: image_buffer},
            features: [
                {type: 'LABEL_DETECTION'},
                {type: 'TEXT_DETECTION'},
                {type: 'LOGO_DETECTION'},
            ],

        }).then(result => {
            // Organize results
            result = result[0];

            let ret = {
                labels: {},
                logos: {},
            };

            result.labelAnnotations.forEach(annotation => {
                ret.labels[annotation.description] = annotation.score;
            });
            result.logoAnnotations.forEach(annotation => {
                ret.logos[annotation.description] = annotation.score;
            });

            return Promise.resolve(ret);

        }).catch(err => {
            console.error(err);
            return Promise.reject(err);
        });
    }

    function amazon() {
        return new Promise((resolve,reject)=>{

            rekognition.detectLabels({
                Image: { /* required */
                    Bytes: image_buffer
                },
                MaxLabels: '70',
                MinConfidence: '50'
            }, function(err, data) {
                if (err) reject(err, err.stack); // an error occurred
                else     resolve(data);           // successful response
            });

        }).then(data=>{

            let ret = {
                labels: {}
            };

            data.Labels.forEach(label => {
                ret.labels[label.Name] = label.Confidence;
            });

            return Promise.resolve(ret);
        });

    }

    return Promise.all([
        google(),
        amazon(),
    ]).then(r => {
        return Promise.resolve({
            google: r[0],
            amazon: r[1],
        });
    });
}


function keyword_report(files){

    files.forEach(file => {
        let name = file.path.substr(6);
        console.log(name);
    })

}


function main(){

    // First we find the files
    return read_img_dir().then(filepaths => {
        // Then we create buffers so images can be sent to the APIs
        return createBuffers(filepaths);
    }).then(files => {
        // Here we perform image analysis on both Google and Amazon

        return Promise.all(
            files.map(file => {
                return image_analysis(file.buffer)
            })
        ).then(keywords => {

            Object.keys(files).forEach(i => {
                files[i].buffer = null;
                files[i].keywords = keywords[i];
            });

            return Promise.resolve(files);
        });

    }).then(files => {

        let report = keyword_report(files);
    });
}
main();