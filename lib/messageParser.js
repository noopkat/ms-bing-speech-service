module.exports.parse = function(message) {
  const parsedMessage = {};
  const lines = message.split('\r\n');

  lines.forEach((element) => {
    const s = new String(element);
    if (s.startsWith('{')) {
      parsedMessage['body'] = s;
    } else {
      const header = s.split(':');
      if (header.length === 2) {
       parsedMessage[header[0].trim().toLowerCase()] = header[1].trim();
      }
    }
  });
  return parsedMessage;
}

