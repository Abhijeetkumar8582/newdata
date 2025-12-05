import React, { useState } from 'react';
import './DirectLineConfig.css';

/**
 * Component for configuring Direct Line API credentials
 * Allows user to input Conversation ID and Bearer Token
 */
const DirectLineConfig = ({ onConfigChange, initialConfig = {} }) => {
  const [conversationId, setConversationId] = useState(initialConfig.conversationId || '');
  const [bearerToken, setBearerToken] = useState(initialConfig.bearerToken || '');
  const [isConfigured, setIsConfigured] = useState(!!(initialConfig.conversationId && initialConfig.bearerToken));

  const handleSave = () => {
    if (!conversationId.trim() || !bearerToken.trim()) {
      alert('Please enter both Conversation ID and Bearer Token');
      return;
    }

    setIsConfigured(true);
    if (onConfigChange) {
      onConfigChange({
        conversationId: conversationId.trim(),
        bearerToken: bearerToken.trim(),
      });
    }
  };

  const handleClear = () => {
    setConversationId('');
    setBearerToken('');
    setIsConfigured(false);
    if (onConfigChange) {
      onConfigChange({
        conversationId: '',
        bearerToken: '',
      });
    }
  };

  return (
    <div className="directline-config">
      <div className="directline-config-header">
        <h3>Direct Line API Configuration</h3>
        {isConfigured && (
          <span className="config-status">✅ Configured</span>
        )}
      </div>
      
      <div className="directline-config-fields">
        <div className="config-field">
          <label htmlFor="conversation-id">Conversation ID:</label>
          <input
            id="conversation-id"
            type="text"
            value={conversationId}
            onChange={(e) => setConversationId(e.target.value)}
            placeholder="e.g., FT0imK4kkFx9blsTZLWKSW-eu"
            disabled={isConfigured}
          />
        </div>

        <div className="config-field">
          <label htmlFor="bearer-token">Bearer Token:</label>
          <input
            id="bearer-token"
            type="password"
            value={bearerToken}
            onChange={(e) => setBearerToken(e.target.value)}
            placeholder="Enter your Direct Line bearer token"
            disabled={isConfigured}
          />
        </div>
      </div>

      <div className="config-actions">
        {!isConfigured ? (
          <button onClick={handleSave} className="save-button">
            Save & Start
          </button>
        ) : (
          <button onClick={handleClear} className="clear-button">
            Clear & Reconfigure
          </button>
        )}
      </div>

      {conversationId && bearerToken && !isConfigured && (
        <div className="config-info">
          Click "Save & Start" to begin monitoring bot messages
        </div>
      )}
    </div>
  );
};

export default DirectLineConfig;

