const streamBuffers = require('stream-buffers');
const path = require('path');
const fs = require('fs');

const sendAudio = function(file, callback) {
  const fn = (typeof file === 'string') ? sendFile : sendBuffer; 
  fn.call(this, file, callback);
};

const sendFile = function(filepath, callback) {
  let absoluteFilepath;

  fs.access(filepath, (error) => {
    if (error) return callback ? callback(new Error(`could not find file ${filepath}`)) : null;

    absoluteFilepath = path.resolve(filepath);
    fs.readFile(absoluteFilepath, (error, file) => {
      const audioStream = createAudioStream(file);
      this.sendStream(audioStream, callback);
    });
  });
};

const sendBuffer = function(buffer, callback) {
  const audioStream = createAudioStream(buffer);
  this.sendStream(audioStream, callback);
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
