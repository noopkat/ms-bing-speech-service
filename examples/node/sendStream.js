// this example reproduced  with generous permission of @ricardoatsouza on Github
// source: https://github.com/ricardoatsouza/ms-bing-speech-streaming-example
"use strict";
const process = require('process');
const stream = require('stream');
const fileSystem = require('fs');
const bingSpeechService = require("ms-bing-speech-service");

const FILENAME = "<FILENAME>";
const BING_SUBSCRIPTION_KEY = "<BING_SUBSCRIPTION_KEY>"
const BING_RECOGNITION_MODE = "conversation";
const BING_LANGUAGE = "en-US";
const BING_RESULT_FORMAT = "detailed";

// Bing options
const options = {
    subscriptionKey: BING_SUBSCRIPTION_KEY,
    language: BING_LANGUAGE,
    mode: BING_RECOGNITION_MODE,
    format: BING_RESULT_FORMAT
};

// Create recognizer
const recognizer = new bingSpeechService(options);

// Event handler
const handleRecognition = (event) => {
    const status = event.RecognitionStatus;
    console.log(`${status}:  ${JSON.stringify(event)}`);
};

// Initialize the recognizer
recognizer.start().then(() => {
    console.log("Ms speech api connected");
    recognizer.on('recognition', (event) => {handleRecognition(event)});
    recognizer.on('close', () => {console.log("Recognizer is closed.")});
    recognizer.on('error', (error) => {console.error(error)});

	// The file stream will be sent to the MS recognizer
	recognizer.sendStream(fileSystem.createReadStream(FILENAME));
    
}).catch((error) => {
	console.error("Error while trying to start the recognizer.");
	console.error(error);
	process.exit(1);
});
