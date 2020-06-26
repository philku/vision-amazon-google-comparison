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

    // Helper fn
    function blank_if_none(item){
        if(item === undefined || item === null){
            return '';
        }else{
            return item.toString();
        }
    }

    // Helper fn
    function listOut(obj){
        let ret = '';

        let i = 0;
        Object.keys(obj).forEach(key => {
            if(i < 4){ret += key.toString() + ' ';}
            i++;
        });

        return ret;
    }

    function reliableBrand(confidence, brand){

        console.log('CONFIDENCE: ', confidence);
        console.log('brand');

        if (parseFloat(confidence) > 0.75){
            console.log('returning ', brand);
            return brand;
        }else{
            console.log('returning nothing');
            return '';
        }
    }

    fs.writeFileSync('./out/index.html','<html><head>' +
        '<link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.0/css/bootstrap.min.css" integrity="sha384-9aIt2nRpC12Uk9gS9baDl411NQApFmC26EwAOH8WgZl5MYYxFfc+NcPb1dKGj7Sk" crossorigin="anonymous">' +
        '</head><body><div class="container">');

    files.forEach(file => {
        let name = file.path.substr(6);

        console.log('\nImage: ', name);
        console.log('\nAmazon Results\nLabels:\n', file.keywords.amazon.labels);
        console.log('\nGoogle Results\nLabels:\n', file.keywords.google.labels);
        console.log('Brands:\n', file.keywords.google.logos, '\n');

        // File Name
        fs.appendFileSync('./out/index.html','<br><br><h1 class="text-center">' + name + '</h1><br>');

        // Image
        fs.appendFileSync('./out/index.html',`<div class="text-center"><img src=".${file.path}" style="height:200px"></div>`);

        // Table of labels
        fs.appendFileSync('./out/index.html','<table class="table"><tr><th colspan="2">Amazon</th><th colspan="4">Google</th></tr>' +
            '<tr><th>Label</th><th>%</th><th>Label</th><th>%</th><th>Brand</th><th>%</th></tr>');

        let i = 0;
        while(i<10){
            fs.appendFileSync('./out/index.html','<tr><td>' +
                blank_if_none(Object.keys(file.keywords.amazon.labels)[i]) +
                '</td><td>' +
                blank_if_none(file.keywords.amazon.labels[Object.keys(file.keywords.amazon.labels)[i]]).substr(0,6) +
                '</td><td>' +
                blank_if_none(Object.keys(file.keywords.google.labels)[i]) +
                '</td><td>' +
                blank_if_none(file.keywords.google.labels[Object.keys(file.keywords.google.labels)[i]]).substr(0,6) +
                '</td><td>' +
                blank_if_none(Object.keys(file.keywords.google.logos)[i]) +
                '</td><td>' +
                blank_if_none(file.keywords.google.logos[Object.keys(file.keywords.google.logos)[i]]).substr(0,6) +
                '</td></tr>');
            i++;
        }

        fs.appendFileSync('./out/index.html','</table>');

        fs.appendFileSync('./out/index.html','<div><b>Search Strings</b><br>' +
            '<p><b>Amazon: </b>' +
            listOut(file.keywords.amazon.labels) +
            '</p>' +
            '<p><b>Google: </b>' +
            listOut(file.keywords.google.labels) +
            reliableBrand(file.keywords.google.logos[Object.keys(file.keywords.google.logos)[0]], Object.keys(file.keywords.google.logos)[0]) +
            '</p>' +
            '</div>');

    });

    fs.appendFileSync('./out/index.html','</div></body></html>');
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