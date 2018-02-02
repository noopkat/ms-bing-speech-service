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

  const richPaths = ['turn.start', 'turn.end', 'speech.phrase', 'speech.hypothesis', 'speech.fragment'];

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
      
      this.customSpeech = !!this.options.serviceUrl;
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
      const metrics = (Array.isArray(props) && props.indexOf('Metrics') > -1) ? [] : this.telemetry.Metrics;
      const receivedMessages = (Array.isArray(props) && props.indexOf('ReceivedMessages') > -1) ? receivedTelemetryTemplate : this.telemetry.ReceivedMessages;

      this.telemetry.Metrics = metrics;
      this.telemetry.ReceivedMessages = receivedMessages;
    }

    _sendToSocketServer(item) {
      if (this.connection.readyState !== 1) throw new Error('could not send: connection to service not open');
      this.connection.send(item);
    }

    sendChunk(chunk) {
      const data = protocolHelper.createAudioPacket(this.currentTurnGuid, chunk);
      this._sendToSocketServer(data);
    }

    sendStream(inputStream) {
      return new Promise((resolve, reject) => {
        this.telemetry.Metrics.push({
          Start: new Date().toISOString(),
          Name:'Microphone',
          End : '',
        });

        inputStream.on('data', this.sendChunk.bind(this));

        inputStream.on('end', () => {
          debug('audio stream end');
          resolve();
        });
      });
    }

    _getAccessToken() {
      if (this.options.accessToken) {
        debug('access token supplied via options');
        return Promise.resolve(this.options.accessToken);
      }

      const postRequest = {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': this.options.subscriptionKey
        }
      };

      debug('requesting access token');
      // request token
      return fetch(this.issueTokenUrl, postRequest)
        .then((res) => res.text());
    };

    onMessage({data}) {
      const message = messageParser.parse(data);
      const messagePath = message.path;
      const body = (message.body && richPaths.indexOf(messagePath) > -1) ? JSON.parse(message.body) : {};

      debug(messagePath);

      if (messagePath === 'turn.start') {
        this.turn.active = true;
      }

      if (messagePath === 'speech.phrase') {
        this.emit('recognition', body);
      }

      if (messagePath === 'speech.endDetected') {
        const microphoneMetric = this.telemetry.Metrics.filter((m) => m.Name === 'Microphone').pop();
        microphoneMetric.End = new Date().toISOString();
      };

      if (messagePath === 'turn.end') {
        this.turn.active = false;

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
      this.emit(messagePath, body);

      // also emit to the raw data firehose
      this.emit('data', JSON.stringify(data.utf8Data));
    };

    start() {
      this.connectionGuid = uuid().replace(/-/g, '');

      return this._getAccessToken()
        .then((accessToken) => {
          debug('access token request successful: ' + accessToken);

          this.telemetry.Metrics.push({
            Name: 'Connection',
            Id: this.connectionGuid,
            Start: new Date().toISOString(),
            End: ''
          });

         return this._connectToWebsocket(accessToken);
      })
    };

    stop() {
      return new Promise((resolve, reject) => {
        if ((!this.connection || !this.connection.readyState === 1) && callback) return resolve();
        this.once('close', resolve());
        this.once('error', reject());
        this.connection.close();
        debug('closing speech websocket connection');
      });
    };

    _connectToWebsocket(accessToken) {
      debug('opening websocket at:', this.serviceUrl);

      const headerParams = {
        'Authorization': `Bearer ${accessToken}`,
        'X-ConnectionId': this.connectionGuid
      };

      let authorizedServiceUrl = '';

      if (this.customSpeech) {
        authorizedServiceUrl = this.serviceUrl;
      } else {
        const headerParamsQueries = Object.keys(headerParams).map((header) => `&${header.replace('-', '')}=${headerParams[header]}`);
        authorizedServiceUrl = `${this.serviceUrl}${encodeURI(headerParamsQueries.join(''))}`;
      }

      const client = new websocket(authorizedServiceUrl, null, null, headerParams);

      return this._setUpClientEvents(client);
    };

    _setUpClientEvents(client) {
      return new Promise((resolve, reject) => {
        client.onmessage = this.onMessage.bind(this);

        client.onerror = (error) => {
          this.emit('error', error);
          debug('socket error:', error);
        }

        client.onclose = (error) => {
          debug('socket close:', error);
          this.emit('close');
          if (error && error.code !== 1000) reject(error);
        }

        client.onopen = (event) => {
          debug('connected to websocket');

          this.connection = client;
          this.sendFile = sendFile.bind(this);
          this.turn = {
            active: false
          };

          // update connection metric to when the metric ended
          this.telemetry.Metrics[0].End = new Date().toISOString();

          debug('sending config packet');

          const initialisationPayload = protocolHelper.createSpeechConfigPacket(this.connectionGuid);
          this._sendToSocketServer(initialisationPayload);

          this.emit('connect');
          resolve();
       };
     });
    };

  };

  return BingSpeechService;
};
