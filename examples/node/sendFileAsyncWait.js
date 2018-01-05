require('dotenv').config();
const speechService = require('../../');
const path = require('path');
const file = path.join(__dirname, 'samples', 'future-of-flying.wav');

(async function() {

  const options = {
    language: 'en-US',
    subscriptionKey: process.env.subscriptionKey 
  };
    
  const recognizer = new speechService(options);
  await recognizer.start();

  recognizer.on('recognition', (e) => {
    if (e.RecognitionStatus === 'Success') console.log(e);
  });
  
  recognizer.on('turn.end', async (e) => {
    console.log('recognizer has finished.');

    await recognizer.stop();
    console.log('recognizer is stopped.');
  });
    
  await recognizer.sendFile(file);
  console.log('file sent.');

})();
