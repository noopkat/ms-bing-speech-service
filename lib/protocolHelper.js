const os = require('os');

function format (headers){
  const hStrings = headers.map((header) => `${header.key}:${header.value}\r\n`);
  return hStrings.join('') + '\r\n';
}

// TODO: I need help with linux distros please
const osMap = {
  platform: {
    "win32": "Windows",
    "darwin": "macOS",
    "linux": "Linux"
  },
  name: {
    "win32": {
      10: "Windows 10",
      8: "Windows 8",
      7: "Windows 7"
    },
    "darwin": {
      6: "Snow Leopard",
      7: "Lion",
      8: "Mountain Lion",
      9: "Mavericks",
      10: "Yosemite",
      11: "El Capitan",
      12: "Sierra",
      13: "High Sierra"
    }
  }
};

const speechConfig = {
  context: {
    system: {
      version: "1.0.000",
    },
    os: {
      platform : "",
      name : "",
      version :""
    },
    device: {
      manufacturer: "Unknown",
      model : "Unknown",
      version: "Unknown"
    }
  }
};

const protocolHelper = {};

// TODO: find out if connectionid should be used with config packet
protocolHelper.createSpeechConfigPacket = function(connectionId) {
  // massage nodejs os info into desired format
  const osPlatform = os.platform();
  const osVersion = os.release();
  const osVersionShort = (osPlatform === 'win32') ? osVersion.split('.')[0] : osVersion.split('.')[1];

  const osPlatformHuman = osMap.platform[osPlatform] || 'Unknown';
  const osName = (osMap.name[osPlatform] && osMap.name[osPlatform][osVersionShort]) ? osMap.name[osPlatform][osVersionShort] : 'Unknown';

  // finally populate the os details in speech config before sending
  speechConfig.context.os = {
    platform: osPlatformHuman,
    name: osName,
    version: osVersion
  };

  const headers = [];
  /*
    [{'path':'speech.config'},
    {'x-timestamp:Date.UTC(new Date().toISOString())},
    {'content-type': 'application/json; charset=utf-8'},
    {'x-requestid': connectionId}];
  */

  headers.push({key: 'path', value: 'speech.config'});
  headers.push({key: 'x-timestamp', value: (new Date()).toISOString()});
  headers.push({key: 'content-type', value: 'application/json; charset=utf-8'});
  var http = format(headers);

  return `${http}${JSON.stringify(speechConfig)}`;
}

protocolHelper.createTelemetryPacket = function(connectionId, telemetry) {
  /*
    path: telemetry
    x-requestid: 32AFB505BF22487CAE5B9E5B10DCBDA7
    x-timestamp: 2017-06-29T11:28:14.489Z
    content-type: application/json
*/

  const headers = [];
  headers.push({key: 'path', value: 'telemetry'});
  headers.push({key: 'x-timestamp', value: (new Date().toISOString())});
  headers.push({key: 'content-type', value: 'application/json'});
  headers.push({key: 'x-requestid', value: connectionId});                
  var http = format(headers);   

  return `${http}${JSON.stringify(telemetry)}`;

  /* {"Metrics":[{"End":"2017-06-29T11:28:10.380Z","Name":"ListeningTrigger","Start":"2017-06-29T11:28:10.380Z"},{"End":"2017-06-29T11:28:14.463Z","Name":"Microphone","Start":"2017-06-29T11:28:11.865Z"},{"End":"2017-06-29T11:28:12.177Z","Id":"E1E6407757974D39BE7DB877140D209D","Name":"Connection","Start":"2017-06-29T11:28:11.931Z"}],"ReceivedMessages":{"turn.start":["2017-06-29T11:28:12.455Z"],"speech.startDetected":["2017-06-29T11:28:12.825Z"],"speech.hypothesis":["2017-06-29T11:28:12.826Z","2017-06-29T11:28:12.851Z","2017-06-29T11:28:13.199Z","2017-06-29T11:28:13.209Z","2017-06-29T11:28:13.291Z","2017-06-29T11:28:13.529Z"],"speech.endDetected":["2017-06-29T11:28:14.458Z"],"speech.phrase":["2017-06-29T11:28:14.475Z"],"turn.end":["2017-06-29T11:28:14.478Z"]}}
    */
}
protocolHelper.createAudioPacket = function(connectionId, chunk) {
  /*
      [{'path':'audio'},
      {'x-timestamp':Date.UTC(new Date().toISOString())},
      {'content-type': 'audio/x-wav'},
      {'x-requestid': connectionId}];
  */
  const headers = [];
  headers.push({key: 'path', value: 'audio'});
  headers.push({key: 'x-timestamp', value: (new Date().toISOString())});
  headers.push({key: 'content-type', value: 'audio/x-wav'});
  headers.push({key: 'x-requestid', value: connectionId});                
  const header = format(headers);

  const headerBuffer = new Buffer(header);
  const headerSizeBuffer = new Buffer([header.length / 256,header.length % 256]);
  const chunkBuffer = new Buffer(chunk);

  return Buffer.concat([headerSizeBuffer, headerBuffer, chunkBuffer]);
}
module.exports = protocolHelper;
