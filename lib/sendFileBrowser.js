function sendFile(buffer) {
  this.telemetry.Metrics.push({
    Start: new Date().toISOString(),
    Name:'Microphone',
    End : '',
  });

  sendFileChunk.call(this, 0, buffer);
};

function sendFileChunk(start=0, buffer) {
  const length = buffer.byteLength;
  const end = start + 32000;
  const chunk = buffer.slice(start, end);

  this.sendChunk(chunk);
  if (end < length) {
    start = end;
    setTimeout(() => sendFileChunk.call(this, start, buffer), 200);
  }
}

module.exports = sendFile;

