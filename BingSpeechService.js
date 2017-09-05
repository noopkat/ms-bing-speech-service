const ws = require('websocket').client;
const uuid = require('uuid');
const events = require('events');
const util = require('util');
const fs = require('fs');
const path = require('path');
const request = require('request');
const debug = require('debug')('speechService');
const streamBuffers = require('stream-buffers');

const protocolHelper = require('./lib/protocolHelper.js');
const messageParser = require('./lib/messageParser.js');

const receivedTelemetryTemplate = {
    "turn.start": [],
    "speech.startDetected": [],
    "speech.hypothesis": [],
    "speech.endDetected": [],
    "speech.phrase": [],
    "turn.end": []
  };

const defaultOptions = {
  format: 'simple',
  language:'en-US',
  mode: 'conversation'
};

function BingSpeechService (options) {
  this.options = Object.assign({}, defaultOptions, options);
  this.issueTokenUrl = 'https://api.cognitive.microsoft.com/sts/v1.0/issueToken';

  this.serviceUrl = `wss://speech.platform.bing.com/speech/recognition/${this.options.mode}/cognitiveservices/v1?language=${this.options.language}&format=${this.options.format}`;

  this.telemetry = {
    "Metrics": [],
    "ReceivedMessages": receivedTelemetryTemplate 
  };

  events.EventEmitter.call(this);
 };

util.inherits(BingSpeechService, events.EventEmitter);

BingSpeechService.prototype._resetTelemetry = function(props) {
  
  const metrics = props.includes('Metrics') ? [] : this.telemetry.Metrics;
  const receivedMessages = props.includes('ReceivedMessages') ? receivedTelemetryTemplate : this.telemetry.ReceivedMessages;

  this.telemetry.Metrics = metrics;
  this.telemetry.ReceivedMessages = receivedMessages;
}

BingSpeechService.prototype._sendToSocketServer = function(item) {
  if (!this.connection.connected) return console.error('could not send: connection to service not open'); 

  if (typeof item === 'string') {
    this.connection.sendUTF(item);
  } else {
    this.connection.send(item);
  }
}

BingSpeechService.prototype.sendChunk = function(chunk) {
  const data = protocolHelper.createAudioPacket(this.currentTurnGuid, chunk);
  this._sendToSocketServer(data); 
}

BingSpeechService.prototype.sendStream = function(inputStream){
  this.currentTurnGuid = uuid.v4().replace(/-/g, '');

  this.telemetry.Metrics.push({
      Start: new Date().toISOString(),
      Name:'Microphone',
      End : '',
  });

  inputStream.on('data', this.sendChunk.bind(this));

  inputStream.on('end',function(){
      debug('audio stream end');
  });
}

const _sendFile = function(filepath, callback) {
  let absoluteFilepath;

  fs.access(filepath, (error) => {
    if (error) {
      return callback ? callback(new Error(`could not find file ${filepath}`)) : null;
    }

    absoluteFilepath = path.resolve(filepath);

    const options = {
      frequency: 100, 
      chunkSize: 32000 
    };

    const audioStream = new streamBuffers.ReadableStreamBuffer(options);

    fs.readFile(absoluteFilepath, (error, file) => {
      audioStream.put(file);

      // add some silences at the end to tell the service that it is the end of the sentence
      audioStream.put(new Buffer(160000));
      audioStream.stop();
      
      this.sendStream(audioStream, callback);
    });
  });
};

BingSpeechService.prototype._requestAccessToken = function(callback) {
  const postRequest = {
    url: this.issueTokenUrl,
    headers: {
     'Ocp-Apim-Subscription-Key': this.options.subscriptionKey 
    }
  };
   
  // request token
  request.post(postRequest, (error, response, body) => {
    return callback(error, body);
  }); 
};

BingSpeechService.prototype.onMessage = function(data) {
  const message = messageParser.parse(data.utf8Data);

  const messagePath = message.path;

  debug(messagePath);

  // emit type of event
  this.connection.emit(messagePath);
  // also emit to the raw data firehose
  this.connection.emit('data', JSON.stringify(data.utf8Data));

  // push the message to telemetry
  this.telemetry.ReceivedMessages[messagePath].push(new Date().toISOString());
  
  if (messagePath === 'speech.phrase') {
    const body = JSON.parse(message.body);
    this.connection.emit('recognition', body);
  }

  if (messagePath === 'speech.endDetected') {
    const microphoneMetric = this.telemetry.Metrics.filter((m) => m.Name === 'Microphone').pop();
    microphoneMetric.End = new Date().toISOString();
  };

  if (messagePath === 'turn.end') {
      // send telemetry metrics to keep websocket open at each turn end
      const telemetryResponse = protocolHelper.createTelemetryPacket(this.currentTurnGuid, this.telemetry);
      this._sendToSocketServer(telemetryResponse);

      this._resetTelemetry(['ReceivedMessages']);
  }
};

BingSpeechService.prototype.start = function(callback) {
  const _this = this;
  this.connectionGuid = uuid.v4().replace(/-/g, '');

  this._requestAccessToken((error, accessToken) => {
    this.telemetry.Metrics.push({
       Name: "Connection",
       Id: this.connectionGuid,
       Start: new Date().toISOString(),
       End: ""
    });

    this._connectToWebsocket(accessToken, callback);
  });
};

BingSpeechService.prototype._connectToWebsocket = function(accessToken, callback) {
  const client = new ws();
  this._setUpClientEvents(client, callback);
  
  debug('opening websocket at:', this.serviceUrl);

  const wsOptions = {
    'Authorization': `Bearer ${accessToken}`,
    'X-ConnectionId': this.connectionGuid
  };
  client.connect(this.serviceUrl, null, null, wsOptions);
};

BingSpeechService.prototype._setUpClientEvents = function(client, callback) {
  client.on('connectFailed', (error) => debug(error));            

  client.on('connect', (connection) => {
    debug('connected to websocket');

    this.connection = connection;
    this.connection.sendFile = _sendFile.bind(this);

    // update connection metric to when the metric ended
    this.telemetry.Metrics[0].End = new Date().toISOString();

    connection.on('message', this.onMessage.bind(this));

    connection.on('error', (error) => debug('socket error:', error));
    connection.on('close', (error, reason) => debug('socket close reason:',error, reason));

    debug('sending config packet');

    const initialisationPayload = protocolHelper.createSpeechConfigPacket(this.connectionGuid);
    this._sendToSocketServer(initialisationPayload);

    this.emit('connect');
    return callback(null, this.connection);
  });
};

module.exports = BingSpeechService;
