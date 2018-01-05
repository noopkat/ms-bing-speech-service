const log = document.querySelector('#log');
const messages = document.querySelector('#messages');
const spinner = document.querySelector('#spinner');
const form = document.querySelector('form');
const subInput = form.querySelector('input[type="text"]');
const submitButton = form.querySelector('input[type="submit"]');

const options = {
  format: 'simple',
  language: 'en-US',
  subscriptionKey: '',
  debug: true 
}

function recognize(file) {
  submitButton.setAttribute('disabled', true);
  spinner.style.display = 'inline';
  messages.innerHTML = '';
  log.innerHTML = '';

  const recognizer = new window.MsBingSpeechService(options);

  recognizer.start()
    .then(() => {
      console.log('service started');
      log.innerHTML += 'service started<br/>';

      recognizer.on('turn.start', () => log.innerHTML += 'turn.start<br/>');
      recognizer.on('speech.startDetected', () => log.innerHTML += 'speech.startDetected<br/>');
      recognizer.on('speech.endDetected', () => log.innerHTML += 'speech.endDetected<br/>');
      recognizer.on('speech.phrase', () => log.innerHTML += 'speech.phrase<br/>');

      recognizer.on('recognition', (e) => {
        if (e.RecognitionStatus === 'Success') {
          console.log(e);
          messages.innerHTML += `<p>${e.DisplayText}</p>`; 
        }
      });

      recognizer.on('close', () => {
        submitButton.removeAttribute('disabled');
        spinner.style.display = 'none';
        log.innerHTML += 'recognizer stopped<br/>[end]';
      });

      recognizer.on('turn.end', () => {
        recognizer.stop();
        messages.innerHTML += '[end]';
        log.innerHTML += 'turn.end<br/>';
      });

      const reader = new FileReader();
      
      reader.addEventListener('loadend', (e) => {
        console.log('sound file loaded:', e.currentTarget.result);
        log.innerHTML += 'audio file loaded</br>';
        recognizer.sendFile(e.currentTarget.result);
      });

      reader.readAsArrayBuffer(file);
    }).catch((error) => console.error('could not start service:', error));
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  options.subscriptionKey = subInput.value;
  fetch('future-of-flying.wav')
    .then((res) => res.blob())
    .then((blob) => recognize(blob));
});

