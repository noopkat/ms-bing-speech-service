const websocket = require('websocket').w3cwebsocket;
const uuid = require('uuid').v4;
const fetch = require('node-fetch');
const eventEmitter = require('wolfy87-eventemitter');
const debug = require('debug')('speechService');

const protocolHelper = require('./lib/protocolHelper');
const messageParser = require('./lib/messageParser');
const sendFile = require('./lib/sendFile');
const BingSpeechServiceInject = require('./dist/BingSpeechServiceNode');

const dependencies = {websocket, uuid, fetch, eventEmitter, debug, protocolHelper, messageParser, sendFile};
module.exports = BingSpeechServiceInject(dependencies);
