# Microsoft Bing Speech to Text Service

(Unofficial) NodeJS service wrapper for [Microsoft Bing Speech API](https://azure.microsoft.com/en-us/services/cognitive-services/speech). It is an implementation of the Bing Speech Websocket API specifically, which supports long speech recognition up to 10 minutes in length.

`npm install ms-bing-speech-service`

## Installation

1. Install [NodeJS](http://nodejs.org) on your computer
2. Create a new directory for your code project if you haven't already
2. Open a terminal and run `npm install ms-bing-speech-service` from your project directory

## Usage

### Bing Speech

You'll first need to [create a Microsoft Bing Speech API key](https://azure.microsoft.com/en-us/services/cognitive-services). You can do this while logged in to the Azure Portal.

The following code will get you up and running with the essentials:

```js
const speechService = require('ms-bing-speech-service');

const options = {
  language: 'en-US',
  subscriptionKey: '<your Bing Speech API key>'
};

const recognizer = new speechService(options);

recognizer.start((error, service) => {
  if (!error) {
    console.log('service started');

    service.on('recognition', (e) => {
      if (e.RecognitionStatus === 'Success') console.log(e);
    });

    service.sendFile('future-of-flying.wav');
  }
});

```

This configuration will use your subscription key to create an access token with Microsoft's service.

In some instances you may not want to share your subscription key directly with your application. If you're creating an app with multiple users, you may want to issue access tokens from an external API so each user can connect to the speech service without exposing your subscription key.

To do this, replace "subscriptionKey" in the above code example with "accessToken" and pass in the provided token.

```js
const options = {
    language: 'en-US',
    accessToken: '<your access token here>'
};

```


### Custom Speech Service

Yes! You can totally use this with [Custom Speech Service](https://cris.ai). You'll need a few more details in your options object, though.

Your subscriptionKey will be the key displayed on your custom endpoint deployment page in the [Custom Speech Management Portal](https://cris.ai). There, you can also find your websocket endpoint of choice to use.

The following code will get you up and running with the Custom Speech Service:

```js
const speechService = require('ms-bing-speech-service');

const options = {
  subscriptionKey: '<your Custom Speech Service subscription key>',
  serviceUrl: 'wss://<your endpoint id>.api.cris.ai/speech/recognition/conversation/cognitiveservices/v1',
  issueTokenUrl: 'https://westus.api.cognitive.microsoft.com/sts/v1.0/issueToken'
};

const recognizer = new speechService(options);

recognizer.start((error, service) => {
  if (!error) {
    console.log('custom speech service started');

    service.on('recognition', (e) => {
      if (e.RecognitionStatus === 'Success') console.log(e);
    });

    service.sendFile('future-of-flying.wav');
  }
});

```


See the [API section](#api-reference) of these docs for details on configuration and methods.

## API Reference

### Methods

### SpeechService(options)

+ `options` _Object_
+ **Returns** `SpeechService`

Creates a new instance of `SpeechService`.

```js
const recognizer = new SpeechService(options);
```

Available options are below:

| name                      | type      | description                                                                                              | default | required |
|---------------------------|-----------|----------------------------------------------------------------------------------------------------------|---------|----------|
| `subscriptionKey`         | `String`  | your Bing Speech API key                                                                                  | n/a     | yes      |
| `accessToken`         | `String`  | your [Bing Speech access token](https://docs.microsoft.com/en-us/azure/cognitive-services/speech/how-to/how-to-authentication?tabs=Powershell#using-authorization-token). Only required if subscriptionKey option not supplied.                                                                                  | n/a     | no      |
| `language`                | `String`  | the language you want to translate from. See supported languages in the [official Microsoft Bing Speech API docs](https://docs.microsoft.com/en-us/azure/cognitive-services/speech/api-reference-rest/bingvoicerecognition#recognition-language).                                                                  | `'en-US'`  | no       |
| `mode` | `String` | which recognition mode you'd like to use. Choose from `interative`, `conversation`, or `dictation`                          | `'conversation'` | no       |
| `format` | `String` | file format you'd like the text to speech to be returned as. Choose from `simple` or `detailed`                          | `'simple'` | no       |


### recognizer.start(callback)

+ `callback` _Function_

Connects to the Speech API websocket on your behalf and returns the websocket instance once connected. Callback follows the errorback pattern.

```js
recognizer.start((error, service) => {
  if (!error) console.log('recognizer service started.');
});
```

### recognizer.stop(callback)

+ `callback` _Function_

Disconnects from the established websocket connection to the Speech API. Callback follows the errorback pattern.

```js
recognizer.stop((error) => {
  if (!error) console.log('recognizer service stopped.');
});
```

### recognizer.sendStream(stream)

+ `stream` _Readable Stream_

Sends an audio payload stream to the Speech API websocket connection. Audio payload is a native NodeJS Buffer stream (eg. a readable stream).

See the 'Sending Audio' section of the [official Speech API docs](https://docs.microsoft.com/en-us/azure/cognitive-services/speech/api-reference-rest/websocketprotocol#supported-audio-encodings) for details on the data format needed.

```js
recognizer.sendStream(myAudioBufferStream);
```

### service.sendFile(filepath, callback)

+ `filepath` _String_
+ `callback` _Function_ (optional)

Streams an audio file from disk to the Speech API websocket connection. Optional callback follows errorback pattern.

See the 'Sending Audio' section of the [official Speech API docs](https://docs.microsoft.com/en-us/azure/cognitive-services/speech/api-reference-rest/websocketprotocol#supported-audio-encodings) for details on the data format needed for the audio file.

```js
service.sendFile('/path/to/audiofile.wav', (error) => {
  if (!error) console.log('file sent.');
});
```

### Events

You can listen to the following events on the service instance:

### service.on('recognition', callback)

+ `callback` _Function_

Event listener for incoming recognition message payloads from the Speech API. Message payload is a JSON object.


```js
service.on('recognition', (message) => {
  console.log('new recognition:', message);
});

```

### service.on('close', callback)

+ `callback` _Function_

Event listener for Speech API websocket connection closures.


```js
service.on('close', () => {
  console.log('Speech API connection closed');
});


```

### service.on('error', callback)

+ `callback` _Function_

Event listener for incoming Speech API websocket connection errors.


```js
service.on('error', (error) => {
  console.log(error);
});


```


### service.on('turn.start', callback)

+ `callback` _Function_

Event listener for Speech API websocket 'turn.start' event. Fires when service detects an audio stream.


```js
service.on('turn.start', () => {
  console.log('start turn has fired.');
});


```

### service.on('turn.end', callback)

+ `callback` _Function_

Event listener for Speech API websocket 'turn.end' event. Fires after 'speech.endDetected' event and the turn has ended.


```js
service.on('turn.end', () => {
  console.log('end turn has fired.');
});


```

### service.on('speech.startDetected', callback)

+ `callback` _Function_

Event listener for Speech API websocket 'speech.startDetected' event. Fires when the service has first detected speech in the audio stream.


```js
service.on('speech.startDetected', () => {
  console.log('speech startDetected has fired.');
});


```

### service.on('speech.endDetected', callback)

+ `callback` _Function_

Event listener for Speech API websocket 'speech.endDetected' event. Fires when the service has stopped being able to detect speech in the audio stream.


```js
service.on('speech.endDetected', () => {
  console.log('speech endDetected has fired.');
});


```

### service.on('speech.phrase', callback)

+ `callback` _Function_

Identical to the `recognition` event. Event listener for incoming recognition message payloads from the Speech API. Message payload is a JSON object.


```js
service.on('speech.phrase', (message) => {
  console.log('new phrase:', message);
});

```

### service.on('speech.hypothesis', callback)

+ `callback` _Function_

Event listener for Speech API websocket 'speech.hypothesis' event. **Only fires when using `interactive` mode.** Contains incomplete recognition results. This event will fire often - beware!


```js
service.on('speech.hypothesis', (message) => {
  console.log('new hypothesis:', message);
});


```

### service.on('speech.fragment', callback)

+ `callback` _Function_

Event listener for Speech API websocket 'speech.fragment' event. **Only fires when using `dictation` mode.** Contains incomplete recognition results. This event will fire often - beware!


```js
service.on('speech.fragment', (message) => {
  console.log('new fragment:', message);
});


```

## License

MIT.

## Credits

Big thanks to @michael-chi. Their [bing speech example](https://github.com/michael-chi/BingStt-Websocket) was a great foundation to build upon, particularly the response parser and header helper.
