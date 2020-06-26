const fs = require('fs');


// Required for PAAPI
const paapi_creds = require('./credentials/paapi-creds.json');
const ProductAdvertisingAPIv1 = require('paapi5-nodejs-sdk');

let defaultClient = ProductAdvertisingAPIv1.ApiClient.instance;

defaultClient.accessKey = paapi_creds.accessKey;
defaultClient.secretKey = paapi_creds.secretKey;

defaultClient.host = 'webservices.amazon.com';
defaultClient.region = 'us-east-1';

let api = new ProductAdvertisingAPIv1.DefaultApi();

let searchItemsRequest = new ProductAdvertisingAPIv1.SearchItemsRequest();

searchItemsRequest['PartnerTag'] = paapi_creds.partnerTag;
searchItemsRequest['PartnerType'] = 'Associates';

searchItemsRequest['Keywords'] = 'Harry Potter';

searchItemsRequest['SearchIndex'] = 'All';
searchItemsRequest['ItemCount'] = 1;

searchItemsRequest['Resources'] = ['Images.Primary.Medium', 'ItemInfo.Title', 'Offers.Listings.Price'];



let callback = function (error, data, response) {
    if (error) {
        console.log('Error calling PA-API 5.0!');
        console.log('Printing Full Error Object:\n' + JSON.stringify(error, null, 1));
        console.log('Status Code: ' + error['status']);
        if (error['response'] !== undefined && error['response']['text'] !== undefined) {
            console.log('Error Object: ' + JSON.stringify(error['response']['text'], null, 1));
        }
    } else {
        console.log('API called successfully.');
        var searchItemsResponse = ProductAdvertisingAPIv1.SearchItemsResponse.constructFromObject(data);
        console.log('Complete Response: \n' + JSON.stringify(searchItemsResponse, null, 1));
        if (searchItemsResponse['SearchResult'] !== undefined) {
            console.log('Printing First Item Information in SearchResult:');
            var item_0 = searchItemsResponse['SearchResult']['Items'][0];
            if (item_0 !== undefined) {
                if (item_0['ASIN'] !== undefined) {
                    console.log('ASIN: ' + item_0['ASIN']);
                }
                if (item_0['DetailPageURL'] !== undefined) {
                    console.log('DetailPageURL: ' + item_0['DetailPageURL']);
                }
                if (item_0['ItemInfo'] !== undefined && item_0['ItemInfo']['Title'] !== undefined && item_0['ItemInfo']['Title']['DisplayValue'] !== undefined) {
                    console.log('Title: ' + item_0['ItemInfo']['Title']['DisplayValue']);
                }
                if (item_0['Offers'] !== undefined && item_0['Offers']['Listings'] !== undefined && item_0['Offers']['Listings'][0]['Price'] !== undefined && item_0['Offers']['Listings'][0]['Price']['DisplayAmount'] !== undefined) {
                    console.log('Buying Price: ' + item_0['Offers']['Listings'][0]['Price']['DisplayAmount']);
                }
            }
        }
        if (searchItemsResponse['Errors'] !== undefined) {
            console.log('Errors:');
            console.log('Complete Error Response: ' + JSON.stringify(searchItemsResponse['Errors'], null, 1));
            console.log('Printing 1st Error:');
            var error_0 = searchItemsResponse['Errors'][0];
            console.log('Error Code: ' + error_0['Code']);
            console.log('Error Message: ' + error_0['Message']);
        }
    }
};

try {
    api.searchItems(searchItemsRequest, callback);
} catch (ex) {
    console.log('Exception: ' + ex);
}