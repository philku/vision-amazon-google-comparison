const fs = require('fs');
const { exit } = require('process');
const vision = require('@google-cloud/vision');
const client = new vision.ImageAnnotatorClient({
    credentials: require("./splayit-test-a3c7b33b6085.json")
});


/** some title
 *  Checks to see if Amazon or Google is better
 */


let input_files = ["./img/shovel.jpg"];


/**
 * Feed image through image analysis: Google, and Amazon.
 * 
 *
 * @param {*} image - Path to the image to check
 * @returns {Promise[Array]} Arrray of keywords
 */
function image_analysis(image){
    return new Promise((resolve,reject)=>{
        const [result] = await client.labelDetection('../img/shovel.jpg');
        const labels = result.labelAnnotations;
        console.log('Labels:');
        labels.forEach(label => console.log(label.description));
//        fs.readFile(image, function(err, data) {
//            resolve(['test','kywd']);
//        });
    });
}


function product_checks(keywords){
    return Promise.resolve();
}


function main(){
    function single_process(path){
        return image_analysis(path).then(keywords => {
            return product_checks(keywords);
        });
    }
    return Promise.all([input_files.forEach(path => {single_process(path)})]).then(data => {
        console.log(data)
    });
}

main().then(()=>{
    exit();
});