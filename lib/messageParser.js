'use strict';

module.exports.parse = function(message) {
  const parsedMessage = {};
  const lines = message.split('\r\n');
  let startBody = false;

  lines.forEach((element) => {
    const s = new String(element);
    if (s.startsWith('{')) {
      startBody = true;
      parsedMessage['body'] = s;
    } else if (startBody) {
      parsedMessage['body'] += s;
    } else {
      const header = s.split(':');
      if (header.length === 2) {
       parsedMessage[header[0].trim().toLowerCase()] = header[1].trim();
      }
    }
  });
  return parsedMessage;
}

