module.exports = {
  'speech.phrase': `Path: speech.phrase\r
    Content-Type: application/json; charset=utf-8\r
    X-RequestId: 123e4567e89b12d3a456426655440000\r
\r
{ "RecognitionStatus": "Success", "DisplayText": "Remind me to buy 5 pencils.", "Offset": 0, "Duration": 12300000 }`,

  'speech.startDetected': `Path: speech.startDetected\r
    Content-Type: application/json; charset=utf-8\r
    X-RequestId: 123e4567e89b12d3a456426655440000\r
\r
    { "Offset": 100000 }`,

    'speech.endDetected': `Path: speech.endDetected\r
      Content-Type: application/json; charset=utf-8\r
      X-RequestId: 123e4567e89b12d3a456426655440000\r
\r
      { "Offset": 0 }`,

    'turn.start': `Path: turn.start\r
      Content-Type: application/json; charset=utf-8\r
      X-RequestId: 123e4567e89b12d3a456426655440000\r
\r
      {"context": { "serviceTag": "7B33613B91714B32817815DC89633AFA" } }`,

    'turn.end': `Path: turn.end\r
      X-RequestId: 123e4567e89b12d3a456426655440000`
}

