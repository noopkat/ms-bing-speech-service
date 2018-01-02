module.exports = function (dependencies) {
  const {
    websocket,
    uuid,
    fetch,
    eventEmitter,
    protocolHelper,
    messageParser,
    sendFile
  } = dependencies;

  let debug;
  const globalDebugMode = (process && process.env && process.env.DEBUG);

  const receivedTelemetryTemplate = {
    'turn.start': [],
    'speech.startDetected': [],
    'speech.hypothesis': [],
    'speech.endDetected': [],
    'speech.phrase': [],
    'speech.fragment': [],
    'turn.end': []
  };

  const richPaths = ['speech.phrase', 'speech.hypothesis', 'speech.fragment'];

  const defaultOptions = {
    format: 'simple',
    language:'en-US',
    mode: 'conversation',
    issueTokenUrl: 'https://api.cognitive.microsoft.com/sts/v1.0/issueToken',
    accessToken: null
  };

  class BingSpeechService extends eventEmitter {
    constructor(options) {
      super();
      this.options = Object.assign({}, defaultOptions, options);
      debug = (this.options.debug || globalDebugMode) ? dependencies.debug : function(){};

      const bingServiceUrl = `wss://speech.platform.bing.com/speech/recognition/${this.options.mode}/cognitiveservices/v1?language=${this.options.language}&format=${this.options.format}`;

      this.serviceUrl = this.options.serviceUrl || bingServiceUrl;
      this.issueTokenUrl = this.options.issueTokenUrl;

      this.telemetry = {
        'Metrics': [],
        'ReceivedMessages': receivedTelemetryTemplate
      };

      // prepare first request id for the initial turn start
      this.currentTurnGuid = uuid().replace(/-/g, '');
      Object.assign(websocket.prototype, eventEmitter.prototype);
    };

    _resetTelemetry(props) {
      const metrics = props.includes('Metrics') ? [] : this.telemetry.Metrics;
      const receivedMessages = props.includes('ReceivedMessages') ? receivedTelemetryTemplate : this.telemetry.ReceivedMessages;

      this.telemetry.Metrics = metrics;
      this.telemetry.ReceivedMessages = receivedMessages;
    }

    _sendToSocketServer(item) {
      if (this.connection.readyState !== 1) return console.error('could not send: connection to service not open');
      this.connection.send(item);
    }

    sendChunk(chunk) {
      const data = protocolHelper.createAudioPacket(this.currentTurnGuid, chunk);
      this._sendToSocketServer(data);
    }

    sendStream(inputStream, callback){
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

    _getAccessToken(callback) {
      if (this.options.accessToken) {
        return callback(null, this.options.accessToken);
      }
      this._requestAccessToken(callback);
    };

    _requestAccessToken(callback) {
      const postRequest = {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': this.options.subscriptionKey
        }
      };

      debug('requesting access token');
      // request token
      fetch(this.issueTokenUrl, postRequest)
        .then((res) => res.text())
        .then((res) => callback(null, res))
        .catch((error) => callback(error));
    };

    onMessage({data}) {
      const message = messageParser.parse(data);
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
        this.currentTurnGuid = uuid().replace(/-/g, '');
      }

      // push the message to telemetry
      this.telemetry.ReceivedMessages[messagePath].push(new Date().toISOString());

      // emit type of event
      this.connection.emit(messagePath, body);

      // also emit to the raw data firehose
      this.connection.emit('data', JSON.stringify(data.utf8Data));
    };

    start(callback) {
      this.connectionGuid = uuid().replace(/-/g, '');

      this._getAccessToken((error, accessToken) => {
        if (error) return callback(error);

        debug('access token request successful');

        this.telemetry.Metrics.push({
          Name: 'Connection',
          Id: this.connectionGuid,
          Start: new Date().toISOString(),
          End: ''
        });

        this._connectToWebsocket(accessToken, callback);
      });
    };

    stop(callback) {
      if ((!this.connection || !this.connection.connected) && callback) return callback(null);
      if (callback) this.connection.once('close', callback);
      this.connection.close();
      debug('closed speech websocket connection');
    };

    _connectToWebsocket(accessToken, callback) {
      debug('opening websocket at:', this.serviceUrl);

      const headerParams = {
        'Authorization': `Bearer ${accessToken}`,
        'X-ConnectionId': this.connectionGuid
      };
      const headerParamsQueries = Object.keys(headerParams).map((header) => `&${header.replace('-', '')}=${headerParams[header]}`);
      const authorizedServiceUrl = `${this.serviceUrl}${encodeURI(headerParamsQueries.join(''))}`;

      const client = new websocket(authorizedServiceUrl);

      this._setUpClientEvents(client, callback);
    };

    _setUpClientEvents(client, callback) {
      client.onmessage = this.onMessage.bind(this);

      client.onerror = (error) => {
        client.emit('error', error);
        debug('socket error:', error.reason);
      }

      client.onclose = (error) => {
        client.emit('close', error);
        debug('socket close reason:', error.reason);
      }

      client.onopen = (event) => {
        debug('connected to websocket');

        this.connection = client;
        this.connection.sendFile = sendFile.bind(this);
        this.connection.turn = {
          active: false
        };

        // update connection metric to when the metric ended
        this.telemetry.Metrics[0].End = new Date().toISOString();

        debug('sending config packet');

        const initialisationPayload = protocolHelper.createSpeechConfigPacket(this.connectionGuid);
        this._sendToSocketServer(initialisationPayload);

        this.emit('connect');
        return callback(null, this.connection);
      };
    };
  };

  return BingSpeechService;
};
