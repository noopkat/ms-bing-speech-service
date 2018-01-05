const test = require('tape');
const sendFile = require('../lib/sendFile');

test('[sendFile] bad file', function (t) {
  t.plan(2);
  sendFile('/path/to/fakefile.wav').catch((error) => t.ok(error, 'file does not exist: rejects with error'));
  sendFile(null).catch((error) => t.ok(error, 'file is null: rejects with error'));
});


