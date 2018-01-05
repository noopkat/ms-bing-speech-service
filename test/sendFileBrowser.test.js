const test = require('tape');
const sendFile = require('../lib/sendFileBrowser');

test('[sendFileBrowser] bad file', function (t) {
  t.plan(1);
  sendFile(null).catch((error) => t.ok(error, 'rejects with error'));
});


