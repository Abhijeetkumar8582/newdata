import { useEffect, useState, useRef, useCallback } from 'react';
import { getBotActivities, getLatestBotMessage } from '../services/directLineService';

/**
 * Hook to monitor Microsoft Bot Framework Direct Line API for bot messages
 * Polls the API and triggers callback when new bot messages are detected
 */
export const useDirectLineBotMessages = (conversationId, bearerToken, onBotMessage, pollInterval = 2000) => {
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState(null);
  const lastMessageRef = useRef('');
  const lastActivityIdRef = useRef('');
  const pollingIntervalRef = useRef(null);
  const isActiveRef = useRef(false);

  // Start polling for bot messages
  const startPolling = useCallback(() => {
    if (!conversationId || !bearerToken) {
      console.warn('⚠️ Cannot start polling: Conversation ID or Bearer Token missing');
      return;
    }

    if (isActiveRef.current) {
      console.log('📡 Already polling Direct Line API');
      return;
    }

    isActiveRef.current = true;
    setIsPolling(true);
    setError(null);

    console.log('🚀 Starting Direct Line API polling...');
    console.log('📝 Conversation ID:', conversationId);

    // Poll immediately, then at intervals
    const pollBotMessages = async () => {
      try {
        console.log('🔄 Polling Direct Line API...');
        const activitiesData = await getBotActivities(conversationId, bearerToken);
        const latestMessageData = getLatestBotMessage(activitiesData);

        if (latestMessageData) {
          const latestMessage = latestMessageData.text;
          const latestActivityId = latestMessageData.id || latestMessage;

          console.log('📊 Message comparison:', {
            currentLastActivityId: lastActivityIdRef.current,
            newActivityId: latestActivityId,
            currentLastMessage: lastMessageRef.current.substring(0, 50),
            newMessage: latestMessage.substring(0, 50),
          });

          // Check if this is a new message (by activity ID or text)
          const isNewMessage = 
            latestActivityId !== lastActivityIdRef.current ||
            latestMessage !== lastMessageRef.current;

          if (isNewMessage) {
            console.log('✅ NEW bot message detected from Direct Line API');
            console.log('📋 Activity ID:', latestActivityId);
            console.log('📝 Full message text:', latestMessage);
            console.log('🕐 Timestamp:', latestMessageData.timestamp);
            
            lastMessageRef.current = latestMessage;
            lastActivityIdRef.current = latestActivityId;
            
            // Trigger callback with new message
            if (onBotMessage) {
              console.log('📞 Calling onBotMessage callback...');
              onBotMessage(latestMessage);
            }
          } else {
            console.log('ℹ️ Same message (already processed), skipping');
          }
        } else {
          // No bot messages found in activities
          console.log('📭 No bot messages in activities yet');
        }
      } catch (err) {
        console.error('❌ Error polling Direct Line API:', err);
        setError(err.message);
        // Don't stop polling on error - might be temporary
      }
    };

    // Poll immediately
    pollBotMessages();

    // Set up polling interval
    pollingIntervalRef.current = setInterval(pollBotMessages, pollInterval);
  }, [conversationId, bearerToken, onBotMessage, pollInterval]);

  // Stop polling
  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    isActiveRef.current = false;
    setIsPolling(false);
    console.log('🛑 Stopped polling Direct Line API');
  }, []);

  // Start polling when conversation ID and token are provided
  useEffect(() => {
    if (conversationId && bearerToken && onBotMessage) {
      startPolling();
    }

    return () => {
      stopPolling();
    };
  }, [conversationId, bearerToken, onBotMessage, startPolling, stopPolling]);

  return {
    isPolling,
    error,
    startPolling,
    stopPolling,
  };
};

