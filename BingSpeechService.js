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
    "speech.fragment": [],
    "turn.end": []
};

const richPaths = ['speech.phrase', 'speech.hypothesis', 'speech.fragment'];

const defaultOptions = {
    format: 'simple',
    language:'en-US',
    mode: 'conversation',
    issueTokenUrl: 'https://api.cognitive.microsoft.com/sts/v1.0/issueToken',
    accessToken: null
};

function BingSpeechService (options) {
    this.options = Object.assign({}, defaultOptions, options);

    const bingServiceUrl = `wss://speech.platform.bing.com/speech/recognition/${this.options.mode}/cognitiveservices/v1?language=${this.options.language}&format=${this.options.format}`;

    this.serviceUrl = this.options.serviceUrl || bingServiceUrl;
    this.issueTokenUrl = this.options.issueTokenUrl;

    this.telemetry = {
        "Metrics": [],
        "ReceivedMessages": receivedTelemetryTemplate
    };

    // prepare first request id for the initial turn start
    this.currentTurnGuid = uuid.v4().replace(/-/g, '');

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

BingSpeechService.prototype.sendStream = function(inputStream, callback){

    this.telemetry.Metrics.push({
        Start: new Date().toISOString(),
        Name:'Microphone',
        End : '',
    });

    inputStream.on('data', this.sendChunk.bind(this));

    inputStream.on('end',function() {
        debug('audio stream end');
        if (callback) return callback();
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

BingSpeechService.prototype._getAccessToken = function(callback) {
    if(this.options.accessToken) {
        return callback(null, this.options.accessToken);
    }
    this._requestAccessToken(callback);
};

BingSpeechService.prototype._requestAccessToken = function(callback) {
    const postRequest = {
        url: this.issueTokenUrl,
        headers: {
            'Ocp-Apim-Subscription-Key': this.options.subscriptionKey
        }
    };

    debug('requesting access token');
    // request token
    request.post(postRequest, (error, response, body) => {
        if (!error) debug('access token request successful');
        return callback(error, body);
    });
};

BingSpeechService.prototype.onMessage = function(data) {
    const message = messageParser.parse(data.utf8Data);
    const messagePath = message.path;
    const body = richPaths.includes(messagePath) ? JSON.parse(message.body) : {};

    debug(messagePath);

    if (messagePath === 'turn.start') {
        this.connection.turn.active = true;
    }

    if (messagePath === 'speech.phrase') {
        this.connection.emit('recognition', body);
    }

    if (messagePath === 'speech.endDetected') {
        const microphoneMetric = this.telemetry.Metrics.filter((m) => m.Name === 'Microphone').pop();
        microphoneMetric.End = new Date().toISOString();
    };

    if (messagePath === 'turn.end') {
        this.connection.turn.active = false;

        // send telemetry metrics to keep websocket open at each turn end
        const telemetryResponse = protocolHelper.createTelemetryPacket(this.currentTurnGuid, this.telemetry);
        this._sendToSocketServer(telemetryResponse);

        // clear the messages telemetry for the next turn
        this._resetTelemetry(['ReceivedMessages']);

        // rotate currentTurnGuid ready for the next turn
        this.currentTurnGuid = uuid.v4().replace(/-/g, '');
    }

    // push the message to telemetry
    this.telemetry.ReceivedMessages[messagePath].push(new Date().toISOString());

    // emit type of event
    this.connection.emit(messagePath, body);

    // also emit to the raw data firehose
    this.connection.emit('data', JSON.stringify(data.utf8Data));
};

BingSpeechService.prototype.start = function(callback) {
    this.connectionGuid = uuid.v4().replace(/-/g, '');

    this._getAccessToken((error, accessToken) => {
        this.telemetry.Metrics.push({
            Name: "Connection",
            Id: this.connectionGuid,
            Start: new Date().toISOString(),
            End: ""
        });

        this._connectToWebsocket(accessToken, callback);
    });
};

BingSpeechService.prototype.stop = function(callback) {
    if ((!this.connection || !this.connection.connected) && callback) return callback(null);
    if (callback) this.connection.once('close', callback);
    this.connection.close();
    debug('closed speech websocket connection');
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
    client.once('connectFailed', (error) => debug(error));

    client.once('connect', (connection) => {
        debug('connected to websocket');

        this.connection = connection;
        this.connection.sendFile = _sendFile.bind(this);
        this.connection.turn = {
            active: false
        };

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
