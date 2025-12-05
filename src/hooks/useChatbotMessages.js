import { useEffect, useState, useCallback } from 'react';

/**
 * Hook to monitor Druid chatbot messages and trigger callbacks
 */
export const useChatbotMessages = (onBotMessage) => {
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    // Function to extract text from bot messages
    const extractBotMessages = () => {
      // Look for Druid webchat messages in the DOM - try multiple selectors
      let webchatElement = document.querySelector('[id*="druid-webchat"]');
      if (!webchatElement) {
        webchatElement = document.querySelector('[id*="druid"]');
      }
      if (!webchatElement) {
        webchatElement = document.querySelector('[id*="Druid"]');
      }
      // Also try looking in the body for any Druid elements
      if (!webchatElement) {
        const allElements = document.querySelectorAll('[id*="druid"], [class*="druid"]');
        if (allElements.length > 0) {
          webchatElement = allElements[0];
        }
      }
      
      if (!webchatElement) {
        console.log('⚠️ Druid webchat element not found');
        return [];
      }
      
      console.log('✅ Found Druid webchat element');

      // Find all message elements - try multiple selectors for Druid webchat
      const selectors = [
        // Look for message containers
        '[class*="message"]:not([class*="container"]):not([class*="area"]):not([class*="wrapper"]):not([class*="list"]):not([class*="panel"])',
        '[class*="bubble"]',
        '[class*="chat-message"]',
        '[class*="msg"]',
        // Look for content areas
        '[class*="content"]',
        '[class*="text"]',
        // Look for left-aligned messages (typically bot messages)
        'div[style*="text-align: left"]',
        'div[style*="justify-content: flex-start"]',
        'div[style*="align-items: flex-start"]',
      ];

      let messageElements = [];
      selectors.forEach(selector => {
        try {
          const elements = webchatElement.querySelectorAll(selector);
          messageElements = [...messageElements, ...Array.from(elements)];
        } catch (e) {
          // Ignore invalid selectors
        }
      });

      // Also look for all divs with text content inside message areas
      const allDivs = webchatElement.querySelectorAll('div');
      allDivs.forEach(div => {
        const text = div.textContent?.trim();
        // Check if it looks like a message (has text, not too short, not a container)
        if (text && text.length > 10 && text.length < 2000) {
          const classStr = div.className?.toLowerCase() || '';
          const parentClassStr = div.parentElement?.className?.toLowerCase() || '';
          
          // Skip if it's clearly a container/wrapper
          if (!classStr.includes('container') && 
              !classStr.includes('wrapper') && 
              !classStr.includes('panel') &&
              !parentClassStr.includes('user')) {
            messageElements.push(div);
          }
        }
      });

      // Remove duplicates based on text content and position
      const uniqueElements = [];
      const seenTexts = new Set();
      
      messageElements.forEach(el => {
        const text = el.textContent?.trim();
        if (text && !seenTexts.has(text)) {
          seenTexts.add(text);
          uniqueElements.push(el);
        }
      });

      // More aggressive bot message detection
      const newMessages = uniqueElements
        .map((el) => {
          const text = el.textContent?.trim();
          if (!text || text.length < 5) return null;

          // Determine if it's a bot message - more aggressive detection
          const classStr = el.classList.toString().toLowerCase();
          const parentEl = el.parentElement;
          const parentClassStr = parentEl?.classList.toString().toLowerCase() || '';
          const grandParentClassStr = parentEl?.parentElement?.classList.toString().toLowerCase() || '';
          const allClasses = (classStr + ' ' + parentClassStr + ' ' + grandParentClassStr).toLowerCase();
          
          // Check for user messages first (exclude these)
          const isUserMessage = 
            allClasses.includes('user') ||
            allClasses.includes('sender') ||
            allClasses.includes('my-message') ||
            el.closest('[class*="user"]') ||
            el.closest('[class*="sender"]') ||
            el.closest('[class*="my-message"]') ||
            // Check if it's in an input field
            el.tagName === 'INPUT' || el.tagName === 'TEXTAREA';
          
          if (isUserMessage) {
            return null;
          }
          
          // Enhanced bot detection - more permissive
          const isBot = 
            allClasses.includes('bot') ||
            allClasses.includes('assistant') ||
            allClasses.includes('agent') ||
            allClasses.includes('system') ||
            allClasses.includes('message') ||
            el.closest('[class*="bot"]') ||
            el.closest('[class*="assistant"]') ||
            el.closest('[class*="agent"]') ||
            // Check alignment - bot messages are usually left-aligned
            (parentEl && window.getComputedStyle(parentEl).textAlign === 'left') ||
            // Default: if not clearly a user message, treat as bot message
            true; // More permissive - assume bot if not explicitly user
          
          // Additional check: skip very short or common UI text
          if (text.length < 10 || 
              text.toLowerCase() === 'typing...' ||
              text.toLowerCase() === 'loading...' ||
              text.toLowerCase().includes('click to send')) {
            return null;
          }

          if (isBot && text) {
            console.log('🤖 Bot message found:', text.substring(0, 50));
            return { text, element: el, timestamp: Date.now() };
          }
          
          return null;
        })
        .filter(Boolean);

      if (newMessages.length > 0) {
        console.log(`✅ Found ${newMessages.length} bot message(s)`);
      }
      
      return newMessages;
    };

    // Track last processed message to avoid duplicates (outside observer scope)
    let lastProcessedText = '';
    let lastProcessedTime = 0;

    // Track message completion for async/streaming responses
    let messageStabilizationTimeout = null;
    let lastSeenText = '';
    let stabilizationCount = 0;
    const STABILIZATION_DELAY = 800; // Wait 0.8s after text stops changing (faster sync)
    const MIN_STABILIZATION_COUNT = 1; // Message must be stable for 1 check (more responsive)

    // Check for typing indicators or loading states
    const isBotTyping = () => {
      const webchatElement = document.querySelector('[id*="druid-webchat"], [id*="druid"], [id*="Druid"]');
      if (!webchatElement) return false;
      
      // Look for common typing indicator patterns
      const typingIndicators = webchatElement.querySelectorAll(
        '[class*="typing"], [class*="loading"], [class*="thinking"], ' +
        '[class*="spinner"], [id*="typing"], [id*="loading"]'
      );
      
      // Check if any typing indicators are visible
      return Array.from(typingIndicators).some(el => {
        const style = window.getComputedStyle(el);
        return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
      });
    };

    // Function to check if message is complete and stable
    const checkAndProcessStableMessage = (immediate = false) => {
      // Skip if bot is still typing
      if (isBotTyping() && !immediate) {
        console.log('⏳ Bot is still typing, waiting...');
        return;
      }
      
      const botMessages = extractBotMessages();
      
      if (botMessages && botMessages.length > 0) {
        const latestMessage = botMessages[botMessages.length - 1];
        const currentText = latestMessage.text || '';
        const now = Date.now();
        
        // Check if message is still being updated (streaming/typing)
        if (currentText !== lastSeenText && currentText.length > lastSeenText.length) {
          // Message is growing (streaming)
          lastSeenText = currentText;
          stabilizationCount = 0;
          
          // Clear existing timeout
          if (messageStabilizationTimeout) {
            clearTimeout(messageStabilizationTimeout);
          }
          
          // Wait for message to stabilize (stop changing)
          console.log('📝 Message streaming detected, waiting for completion...');
          messageStabilizationTimeout = setTimeout(() => {
            checkAndProcessStableMessage(true);
          }, STABILIZATION_DELAY);
          
          return;
        }
        
        // Message hasn't changed - increment stabilization count
        if (currentText === lastSeenText && currentText.length > 5) {
          stabilizationCount++;
          
          // Process if message is stable or immediate flag is set
          if (immediate || stabilizationCount >= MIN_STABILIZATION_COUNT) {
            const isNew = currentText !== lastProcessedText || 
                         (now - lastProcessedTime) > 5000; // 5 second window for same message
            
            if (isNew && onBotMessage && currentText) {
              console.log('✅ Stable bot message detected (async response complete):', currentText.substring(0, 100));
              
              // Clean up the text (remove emojis, extra spaces, etc.)
              let cleanText = currentText
                .replace(/[\u{1F300}-\u{1F9FF}]/gu, '') // Remove emojis
                .replace(/[\u{2600}-\u{26FF}]/gu, '') // Remove more emojis
                .replace(/[\u{2700}-\u{27BF}]/gu, '') // Remove more emojis
                .replace(/[\u{1FA00}-\u{1FAFF}]/gu, '') // Remove more emojis
                .replace(/\s+/g, ' ') // Normalize whitespace
                .trim();
              
              if (cleanText && cleanText.length > 5) {
                lastProcessedText = currentText;
                lastProcessedTime = now;
                stabilizationCount = 0;
                
                // Auto-generate video for async bot response - immediate trigger for better sync
                console.log('🎬 Auto-generating video for bot response:', cleanText.substring(0, 50));
                console.log('📊 Full message text:', cleanText);
                // Immediate trigger for better sync with chatbot
                onBotMessage(cleanText);
              }
            }
            
            stabilizationCount = 0;
          }
        }
      }
    };

    // MutationObserver to watch for new messages and text updates
    const observer = new MutationObserver((mutations) => {
      // Check if any mutations added or modified text content
      const hasNewContent = mutations.some(mutation => {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          return Array.from(mutation.addedNodes).some(node => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              return node.textContent && node.textContent.trim().length > 0;
            }
            if (node.nodeType === Node.TEXT_NODE) {
              return node.textContent && node.textContent.trim().length > 0;
            }
            return false;
          });
        }
        if (mutation.type === 'characterData') {
          return mutation.target.textContent && mutation.target.textContent.trim().length > 0;
        }
        if (mutation.type === 'attributes') {
          // Text might be updated via attributes
          return true;
        }
        return false;
      });

      if (hasNewContent) {
        // Check for stable message (handles async/streaming)
        checkAndProcessStableMessage();
      }
    });

    // Start observing after a delay to ensure webchat is loaded
    const startObserving = () => {
      const webchatElement = document.querySelector('[id*="druid-webchat"], [id*="druid"], [id*="Druid"]');
      
      if (webchatElement) {
        observer.observe(webchatElement, {
          childList: true,
          subtree: true,
          characterData: true,
        });
      } else {
        // Retry after a delay
        setTimeout(startObserving, 1000);
      }
    };

    // Start observing immediately and retry if needed
    startObserving();
    
    // Also retry after delays to ensure we catch the webchat when it loads
    setTimeout(startObserving, 1000);
    setTimeout(startObserving, 2000);
    setTimeout(startObserving, 3000);

    // Also check periodically for messages (backup method for async responses)
    // More frequent checking for better sync
    const intervalId = setInterval(() => {
      // Check for stable messages (handles cases where observer might miss updates)
      checkAndProcessStableMessage();
    }, 500); // Check every 500ms for faster detection and better sync

    return () => {
      observer.disconnect();
      clearInterval(intervalId);
      if (messageStabilizationTimeout) {
        clearTimeout(messageStabilizationTimeout);
      }
    };
  }, [onBotMessage]);

  return { messages };
};

