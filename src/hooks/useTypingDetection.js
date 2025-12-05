import { useEffect, useState, useRef } from 'react';

/**
 * Hook to detect when user is typing in the chatbot
 * Monitors input fields and typing indicators
 */
export const useTypingDetection = () => {
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    // Function to detect typing in input fields
    const detectTyping = () => {
      // Look for Druid webchat input elements
      const webchatElement = document.querySelector('[id*="druid-webchat"], [id*="druid"], [id*="Druid"]');
      
      if (!webchatElement) {
        return false;
      }

      // Find input fields
      const inputs = webchatElement.querySelectorAll('input[type="text"], textarea, [contenteditable="true"]');
      
      for (const input of inputs) {
        const value = input.value || input.textContent || '';
        if (value.trim().length > 0) {
          return true;
        }
      }
      
      return false;
    };

    // Function to check for typing indicators
    const checkTypingIndicator = () => {
      const webchatElement = document.querySelector('[id*="druid-webchat"], [id*="druid"], [id*="Druid"]');
      if (!webchatElement) return false;

      // Look for typing indicators
      const typingElements = webchatElement.querySelectorAll(
        '[class*="typing"], [class*="writing"], [id*="typing"]'
      );

      return Array.from(typingElements).some(el => {
        const style = window.getComputedStyle(el);
        return style.display !== 'none' && style.visibility !== 'hidden';
      });
    };

    // Check typing status periodically
    const checkTyping = () => {
      const userTyping = detectTyping();
      const typingIndicator = checkTypingIndicator();
      const currentlyTyping = userTyping || typingIndicator;

      setIsTyping(currentlyTyping);

      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // If typing detected, set timeout to clear it after 2 seconds of inactivity
      if (currentlyTyping) {
        typingTimeoutRef.current = setTimeout(() => {
          setIsTyping(false);
        }, 2000);
      }
    };

    // Monitor for input changes
    const handleInput = () => {
      checkTyping();
    };

    // Monitor DOM for input fields
    const observer = new MutationObserver(() => {
      checkTyping();
    });

    // Start monitoring
    const startMonitoring = () => {
      const webchatElement = document.querySelector('[id*="druid-webchat"], [id*="druid"], [id*="Druid"]');
      
      if (webchatElement) {
        // Add event listeners to inputs
        const inputs = webchatElement.querySelectorAll('input, textarea, [contenteditable]');
        inputs.forEach(input => {
          input.addEventListener('input', handleInput);
          input.addEventListener('keydown', handleInput);
          input.addEventListener('keyup', handleInput);
        });

        // Observe for new inputs
        observer.observe(webchatElement, {
          childList: true,
          subtree: true,
        });

        // Check immediately
        checkTyping();
      } else {
        // Retry if webchat not loaded yet
        setTimeout(startMonitoring, 1000);
      }
    };

    startMonitoring();

    // Also check periodically
    const intervalId = setInterval(checkTyping, 500);

    return () => {
      observer.disconnect();
      clearInterval(intervalId);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  return { isTyping };
};

