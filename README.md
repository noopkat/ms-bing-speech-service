[![Build Status](https://api.travis-ci.org/noopkat/ms-bing-speech-service.svg?branch=master)](https://travis-ci.org/noopkat/ms-bing-speech-service)
[![Coverage Status](https://coveralls.io/repos/github/noopkat/ms-bing-speech-service/badge.svg?branch=master)](https://coveralls.io/github/noopkat/ms-bing-speech-service?branch=browser-compat)

# Microsoft Speech to Text Service

(Unofficial) JavaScript service wrapper for [Microsoft Speech API](https://azure.microsoft.com/en-us/services/cognitive-services/speech). It is an implementation of the Speech Websocket API specifically, which supports long speech recognition up to 10 minutes in length. Are you looking for Microsoft Speech HTTP API (short speech) support instead? [This SDK can help you out](https://github.com/palmerabollo/bingspeech-api-client) :)

`npm install ms-bing-speech-service`

## Installation

1. Install [NodeJS](http://nodejs.org) on your computer
2. Create a new directory for your code project if you haven't already
2. Open a terminal and run `npm install ms-bing-speech-service` from your project directory

## Usage

**✨ This library works in both browsers and NodeJS runtime environments ✨** Please see the [examples directory](https://github.com/noopkat/ms-bing-speech-service/blob/master/examples) in this repo for more in depth examples than those below.

### Microsoft Speech API

You'll first need to [create a Microsoft Speech API key](https://azure.microsoft.com/en-us/services/cognitive-services). You can do this while logged in to the Azure Portal.

The following code will get you up and running with the essentials in Node:

```js
const speechService = require('ms-bing-speech-service');

const options = {
  language: 'en-US',
  subscriptionKey: '<your Bing Speech API key>'
};

const recognizer = new speechService(options);

recognizer
  .start()
  .then(_ => {
    recognizer.on('recognition', (e) => {
      if (e.RecognitionStatus === 'Success') console.log(e);
    });

    recognizer.sendFile('future-of-flying.wav')
      .then(_ => console.log('file sent.'))
      .catch(console.error);
  }
}).catch(console.error);

```

You can also use this library with the async/await pattern!


```js
const speechService = require('ms-bing-speech-service');

(async function() {

  const options = {
    language: 'en-US',
    subscriptionKey: '<your Bing Speech API key>'
  };
	
  const recognizer = new speechService(options);
  await recognizer.start();

  recognizer.on('recognition', (e) => {
    if (e.RecognitionStatus === 'Success') console.log(e);
  });
  
  recognizer.on('turn.end', async (e) => {
    console.log('recognizer is finished.');
    
    await recognizer.stop();
    console.log('recognizer is stopped.');
  });
	
  await recognizer.sendFile('future-of-flying.wav');
  console.log('file sent.');

})();

```

And in the browser (a global window distribution is also available in dist directory). Use an ArrayBuffer instance in place of a file path:

```js
import speechService from 'MsBingSpeechService';

const file = myArrayBuffer;

const options = {
  language: 'en-US',
  subscriptionKey: '<your Bing Speech API key>'
}

const recognizer = new speechService(options);

recognizer.start()
  .then(_ => {
    console.log('service started');

    recognizer.on('recognition', (e) => {
      if (e.RecognitionStatus === 'Success') console.log(e);
    });
    
    recognizer.sendFile(file);
  }).catch((error) => console.error('could not start service:', error));
```

The above examples will use your subscription key to create an access token with Microsoft's service.

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

recognizer
  .start()
  .then(_ => {
    recognizer.on('recognition', (e) => {
      if (e.RecognitionStatus === 'Success') console.log(e);
    });

    recognizer.sendFile('future-of-flying.wav');
  }
}).catch(console.error);

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
| `subscriptionKey`         | `String`  | your [Speech API key](https://docs.microsoft.com/en-us/azure/cognitive-services/speech/how-to/how-to-authentication?tabs=Powershell#using-subscription-key)                                                                                  | n/a     | yes      |
| `accessToken`         | `String`  | your [Speech access token](https://docs.microsoft.com/en-us/azure/cognitive-services/speech/how-to/how-to-authentication?tabs=Powershell#using-authorization-token). Only required if subscriptionKey option not supplied.                                                                                  | n/a     | no      |
| `language`                | `String`  | the language you want to translate from. See supported languages in the [official Microsoft Speech API docs](https://docs.microsoft.com/en-us/azure/cognitive-services/speech/api-reference-rest/bingvoicerecognition#recognition-language).                                                                  | `'en-US'`  | no       |
| `mode` | `String` | which recognition mode you'd like to use. Choose from `interative`, `conversation`, or `dictation`                          | `'conversation'` | no       |
| `format` | `String` | file format you'd like the text to speech to be returned as. Choose from `simple` or `detailed`                          | `'simple'` | no       |


### recognizer.start()

Connects to the Speech API websocket on your behalf. Returns a promise.

```js
recognizer.start().then(() => {
 console.log('recognizer service started.');
}).catch(console.error);
```

### recognizer.stop()

Disconnects from the established websocket connection to the Speech API. Returns a promise.

```js
recognizer.stop().then(() => {
  console.log('recognizer service stopped.');
}).catch(console.error);
```

### recognizer.sendStream(stream)

+ `stream` _Readable Stream_

Sends an audio payload stream to the Speech API websocket connection. Audio payload is a native NodeJS Buffer stream (eg. a readable stream) or an ArrayBuffer in the browser. Returns a promise.

See the 'Sending Audio' section of the [official Speech API docs](https://docs.microsoft.com/en-us/azure/cognitive-services/speech/api-reference-rest/websocketprotocol#supported-audio-encodings) for details on the data format needed.

```js
recognizer.sendStream(myAudioBufferStream).then(() => {
  console.log('stream sent.');
}).catch(console.error);
```

### recognizer.sendFile(filepath)

+ `filepath` _String_

Streams an audio file from disk to the Speech API websocket connection. Also accepts a NodeJS Buffer or browser ArrayBuffer. Returns a promise.

See the 'Sending Audio' section of the [official Speech API docs](https://docs.microsoft.com/en-us/azure/cognitive-services/speech/api-reference-rest/websocketprotocol#supported-audio-encodings) for details on the data format needed for the audio file.

```js
recognizer.sendFile('/path/to/audiofile.wav').then(() => {
  console.log('file sent.');
}).catch(console.error);
```
or

```js
recognizer.sendFile(myArrayBuffer).then(() => {
  console.log('file sent.');
}).catch(console.error);
```

### Events

You can listen to the following events on the recognizer instance:

### recognizer.on('recognition', callback)

+ `callback` _Function_

Event listener for incoming recognition message payloads from the Speech API. Message payload is a JSON object.


```js
recognizer.on('recognition', (message) => {
  console.log('new recognition:', message);
});

```

### recognizer.on('close', callback)

+ `callback` _Function_

Event listener for Speech API websocket connection closures.


```js
recognizer.on('close', () => {
  console.log('Speech API connection closed');
});


```

### recognizer.on('error', callback)

+ `callback` _Function_

Event listener for incoming Speech API websocket connection errors.


```js
recognizer.on('error', (error) => {
  console.log(error);
});


```


### recognizer.on('turn.start', callback)

+ `callback` _Function_

Event listener for Speech API websocket 'turn.start' event. Fires when service detects an audio stream.


```js
recognizer.on('turn.start', () => {
  console.log('start turn has fired.');
});


```

### recognizer.on('turn.end', callback)

+ `callback` _Function_

Event listener for Speech API websocket 'turn.end' event. Fires after 'speech.endDetected' event and the turn has ended. This event is an ideal one to listen to in order to be notified when an entire stream of audio has been processed and all results have been received.


```js
recognizer.on('turn.end', () => {
  console.log('end turn has fired.');
});


```

### recognizer.on('speech.startDetected', callback)

+ `callback` _Function_

Event listener for Speech API websocket 'speech.startDetected' event. Fires when the service has first detected speech in the audio stream.


```js
recognizer.on('speech.startDetected', () => {
  console.log('speech startDetected has fired.');
});


```

### recognizer.on('speech.endDetected', callback)

+ `callback` _Function_

Event listener for Speech API websocket 'speech.endDetected' event. Fires when the service has stopped being able to detect speech in the audio stream.


```js
recognizer.on('speech.endDetected', () => {
  console.log('speech endDetected has fired.');
});


```

### recognizer.on('speech.phrase', callback)

+ `callback` _Function_

Identical to the `recognition` event. Event listener for incoming recognition message payloads from the Speech API. Message payload is a JSON object.


```js
recognizer.on('speech.phrase', (message) => {
  console.log('new phrase:', message);
});

```

### recognizer.on('speech.hypothesis', callback)

+ `callback` _Function_

Event listener for Speech API websocket 'speech.hypothesis' event. **Only fires when using `interactive` mode.** Contains incomplete recognition results. This event will fire often - beware!


```js
recognizer.on('speech.hypothesis', (message) => {
  console.log('new hypothesis:', message);
});


```

### recognizer.on('speech.fragment', callback)

+ `callback` _Function_

Event listener for Speech API websocket 'speech.fragment' event. **Only fires when using `dictation` mode.** Contains incomplete recognition results. This event will fire often - beware!


```js
recognizer.on('speech.fragment', (message) => {
  console.log('new fragment:', message);
});


```

## License

MIT.

## Credits

Big thanks to @michael-chi. Their [bing speech example](https://github.com/michael-chi/BingStt-Websocket) was a great foundation to build upon, particularly the response parser and header helper.
