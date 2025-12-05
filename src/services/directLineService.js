/**
 * Microsoft Bot Framework Direct Line API Service
 * Documentation: https://docs.microsoft.com/en-us/azure/bot-service/rest-api/bot-framework-rest-direct-line-3-0-concepts
 */

const DIRECT_LINE_BASE_URL = 'https://directline.botframework.com/v3/directline';

/**
 * Get bot activities from a conversation
 * @param {string} conversationId - The conversation ID
 * @param {string} bearerToken - The bearer token for authentication
 * @returns {Promise<Array>} - Array of bot activities/messages
 */
export const getBotActivities = async (conversationId, bearerToken) => {
  if (!conversationId || !bearerToken) {
    throw new Error('Conversation ID and Bearer Token are required');
  }

  try {
    const url = `${DIRECT_LINE_BASE_URL}/conversations/${conversationId}/activities`;
    
    console.log('📡 Fetching bot activities from Direct Line API...');
    console.log('🔗 URL:', url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${bearerToken}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error('Direct Line API Error:', response.status, data);
      let errorMessage = data.error?.message || data.message || `API error: ${response.status}`;
      
      if (response.status === 401) {
        errorMessage = 'Unauthorized: Invalid Bearer Token. Please check your token.';
      } else if (response.status === 404) {
        errorMessage = 'Conversation not found: Invalid Conversation ID.';
      } else if (response.status === 403) {
        errorMessage = 'Forbidden: Token may not have access to this conversation.';
      }
      
      throw new Error(errorMessage);
    }

    console.log('✅ Bot activities fetched successfully');
    console.log('📦 Full API Response Structure:', {
      hasActivities: !!data.activities,
      activitiesCount: data.activities?.length || 0,
      watermark: data.watermark || 'none',
      eTag: data.eTag || 'none',
    });
    
    // Log all activities with detailed from information
    if (data.activities && data.activities.length > 0) {
      console.log('📋 All Activities:', data.activities.map(activity => ({
        id: activity.id,
        type: activity.type,
        from: activity.from ? {
          role: activity.from.role || 'none',
          id: activity.from.id || 'none',
          name: activity.from.name || 'none',
        } : 'none',
        timestamp: activity.timestamp,
        text: activity.text ? activity.text.substring(0, 100) + '...' : 'no text',
        hasText: !!activity.text,
      })));
      
      // Log bot activities specifically
      const botActivities = data.activities.filter(act => {
        const from = act.from || {};
        return from.role === 'bot' || 
               from.id === 'comm-cba1-conci-retailai7v5b1-bot' ||
               (from.id && from.id.includes('bot')) ||
               from.name === 'Concierge';
      });
      
      if (botActivities.length > 0) {
        console.log('🤖 Bot Activities Found:', botActivities.map(act => ({
          id: act.id,
          timestamp: act.timestamp,
          from: act.from,
          text: act.text ? act.text.substring(0, 80) + '...' : 'no text',
        })));
      }
    } else {
      console.log('⚠️ No activities found in response');
    }
    
    return data;
  } catch (error) {
    console.error('Error fetching bot activities:', error);
    throw error;
  }
};

/**
 * Extract bot messages from Direct Line activities
 * @param {object} activitiesData - The activities data from Direct Line API
 * @returns {Array<string>} - Array of bot message texts
 */
export const extractBotMessages = (activitiesData) => {
  if (!activitiesData || !activitiesData.activities) {
    return [];
  }

  const botMessages = activitiesData.activities
    .filter(activity => {
      if (activity.type !== 'message' || !activity.text || activity.text.trim().length === 0) {
        return false;
      }
      
      // Check if it's a bot message - handle multiple formats
      const from = activity.from || {};
      const isBot = 
        from.role === 'bot' || // Standard format
        from.id === 'comm-cba1-conci-retailai7v5b1-bot' || // Specific bot ID
        (from.id && from.id.includes('bot')) || // Any ID containing 'bot'
        from.name === 'Concierge'; // Bot name
      
      return isBot;
    })
    .map(activity => activity.text.trim())
    .filter((text, index, self) => self.indexOf(text) === index); // Remove duplicates

  return botMessages;
};

/**
 * Get the latest bot message from activities with metadata
 * @param {object} activitiesData - The activities data from Direct Line API
 * @returns {object|null} - The latest bot message with text, id, and timestamp
 */
export const getLatestBotMessage = (activitiesData) => {
  if (!activitiesData || !activitiesData.activities) {
    console.log('⚠️ getLatestBotMessage: No activities data');
    return null;
  }

  console.log('🔍 Analyzing activities for bot messages...');
  console.log('📊 Total activities:', activitiesData.activities.length);

  // Filter bot messages - handle both standard (role) and custom (id/name) formats
  // Also include messages with attachments (hero cards, images) even if no text
  const botActivities = activitiesData.activities
    .filter(activity => {
      const isMessage = activity.type === 'message';
      const hasText = activity.text && activity.text.trim().length > 0;
      const hasAttachments = activity.attachments && activity.attachments.length > 0;
      
      // Must be a message and have either text or attachments
      if (!isMessage || (!hasText && !hasAttachments)) {
        return false;
      }
      
      // Check if it's a bot message - handle multiple formats
      const from = activity.from || {};
      const isBot = 
        from.role === 'bot' || // Standard format
        from.id === 'comm-cba1-conci-retailai7v5b1-bot' || // Specific bot ID
        (from.id && from.id.includes('bot')) || // Any ID containing 'bot'
        from.name === 'Concierge'; // Bot name
      
      if (!isBot) {
        return false;
      }
      
      return true;
    })
    .sort((a, b) => {
      // Sort by timestamp (most recent first)
      if (a.timestamp && b.timestamp) {
        const timeA = new Date(a.timestamp).getTime();
        const timeB = new Date(b.timestamp).getTime();
        return timeB - timeA; // Descending order (newest first)
      }
      // If no timestamp, sort by ID (fallback)
      if (a.id && b.id) {
        return b.id.localeCompare(a.id);
      }
      return 0;
    });

  console.log('🤖 Filtered bot message activities:', botActivities.length);
  
  if (botActivities.length > 0) {
    console.log(`🤖 Found ${botActivities.length} bot message(s)`);
    botActivities.forEach((activity, index) => {
      console.log(`📝 Bot message ${index + 1} (${index === 0 ? 'LATEST' : 'older'}):`, {
        id: activity.id,
        timestamp: activity.timestamp,
        from: activity.from,
        text: activity.text.substring(0, 100) + (activity.text.length > 100 ? '...' : ''),
        textLength: activity.text.length,
      });
    });
  } else {
    console.log('⚠️ No bot message activities found');
    // Log all from fields to help debug
    if (activitiesData.activities && activitiesData.activities.length > 0) {
      console.log('🔍 Available activities from fields:', activitiesData.activities.map(act => ({
        id: act.id,
        from: act.from,
        type: act.type,
      })));
    }
  }

  if (botActivities.length === 0) {
    return null;
  }

  const latest = botActivities[0];
  console.log('✅ Latest bot message identified:', {
    id: latest.id,
    timestamp: latest.timestamp,
    hasText: !!(latest.text && latest.text.trim().length > 0),
    textPreview: latest.text ? latest.text.substring(0, 100) + '...' : 'No text',
    hasAttachments: !!(latest.attachments && latest.attachments.length > 0),
    attachmentCount: latest.attachments ? latest.attachments.length : 0,
  });
  
  return {
    text: latest.text ? latest.text.trim() : '',
    id: latest.id,
    timestamp: latest.timestamp,
    attachments: latest.attachments || [],
    attachmentLayout: latest.attachmentLayout,
    activity: latest,
  };
};

