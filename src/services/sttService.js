/**
 * Speech-to-Text Service
 * Listens for user speech and provides transcribed text
 */

let recognition = null;
let isListening = false;

/**
 * Initialize speech recognition
 */
export const initializeSTT = () => {
  // Check if Speech Recognition API is available
  const SpeechRecognition = 
    window.SpeechRecognition || 
    window.webkitSpeechRecognition || 
    null;

  if (!SpeechRecognition) {
    console.warn('⚠️ Speech Recognition API not available');
    return null;
  }

  if (!recognition) {
    recognition = new SpeechRecognition();
    recognition.continuous = true; // Keep listening
    recognition.interimResults = true; // Show interim results
    recognition.lang = 'en-US';
  }

  return recognition;
};

/**
 * Start listening for speech
 */
export const startListening = (onResult, onError, onEnd) => {
  if (!recognition) {
    recognition = initializeSTT();
    if (!recognition) {
      if (onError) onError('Speech Recognition not supported');
      return;
    }
  }

  if (isListening) {
    console.log('⚠️ Already listening');
    return;
  }

  recognition.onresult = (event) => {
    let finalTranscript = '';
    let interimTranscript = '';

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        finalTranscript += transcript + ' ';
      } else {
        interimTranscript += transcript;
      }
    }

    if (onResult) {
      onResult({
        final: finalTranscript.trim(),
        interim: interimTranscript.trim(),
      });
    }
  };

  recognition.onerror = (event) => {
    console.error('❌ STT error:', event.error);
    isListening = false;
    if (onError) {
      onError(event.error);
    }
  };

  recognition.onend = () => {
    isListening = false;
    console.log('⏸️ STT ended');
    if (onEnd) {
      onEnd();
    }
  };

  try {
    recognition.start();
    isListening = true;
    console.log('🎤 STT started - listening...');
  } catch (error) {
    console.error('❌ Failed to start STT:', error);
    isListening = false;
    if (onError) {
      onError(error);
    }
  }
};

/**
 * Stop listening for speech
 */
export const stopListening = () => {
  if (recognition && isListening) {
    try {
      recognition.stop();
      isListening = false;
      console.log('🛑 STT stopped');
    } catch (error) {
      console.error('❌ Error stopping STT:', error);
    }
  }
};

/**
 * Check if currently listening
 */
export const isCurrentlyListening = () => {
  return isListening;
};
