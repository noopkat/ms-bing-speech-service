const test = require('tape');
const mockMessages = require('./helpers/messages');
const mockMessagesJSON = require('./helpers/messagesJSON');
const parser = require('../lib/messageParser');

test('[messageParser] parses rich messages', function (t) {
  t.plan(3);
  
  t.deepEqual(parser.parse(mockMessages['speech.startDetected']), mockMessagesJSON['speech.startDetected'], 'speech.startDetected');

  t.deepEqual(parser.parse(mockMessages['speech.endDetected']), mockMessagesJSON['speech.endDetected'], 'speech.endDetected');

  t.deepEqual(parser.parse(mockMessages['speech.phrase']), mockMessagesJSON['speech.phrase'], 'speech.phrase');

});

