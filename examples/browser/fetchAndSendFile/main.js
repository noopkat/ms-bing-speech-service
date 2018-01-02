const button = document.querySelector('button');
const log = document.querySelector('#log');
const messages = document.querySelector('#messages');
const spinner = document.querySelector('#spinner');

const options = {
  format: 'simple',
  language: 'en-US',
  subscriptionKey: '',
  debug: true 
}

const recognizer = new window.MsBingSpeechService(options);

function recognize(file) {
  button.setAttribute('disabled', true);
  spinner.style.display = 'inline';
  messages.innerHTML = '';
  log.innerHTML = '';

  recognizer.start((error, service) => {
    if (error) return console.error(error);
    console.log('service started');
    log.innerHTML += 'service started<br/>';

    service.on('turn.start', () => log.innerHTML += 'turn.start<br/>');
    service.on('speech.startDetected', () => log.innerHTML += 'speech.startDetected<br/>');
    service.on('speech.endDetected', () => log.innerHTML += 'speech.endDetected<br/>');
    service.on('speech.phrase', () => log.innerHTML += 'speech.phrase<br/>');

    service.on('recognition', (e) => {
      if (e.RecognitionStatus === 'Success') {
        console.log(e);
        messages.innerHTML += `<p>${e.DisplayText}</p>`; 
      }
    });

    service.on('close', () => {
      button.removeAttribute('disabled');
      spinner.style.display = 'none';
      log.innerHTML += 'service stopped<br/>[end]';
    });

    service.on('turn.end', () => {
      recognizer.stop();
      messages.innerHTML += '[end]';
      log.innerHTML += 'turn.end<br/>';
    });

    const reader = new FileReader();
    
    reader.addEventListener('loadend', (e) => {
      console.log('sound file loaded:', e.currentTarget.result);
      log.innerHTML += 'audio file loaded</br>';
      service.sendFile(e.currentTarget.result);
    });

    reader.readAsArrayBuffer(file);
  });
}

button.addEventListener('click', () => {
  fetch('future-of-flying.wav')
    .then((res) => res.blob())
    .then((blob) => recognize(blob));
});

