module.exports = {
  'speech.phrase': {
    'path': `speech.phrase`,
    'content-type': `application/json; charset=utf-8`,
    'x-requestid': `123e4567e89b12d3a456426655440000`,
    body:'{  "RecognitionStatus": "Success",  "DisplayText": "Remind me to buy 5 pencils.",  "Offset": 0,  "Duration": 12300000}'
  },

  'speech.startDetected': {
    'path': 'speech.startDetected',
    'content-type': 'application/json; charset=utf-8',
    'x-requestid': '123e4567e89b12d3a456426655440000',
    '"offset"': "100000"
  },

  'speech.endDetected': {
    'path': 'speech.endDetected',
    'content-type': 'application/json; charset=utf-8',
    'x-requestid': '123e4567e89b12d3a456426655440000',
    '"offset"': "300000" 
  },

  'turn.start': {
    'path': 'turn.start',
    'content-type': 'application/json; charset=utf-8',
    'x-requestid': '123e4567e89b12d3a456426655440000',
    '"context"': {
      '"serviceTag"': "7B33613B91714B32817815DC89633AFA"
    }
  },

  'turn.end': {
    'path': 'turn.end',
    'x-requestid': '123e4567e89b12d3a456426655440000'
  }
};

