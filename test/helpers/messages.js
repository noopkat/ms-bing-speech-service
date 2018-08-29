module.exports = {
  'speech.phrase': `Path: speech.phrase\r
    Content-Type: application/json; charset=utf-8\r
    X-RequestId: 123e4567e89b12d3a456426655440000\r
\r
{\r
  "RecognitionStatus": "Success",\r
  "DisplayText": "Remind me to buy 5 pencils.",\r
  "Offset": 0,\r
  "Duration": 12300000\r
}`,

  'speech.startDetected': `Path: speech.startDetected\r
    Content-Type: application/json; charset=utf-8\r
    X-RequestId: 123e4567e89b12d3a456426655440000\r
\r
    {\r
      "Offset": 100000\r
    }`,

    'speech.endDetected': `Path: speech.endDetected\r
      Content-Type: application/json; charset=utf-8\r
      X-RequestId: 123e4567e89b12d3a456426655440000\r
\r
      {\r
        "Offset": 300000\r
      }`,

    'turn.start': `Path: turn.start\r
      Content-Type: application/json; charset=utf-8\r
      X-RequestId: 123e4567e89b12d3a456426655440000\r
\r
      {\r
        "context": {\r
          "serviceTag": "7B33613B91714B32817815DC89633AFA"\r
        }\r 
      }`,

    'turn.end': `Path: turn.end\r
      X-RequestId: 123e4567e89b12d3a456426655440000`
}

