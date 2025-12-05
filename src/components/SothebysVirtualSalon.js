import React, { useEffect } from 'react';
import './SothebysVirtualSalon.css';

/**
 * Sotheby's Virtual Salon Component
 * Static UI only - no functionality
 */
const SothebysVirtualSalon = () => {
  useEffect(() => {
    const initDruidWebchat = () => {
      if (typeof window.DruidWebchat_v2 !== 'undefined') {
        window.DruidWebchat_v2.init({
          botId: "8e9b021e-4dd6-4de3-b5d3-08de22baaa6f",
          baseUrl: "https://druidapi.comm.eu.druidplatform.com",
          queryParams: "",
          elementId: "sothebys-chat"
        });
        console.log('✅ Druid webchat initialized');
      } else {
        setTimeout(initDruidWebchat, 500);
      }
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initDruidWebchat);
    } else {
      initDruidWebchat();
    }
  }, []);

  return (
    <div className="shell">
      <section className="chat-shell">
        <div className="chat-inner">
          <div className="chat-header">
            <div className="chat-title-block">
              <div className="chat-title">Sotheby's Virtual Concierge</div>
              <div className="chat-subtitle">
                Curated guidance for bidding, selling, and private appointments.
              </div>
            </div>
            <div className="chat-status">
              <span className="status-dot"></span>
              Available now
            </div>
          </div>

          <div id="sothebys-chat" className="chat-widget">
          </div>
        </div>
      </section>
    </div>
  );
};

export default SothebysVirtualSalon;
