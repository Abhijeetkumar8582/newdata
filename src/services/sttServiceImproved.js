/**
 * Improved Speech-to-Text Service
 * Real-time transcription with automatic submission when user stops speaking
 * Supports both browser Speech Recognition API and OpenAI Whisper
 */

let recognition = null;
let isListening = false;
let silenceTimeout = null;
let lastTranscript = '';
let accumulatedText = '';

const SILENCE_TIMEOUT_MS = 2000; // 2 seconds of silence = user stopped speaking

/**
 * Initialize browser Speech Recognition
 */
export const initializeBrowserSTT = () => {
  const SpeechRecognition = 
    window.SpeechRecognition || 
    window.webkitSpeechRecognition || 
    null;

  if (!SpeechRecognition) {
    console.warn('⚠️ Browser Speech Recognition API not available');
    return null;
  }

  if (!recognition) {
    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;
  }

  return recognition;
};

/**
 * Transcribe audio using OpenAI Whisper API
 */
export const transcribeWithOpenAI = async (audioBlob, apiKey) => {
  try {
    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.webm');
    formData.append('model', 'whisper-1');
    formData.append('language', 'en');

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Transcription failed');
    }

    const data = await response.json();
    return data.text || '';
  } catch (error) {
    console.error('❌ OpenAI transcription error:', error);
    throw error;
  }
};

/**
 * Start listening with browser Speech Recognition
 */
export const startBrowserListening = (onInterimResult, onFinalResult, onError, onEnd) => {
  if (!recognition) {
    recognition = initializeBrowserSTT();
    if (!recognition) {
      if (onError) onError('Speech Recognition not supported');
      return false;
    }
  }

  if (isListening) {
    console.log('⚠️ Already listening');
    return false;
  }

  // Reset state
  lastTranscript = '';
  accumulatedText = '';

  recognition.onresult = (event) => {
    let interimTranscript = '';
    let finalTranscript = '';

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        finalTranscript += transcript + ' ';
        accumulatedText += transcript + ' ';
      } else {
        interimTranscript += transcript;
      }
    }

    // Send interim results in real-time
    if (interimTranscript.trim()) {
      const fullText = accumulatedText.trim() + ' ' + interimTranscript.trim();
      if (onInterimResult) {
        onInterimResult(fullText.trim());
      }
      lastTranscript = fullText.trim();
      resetSilenceTimeout(onFinalResult);
    }

    // Send final results - accumulate but don't trigger callback immediately
    // Wait for silence timeout to preserve the text
    if (finalTranscript.trim()) {
      accumulatedText = (accumulatedText.trim() + ' ' + finalTranscript.trim()).trim();
      // Update lastTranscript to include final results
      if (!interimTranscript.trim()) {
        lastTranscript = accumulatedText;
      }
      // Don't call onFinalResult here - wait for silence timeout
      resetSilenceTimeout(onFinalResult);
    }
  };

  recognition.onerror = (event) => {
    console.error('❌ STT error:', event.error);
    isListening = false;
    clearSilenceTimeout();
    
    if (onError) {
      onError(event.error);
    }
  };

  recognition.onend = () => {
    isListening = false;
    clearSilenceTimeout();
    console.log('⏸️ STT ended');
    
    // If we have accumulated text, keep it (don't auto-submit)
    // The text should remain in the input field
    if (accumulatedText.trim() && lastTranscript.trim()) {
      // Use the last transcript (which includes interim results)
      const finalTextToKeep = lastTranscript.trim();
      console.log('📝 Keeping text when recognition ends:', finalTextToKeep.substring(0, 50));
      
      if (onFinalResult) {
        // Call with the text but don't clear it
        setTimeout(() => {
          onFinalResult(finalTextToKeep);
        }, 100);
      }
    } else if (accumulatedText.trim() && onFinalResult) {
      // Fallback to accumulated text
      setTimeout(() => {
        onFinalResult(accumulatedText.trim());
      }, 100);
    }
    
    if (onEnd) {
      onEnd();
    }
  };

  try {
    recognition.start();
    isListening = true;
    console.log('🎤 STT started - listening for speech...');
    return true;
  } catch (error) {
    console.error('❌ Failed to start STT:', error);
    isListening = false;
    if (onError) {
      onError(error);
    }
    return false;
  }
};

/**
 * Reset silence timeout - user is still speaking
 */
const resetSilenceTimeout = (onFinalResult) => {
  clearSilenceTimeout();
  
  silenceTimeout = setTimeout(() => {
    console.log('🔇 Silence detected - user stopped speaking');
    // Use the last transcript (which includes both final and interim parts)
    const textToKeep = lastTranscript.trim() || accumulatedText.trim();
    if (textToKeep && onFinalResult) {
      console.log('📝 Preserving full text after silence:', textToKeep.substring(0, 50));
      onFinalResult(textToKeep);
    }
    clearSilenceTimeout();
  }, SILENCE_TIMEOUT_MS);
};

/**
 * Clear silence timeout
 */
const clearSilenceTimeout = () => {
  if (silenceTimeout) {
    clearTimeout(silenceTimeout);
    silenceTimeout = null;
  }
};

/**
 * Stop listening
 */
export const stopListening = () => {
  if (recognition && isListening) {
    try {
      recognition.stop();
      isListening = false;
      clearSilenceTimeout();
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

/**
 * Start listening with OpenAI Whisper (requires API key and audio stream)
 */
export const startOpenAIListening = async (apiKey, onResult, onError) => {
  // This would require MediaRecorder API to capture audio
  // For now, we'll use browser STT as primary
  console.warn('⚠️ OpenAI Whisper streaming not yet implemented. Using browser STT.');
  return false;
};

