function sendFile(buffer) {
  return new Promise((resolve, reject) => {
    if (!buffer || !buffer.byteLength) reject(new Error('could not send File: not a valid ArrayBuffer')); 
    this.telemetry.Metrics.push({
      Start: new Date().toISOString(),
      Name:'Microphone',
      End : '',
    });

    sendFileChunk.call(this, 0, buffer, resolve);
  });
};

function sendFileChunk(start, buffer, callback) {
  const length = buffer.byteLength;
  const end = start + 32000;
  const chunk = buffer.slice(start, end);

  this.sendChunk(chunk);
  if (end < length) {
    start = end;
    setTimeout(() => sendFileChunk.call(this, start, buffer, callback), 200);
  } else {
    return callback();
  }
}

module.exports = sendFile;

