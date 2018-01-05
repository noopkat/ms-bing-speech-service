const streamBuffers = require('stream-buffers');
const path = require('path');
const fs = require('fs');

const sendAudio = function(file, callback) {
  const fn = (typeof file === 'string') ? sendFile : sendBuffer; 
  return fn.call(this, file, callback);
};

const sendFile = function(filepath) {
  return new Promise((resolve, reject) => {
    const absoluteFilepath = path.resolve(filepath);
    fs.readFile(absoluteFilepath, (error, file) => {
      if (error) return reject(new Error(`could not find file ${filepath}`));
      const audioStream = createAudioStream(file);
      this.sendStream(audioStream).then(resolve).catch(reject);
    });
  });
};

const sendBuffer = function(buffer) {
  if (!Buffer.isBuffer(buffer)) 
    return Promise.reject(new Error('file needs to be valid file path or Buffer'));

  const audioStream = createAudioStream(buffer);
  return this.sendStream(audioStream);
};

const createAudioStream = function(file) {
  const options = {
    frequency: 200,
    chunkSize: 32000
  };

  const audioStream = new streamBuffers.ReadableStreamBuffer(options);
  audioStream.put(file);

  // add some silences at the end to tell the service that it is the end of the sentence
  audioStream.put(new Buffer(160000));
  audioStream.stop();
  return audioStream;
};

module.exports = sendAudio;
