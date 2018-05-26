const test = require('tape');
const proxyquire = require('proxyquire');
const mockSocket = require('./helpers/mockSocketServer');
const mockMessages = require('./helpers/messages');
const mockFetch = require('./helpers/mockFetch');
const speechService = proxyquire('../', {websocket: mockSocket, 'node-fetch': mockFetch});

test('[ms-bing-speech-recognizer] defaults are set correctly', function (t) {
  t.plan(5);

  const recognizer = new speechService();

  t.equal(recognizer.options.format, 'simple', 'format');
  t.equal(recognizer.options.language, 'en-US', 'language');
  t.equal(recognizer.options.mode, 'conversation', 'mode');
  t.equal(recognizer.options.issueTokenUrl, 'https://api.cognitive.microsoft.com/sts/v1.0/issueToken', 'issueTokenUrl');
  t.equal(recognizer.options.accessToken, null, 'accessToken');
});

test('[ms-bing-speech-recognizer] option overrides are set correctly', function (t) {
  t.plan(5);

  const recognizer = new speechService({
    format: 'detailed',
    mode: 'interactive',
    language: 'fr-FR',
    accessToken: 'abc'
  });

  t.equal(recognizer.options.format, 'detailed', 'format');
  t.equal(recognizer.options.language, 'fr-FR', 'language');
  t.equal(recognizer.options.mode, 'interactive', 'mode');
  t.equal(recognizer.options.issueTokenUrl, 'https://api.cognitive.microsoft.com/sts/v1.0/issueToken', 'issueTokenUrl');
  t.equal(recognizer.options.accessToken, 'abc', 'accessToken');
});

test('[ms-bing-speech-service] service url is correctly formed', function (t) {
  t.plan(2);

  const recognizer = new speechService();
  t.equal(recognizer.serviceUrl, 'wss://speech.platform.bing.com/speech/recognition/conversation/cognitiveservices/v1?language=en-US&format=simple', 'defaults');

  const recognizer2 = new speechService({
    format: 'detailed',
    mode: 'interactive',
    language: 'fr-FR'
  });
  t.equal(recognizer2.serviceUrl, 'wss://speech.platform.bing.com/speech/recognition/interactive/cognitiveservices/v1?language=fr-FR&format=detailed', 'overrides');
});

test('[ms-bing-speech-service] method _start', function (t) {
  t.plan(1);

  const recognizer = new speechService({accessToken: 'abc'});
  recognizer.start().then(() => {
    t.equals(typeof recognizer.sendFile, 'function', 'service object has sendFile function');
  }).catch(console.error);
});

test('[ms-bing-speech-service] method _resetTelemetry', function (t) {
  t.plan(1);

  const recognizer = new speechService({accessToken: 'abc'});
  recognizer.telemetry = { 
    Metrics: [ 
      { 
        Name: 'Connection',
        Id: 'cff195bf518344119ccc6813ebfb9767',
        Start: '2018-01-04T21:55:44.654Z',
        End: '2018-01-04T21:55:44.857Z' } 
    ],
    ReceivedMessages: {
     'turn.start': ['2018-01-04T21:55:44.654Z'],
     'speech.startDetected': ['2018-01-04T21:55:44.654Z'],
     'speech.hypothesis': ['2018-01-04T21:55:44.654Z'],
     'speech.endDetected': ['2018-01-04T21:55:44.654Z'],
     'speech.phrase': ['2018-01-04T21:55:44.654Z'],
     'speech.fragment': ['2018-01-04T21:55:44.654Z'],
     'turn.end': ['2018-01-04T21:55:44.654Z'] 
   } 
 };

  const resetTelemetryData = {
    Metrics: [],
    ReceivedMessages: {
    'turn.start': [],
    'speech.startDetected': [],
    'speech.hypothesis': [],
    'speech.endDetected': [],
    'speech.phrase': [],
    'speech.fragment': [],
    'turn.end': []
   }
 };

  recognizer.start().then(() => {
    recognizer._resetTelemetry(['Metrics', 'ReceivedMessages']);
    t.deepEqual(recognizer.telemetry, resetTelemetryData, 'all data resets');
  }).catch(console.error);
});

test('[ms-bing-speech-service] method _sendToSocketServer', function (t) {
  t.plan(1);

  const recognizer = new speechService({accessToken: 'abc'});
  recognizer.start().then(() => {
    recognizer.connection.readyState = 3;
    t.throws(recognizer._sendToSocketServer, new Error('could not send: connection to service not open'), 'service throws if socket is not connected');
  }).catch(console.error);
});

test('[ms-bing-speech-service] method _getAccessToken', function (t) {
  t.plan(2);

  const recognizer = new speechService({accessToken: 'abc'});
  recognizer._getAccessToken()
    .then((token) => t.equal(token, 'abc', 'supplying a token will prevent API call'));

  const recognizer2 = new speechService({subscriptionKey: '123'});
  recognizer2._getAccessToken()
    .then((token) => {
      t.equal(token, '456', 'runs fetch in absence of supplied access token');
    }).catch(console.error);
});

test('[ms-bing-speech-service] method onMessage', function (t) {
  t.plan(14);

   const recognizer = new speechService({accessToken: 'abc'});
  recognizer.start().then(() => {
    recognizer.telemetry.Metrics.push({
      Start: new Date().toISOString(),
      Name:'Microphone',
      End : '',
    });

    recognizer.on('turn.start', (e) => {
      t.pass('turn.start: event fired');
    })
    recognizer.onMessage({data: mockMessages['turn.start']});
    t.equal(recognizer.telemetry.ReceivedMessages['turn.start'].length, 1, 'turn.start: telemetry added ');

    recognizer.on('speech.startDetected', () => t.pass('speech.startDetected: event fired'));
    recognizer.onMessage({data: mockMessages['speech.startDetected']});
    t.equal(recognizer.telemetry.ReceivedMessages['speech.startDetected'].length, 1, 'speech.startDetected: telemetry added ');

    recognizer.on('speech.endDetected', () => t.pass('speech.endDetected: event fired'));
    recognizer.onMessage({data: mockMessages['speech.endDetected']});
    t.equal(recognizer.telemetry.ReceivedMessages['speech.endDetected'].length, 1, 'speech.endDetected: telemetry added ');
    const mic = recognizer.telemetry.Metrics.filter((m) => m.Name === 'Microphone');
    t.ok(mic[0] && mic[0].End, 'speech.endDetected: Microphone metric added ');

    recognizer.on('recognition', (data) => {
      t.pass('recognition: event fired');
      t.equal(data.DisplayText, 'Remind me to buy 5 pencils.', 'recognition: DisplayText is correct');
    });

    recognizer.on('speech.phrase', () => t.pass('speech.phrase: event fired'));
    recognizer.onMessage({data: mockMessages['speech.phrase']});
    t.equal(recognizer.telemetry.ReceivedMessages['speech.phrase'].length, 1, 'speech.phrase: telemetry added ');

    recognizer.on('turn.end', () => t.pass('turn.end: event fired'))
    recognizer.onMessage({data: mockMessages['turn.end']});
    t.equal(recognizer.telemetry.ReceivedMessages['turn.end'].length, 1, 'turn.end: telemetry added ');
    t.notOk(recognizer.turn.active, 'turn.end service turn.active prop is false');
    
  }).catch(console.error);
});


test('[ms-bing-speech-service] method stop', function (t) {
  t.plan(2);

  const recognizer = new speechService({accessToken: 'abc'});
  recognizer.start().then(() => {
    recognizer.stop().then(() => t.pass('successfully closed connection after starting'));
  });

  const recognizer2 = new speechService({accessToken: 'abc'});
  recognizer2.start().then(() => {
    recognizer.connection.close();
    recognizer2.stop().then(() => t.pass('successfully closed connection after already closed'));
  });
});

test('[ms-bing-speech-service] service event handlers', function (t) {
  t.plan(4);

  const recognizer = new speechService({accessToken: 'abc'});
  recognizer.start().then(() => {
    t.ok(recognizer.connection.onmessage, 'recognizer has onmessage handler');
    t.ok(recognizer.connection.onopen, 'recognizer has onopen handler');
    t.ok(recognizer.connection.onclose, 'recognizer has onclose handler');
    t.ok(recognizer.connection.onerror, 'recognizer has onerror handler');
  });
});

//TODO:
// sendChunk - spy on send to socket to make sure it's called with correct data payload - this will be difficult because of payload timestamping
// currentTurnGuid -  make sure a new one is generate on turn.end
// sendFile
// sendFileBrowser
// messageParser
// procotolHelper

