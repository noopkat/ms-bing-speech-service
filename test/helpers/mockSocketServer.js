const ee = require('wolfy87-eventemitter');
const util = require('util');

const MockSocketServer = {};

MockSocketServer.w3cwebsocket = function() {
    ee.call(this);
    setTimeout(() => this.onopen(), 200);
}

util.inherits(MockSocketServer.w3cwebsocket, ee);

MockSocketServer.w3cwebsocket.prototype.readyState = 1;
MockSocketServer.w3cwebsocket.prototype.send = function(){};
MockSocketServer.w3cwebsocket.prototype.close = function() {
 this.onclose(); 
};

module.exports = MockSocketServer;
