/**
 * Text-to-Speech Service
 * Converts text to speech and provides callbacks for syncing with waveform
 */

let currentUtterance = null;
let isSpeaking = false;

/**
 * Speak text with callbacks for waveform sync
 */
export const speakText = (text, onStart, onEnd, onError) => {
  if (!text || text.trim().length === 0) {
    return;
  }

  // Cancel any ongoing speech
  if (currentUtterance) {
    window.speechSynthesis.cancel();
  }

  // Check if speech synthesis is available
  if (!window.speechSynthesis) {
    console.warn('⚠️ Speech synthesis not available');
    if (onError) onError('Speech synthesis not supported');
    return;
  }

  const utterance = new SpeechSynthesisUtterance(text.trim());
  
  // Configure voice - try to use a natural voice
  const voices = window.speechSynthesis.getVoices();
  const preferredVoices = voices.filter(voice => 
    voice.name.includes('English') || 
    voice.lang.includes('en')
  );
  
  if (preferredVoices.length > 0) {
    // Try to use a natural-sounding voice
    const naturalVoice = preferredVoices.find(voice => 
      voice.name.includes('Natural') || 
      voice.name.includes('Neural') ||
      voice.name.includes('Premium')
    ) || preferredVoices[0];
    
    utterance.voice = naturalVoice;
  }
  
  utterance.lang = 'en-US';
  utterance.rate = 1.0; // Normal speed
  utterance.pitch = 1.0; // Normal pitch
  utterance.volume = 1.0; // Full volume

  // Event handlers
  utterance.onstart = () => {
    isSpeaking = true;
    console.log('🔊 TTS started:', text.substring(0, 50));
    if (onStart) onStart();
  };

  utterance.onend = () => {
    isSpeaking = false;
    currentUtterance = null;
    console.log('✅ TTS ended');
    if (onEnd) onEnd();
  };

  utterance.onerror = (event) => {
    isSpeaking = false;
    currentUtterance = null;
    console.error('❌ TTS error:', event.error);
    if (onError) onError(event.error);
  };

  currentUtterance = utterance;
  window.speechSynthesis.speak(utterance);
};

/**
 * Stop current speech
 */
export const stopSpeaking = () => {
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
  isSpeaking = false;
  currentUtterance = null;
};

/**
 * Check if currently speaking
 */
export const isCurrentlySpeaking = () => {
  return isSpeaking;
};

/**
 * Wait for voices to be loaded
 */
export const waitForVoices = () => {
  return new Promise((resolve) => {
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      resolve(voices);
    } else {
      window.speechSynthesis.onvoiceschanged = () => {
        resolve(window.speechSynthesis.getVoices());
      };
    }
  });
};
