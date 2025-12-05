/**
 * Network Monitor Service
 * Automatically detects Direct Line API conversation ID and bearer token from network requests
 */

let conversationId = null;
let bearerToken = null;
let credentialsListeners = [];

/**
 * Initialize network monitoring to detect Direct Line API credentials
 */
export const startNetworkMonitoring = () => {
  // Listen for fetch requests
  const originalFetch = window.fetch;
  window.fetch = async (...args) => {
    const url = args[0];
    const options = args[1] || {};
    
    // Check if this is a Direct Line API request
    if (typeof url === 'string' && url.includes('directline.botframework.com')) {
      console.log('🔍 Direct Line API request detected:', url);
      
      // Extract conversation ID from URL
      const conversationMatch = url.match(/conversations\/([^/]+)/);
      if (conversationMatch && conversationMatch[1]) {
        const detectedConversationId = conversationMatch[1];
        if (detectedConversationId !== conversationId) {
          conversationId = detectedConversationId;
          console.log('✅ Conversation ID detected:', conversationId);
          notifyCredentialsListeners();
        }
      }
      
      // Extract bearer token from Authorization header
      if (options.headers) {
        const authHeader = options.headers['Authorization'] || options.headers['authorization'];
        if (authHeader && authHeader.startsWith('Bearer ')) {
          const detectedToken = authHeader.substring(7);
          if (detectedToken !== bearerToken) {
            bearerToken = detectedToken;
            console.log('✅ Bearer Token detected');
            notifyCredentialsListeners();
          }
        }
      }
    }
    
    // Continue with original fetch
    return originalFetch.apply(this, args);
  };

  // Also monitor XMLHttpRequest
  const originalOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, url, ...rest) {
    if (typeof url === 'string' && url.includes('directline.botframework.com')) {
      console.log('🔍 Direct Line API XHR detected:', url);
      
      const conversationMatch = url.match(/conversations\/([^/]+)/);
      if (conversationMatch && conversationMatch[1]) {
        const detectedConversationId = conversationMatch[1];
        if (detectedConversationId !== conversationId) {
          conversationId = detectedConversationId;
          console.log('✅ Conversation ID detected (XHR):', conversationId);
          notifyCredentialsListeners();
        }
      }
    }
    
    return originalOpen.call(this, method, url, ...rest);
  };

  const originalSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;
  XMLHttpRequest.prototype.setRequestHeader = function(name, value) {
    if (name.toLowerCase() === 'authorization' && value.startsWith('Bearer ')) {
      const detectedToken = value.substring(7);
      if (detectedToken !== bearerToken) {
        bearerToken = detectedToken;
        console.log('✅ Bearer Token detected (XHR)');
        notifyCredentialsListeners();
      }
    }
    return originalSetRequestHeader.call(this, name, value);
  };

  console.log('✅ Network monitoring started');
};

/**
 * Get detected credentials
 */
export const getDetectedCredentials = () => {
  return {
    conversationId,
    bearerToken,
    isComplete: !!(conversationId && bearerToken),
  };
};

/**
 * Subscribe to credentials updates
 */
export const onCredentialsDetected = (callback) => {
  credentialsListeners.push(callback);
  
  // Immediately call if credentials already detected
  if (conversationId && bearerToken) {
    callback({ conversationId, bearerToken });
  }
  
  // Return unsubscribe function
  return () => {
    credentialsListeners = credentialsListeners.filter(cb => cb !== callback);
  };
};

/**
 * Notify all listeners of credential updates
 */
const notifyCredentialsListeners = () => {
  if (conversationId && bearerToken) {
    credentialsListeners.forEach(callback => {
      callback({ conversationId, bearerToken });
    });
  }
};

/**
 * Clear detected credentials
 */
export const clearCredentials = () => {
  conversationId = null;
  bearerToken = null;
  credentialsListeners = [];
};

