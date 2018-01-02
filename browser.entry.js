const websocket = self.WebSocket;
const fetch = self.fetch;
const eventEmitter = require('wolfy87-eventemitter');
const debug = console.log;

const uuid = require('./lib/guid');
const protocolHelper = require('./lib/protocolHelper');
const messageParser = require('./lib/messageParser');
const sendFile = require('./lib/sendFileBrowser');
const BingSpeechServiceInject = require('./BingSpeechService');

const dependencies = {websocket, uuid, fetch, eventEmitter, debug, protocolHelper, messageParser, sendFile};
module.exports = BingSpeechServiceInject(dependencies);

