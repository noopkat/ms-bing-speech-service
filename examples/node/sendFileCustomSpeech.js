require('dotenv').config();
const path = require('path');
const speechService = require('../../');

let sentTwice = false;
const file = path.join(__dirname, 'samples', 'future-of-flying.wav');

const options = {
  format: 'simple',
  language: 'en-us',
  subscriptionKey: process.env.cssubscriptionKey,
  serviceUrl: process.env.csserviceUrl,
  issueTokenUrl: 'https://westus.api.cognitive.microsoft.com/sts/v1.0/issueToken',
  debug: false
}

const recognizer = new speechService(options);

recognizer.start()
  .then(() => {
    console.log('service started');

    recognizer.on('recognition', (e) => {
      if (e.RecognitionStatus === 'Success') console.log(e);
    });

    // optional telemetry events to listen to
    recognizer.on('speech.startDetected', () => console.log('speech start detected'));
    recognizer.on('speech.endDetected', () => console.log('speech end detected'));
    recognizer.on('turn.start', () => console.log('speech turn started', recognizer.turn.active));

    // turn end means another audio sample can be sent if desired
    recognizer.on('turn.end', () => {
      console.log('speech turn ended');

      // send file again to demonstrate how to start another turn of audio streaming
      if (!sentTwice) {
        recognizer.sendFile(file);
        sentTwice = true;
      }
    });

    recognizer.sendFile(file);
  }).catch((error) => console.error('could not start service:', error));

