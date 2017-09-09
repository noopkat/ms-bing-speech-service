require('dotenv').config();
const path = require('path');
const speechService = require('../BingSpeechService.js');

let sentTwice = false;
const file = path.join(__dirname, 'samples', 'future-of-flying.wav');

const options = {
  format: 'simple',
  language: 'en-US',
  subscriptionKey: process.env.subscriptionKey 
}

const socket = new speechService(options);

socket.start((error, service) => {
  console.log('service started');

  service.on('recognition', (e) => {
    if (e.RecognitionStatus === 'Success') console.log(e);
  });

  // optional telemetry events to listen to
  service.on('speech.startDetected', () => console.log('speech start detected'));
  service.on('speech.endDetected', () => console.log('speech end detected'));
  service.on('turn.start', () => console.log('speech turn started', service.turn.active));

  // turn end means another audio sample can be sent if desired
  service.on('turn.end', () => {
    console.log('speech turn ended');

    // send file again to demonstrate how to start another turn of audio streaming
    if (!sentTwice) {
      service.sendFile(file);
      sentTwice = true;
    }
  });

  service.sendFile(file);
});

