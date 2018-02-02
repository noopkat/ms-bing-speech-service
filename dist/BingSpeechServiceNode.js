'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

module.exports = function (dependencies) {
  var websocket = dependencies.websocket,
      uuid = dependencies.uuid,
      fetch = dependencies.fetch,
      eventEmitter = dependencies.eventEmitter,
      protocolHelper = dependencies.protocolHelper,
      messageParser = dependencies.messageParser,
      sendFile = dependencies.sendFile;


  var debug = void 0;
  var globalDebugMode = process && process.env && process.env.DEBUG;

  var receivedTelemetryTemplate = {
    'turn.start': [],
    'speech.startDetected': [],
    'speech.hypothesis': [],
    'speech.endDetected': [],
    'speech.phrase': [],
    'speech.fragment': [],
    'turn.end': []
  };

  var richPaths = ['turn.start', 'turn.end', 'speech.phrase', 'speech.hypothesis', 'speech.fragment'];

  var defaultOptions = {
    format: 'simple',
    language: 'en-US',
    mode: 'conversation',
    issueTokenUrl: 'https://api.cognitive.microsoft.com/sts/v1.0/issueToken',
    accessToken: null
  };

  var BingSpeechService = function (_eventEmitter) {
    _inherits(BingSpeechService, _eventEmitter);

    function BingSpeechService(options) {
      _classCallCheck(this, BingSpeechService);

      var _this = _possibleConstructorReturn(this, (BingSpeechService.__proto__ || Object.getPrototypeOf(BingSpeechService)).call(this));

      _this.options = Object.assign({}, defaultOptions, options);
      debug = _this.options.debug || globalDebugMode ? dependencies.debug : function () {};

      var bingServiceUrl = `wss://speech.platform.bing.com/speech/recognition/${_this.options.mode}/cognitiveservices/v1?language=${_this.options.language}&format=${_this.options.format}`;

      _this.customSpeech = !!_this.options.serviceUrl;
      _this.serviceUrl = _this.options.serviceUrl || bingServiceUrl;
      _this.issueTokenUrl = _this.options.issueTokenUrl;

      _this.telemetry = {
        'Metrics': [],
        'ReceivedMessages': receivedTelemetryTemplate
      };

      // prepare first request id for the initial turn start
      _this.currentTurnGuid = uuid().replace(/-/g, '');
      Object.assign(websocket.prototype, eventEmitter.prototype);
      return _this;
    }

    _createClass(BingSpeechService, [{
      key: '_resetTelemetry',
      value: function _resetTelemetry(props) {
        var metrics = Array.isArray(props) && props.indexOf('Metrics') > -1 ? [] : this.telemetry.Metrics;
        var receivedMessages = Array.isArray(props) && props.indexOf('ReceivedMessages') > -1 ? receivedTelemetryTemplate : this.telemetry.ReceivedMessages;

        this.telemetry.Metrics = metrics;
        this.telemetry.ReceivedMessages = receivedMessages;
      }
    }, {
      key: '_sendToSocketServer',
      value: function _sendToSocketServer(item) {
        if (this.connection.readyState !== 1) throw new Error('could not send: connection to service not open');
        this.connection.send(item);
      }
    }, {
      key: 'sendChunk',
      value: function sendChunk(chunk) {
        var data = protocolHelper.createAudioPacket(this.currentTurnGuid, chunk);
        this._sendToSocketServer(data);
      }
    }, {
      key: 'sendStream',
      value: function sendStream(inputStream) {
        var _this2 = this;

        return new Promise(function (resolve, reject) {
          _this2.telemetry.Metrics.push({
            Start: new Date().toISOString(),
            Name: 'Microphone',
            End: ''
          });

          inputStream.on('data', _this2.sendChunk.bind(_this2));

          inputStream.on('end', function () {
            debug('audio stream end');
            resolve();
          });
        });
      }
    }, {
      key: '_getAccessToken',
      value: function _getAccessToken() {
        if (this.options.accessToken) {
          debug('access token supplied via options');
          return Promise.resolve(this.options.accessToken);
        }

        var postRequest = {
          method: 'POST',
          headers: {
            'Ocp-Apim-Subscription-Key': this.options.subscriptionKey
          }
        };

        debug('requesting access token');
        // request token
        return fetch(this.issueTokenUrl, postRequest).then(function (res) {
          return res.text();
        });
      }
    }, {
      key: 'onMessage',
      value: function onMessage(_ref) {
        var data = _ref.data;

        var message = messageParser.parse(data);
        var messagePath = message.path;
        var body = message.body && richPaths.indexOf(messagePath) > -1 ? JSON.parse(message.body) : {};

        debug(messagePath);

        if (messagePath === 'turn.start') {
          this.turn.active = true;
        }

        if (messagePath === 'speech.phrase') {
          this.emit('recognition', body);
        }

        if (messagePath === 'speech.endDetected') {
          var microphoneMetric = this.telemetry.Metrics.filter(function (m) {
            return m.Name === 'Microphone';
          }).pop();
          microphoneMetric.End = new Date().toISOString();
        };

        if (messagePath === 'turn.end') {
          this.turn.active = false;

          // send telemetry metrics to keep websocket open at each turn end
          var telemetryResponse = protocolHelper.createTelemetryPacket(this.currentTurnGuid, this.telemetry);
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
      }
    }, {
      key: 'start',
      value: function start() {
        var _this3 = this;

        this.connectionGuid = uuid().replace(/-/g, '');

        return this._getAccessToken().then(function (accessToken) {
          debug('access token request successful: ' + accessToken);

          _this3.telemetry.Metrics.push({
            Name: 'Connection',
            Id: _this3.connectionGuid,
            Start: new Date().toISOString(),
            End: ''
          });

          return _this3._connectToWebsocket(accessToken);
        });
      }
    }, {
      key: 'stop',
      value: function stop() {
        var _this4 = this;

        return new Promise(function (resolve, reject) {
          if ((!_this4.connection || !_this4.connection.readyState === 1) && callback) return resolve();
          _this4.once('close', resolve());
          _this4.once('error', reject());
          _this4.connection.close();
          debug('closing speech websocket connection');
        });
      }
    }, {
      key: '_connectToWebsocket',
      value: function _connectToWebsocket(accessToken) {
        debug('opening websocket at:', this.serviceUrl);

        var headerParams = {
          'Authorization': `Bearer ${accessToken}`,
          'X-ConnectionId': this.connectionGuid
        };

        var authorizedServiceUrl = '';

        if (this.customSpeech) {
          authorizedServiceUrl = this.serviceUrl;
        } else {
          var headerParamsQueries = Object.keys(headerParams).map(function (header) {
            return `&${header.replace('-', '')}=${headerParams[header]}`;
          });
          authorizedServiceUrl = `${this.serviceUrl}${encodeURI(headerParamsQueries.join(''))}`;
        }

        var client = new websocket(authorizedServiceUrl, null, null, headerParams);

        return this._setUpClientEvents(client);
      }
    }, {
      key: '_setUpClientEvents',
      value: function _setUpClientEvents(client) {
        var _this5 = this;

        return new Promise(function (resolve, reject) {
          client.onmessage = _this5.onMessage.bind(_this5);

          client.onerror = function (error) {
            _this5.emit('error', error);
            debug('socket error:', error);
          };

          client.onclose = function (error) {
            debug('socket close:', error);
            _this5.emit('close');
            if (error && error.code !== 1000) reject(error);
          };

          client.onopen = function (event) {
            debug('connected to websocket');

            _this5.connection = client;
            _this5.sendFile = sendFile.bind(_this5);
            _this5.turn = {
              active: false
            };

            // update connection metric to when the metric ended
            _this5.telemetry.Metrics[0].End = new Date().toISOString();

            debug('sending config packet');

            var initialisationPayload = protocolHelper.createSpeechConfigPacket(_this5.connectionGuid);
            _this5._sendToSocketServer(initialisationPayload);

            _this5.emit('connect');
            resolve();
          };
        });
      }
    }]);

    return BingSpeechService;
  }(eventEmitter);

  ;

  return BingSpeechService;
};
