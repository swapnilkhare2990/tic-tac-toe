'use client';

import React, { useState } from 'react';
import { DatabaseStatus } from '@/types/todo';

interface DbErrorBannerProps {
  status: DatabaseStatus | null;
  onRetry: () => void;
}

export function DbErrorBanner({ status, onRetry }: DbErrorBannerProps) {
  const [isDismissed, setIsDismissed] = useState(false);
  const [showConfigDetails, setShowConfigDetails] = useState(false);

  if (!status || status.connected || isDismissed) {
    return null;
  }

  return (
    <div className="db-info-banner" id="db-error-banner">
      <div style={{ color: '#f59e0b', marginTop: '2px' }}>
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      </div>

      <div className="db-info-content">
        <div className="db-info-title">
          <span>MySQL Database Not Connected (Running in Memory Fallback Mode)</span>
        </div>
        <p style={{ marginBottom: '8px', color: '#fef08a' }}>
          {status.message || 'Unable to connect to MySQL on localhost:3306.'}
        </p>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={onRetry}
            className="btn-retry"
            id="retry-db-connection-btn"
          >
            Retry Connection
          </button>
          <button
            onClick={() => setShowConfigDetails(!showConfigDetails)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#93c5fd',
              fontSize: '12px',
              textDecoration: 'underline',
              cursor: 'pointer',
            }}
            id="toggle-db-setup-guide"
          >
            {showConfigDetails ? 'Hide setup instructions' : 'How to connect MySQL'}
          </button>
        </div>

        {showConfigDetails && (
          <div
            style={{
              marginTop: '12px',
              padding: '12px',
              background: 'rgba(0, 0, 0, 0.4)',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              fontSize: '12.5px',
              color: '#e2e8f0',
              lineHeight: '1.6',
            }}
          >
            <p><strong>To connect to your local MySQL:</strong></p>
            <ol style={{ paddingLeft: '18px', marginTop: '6px' }}>
              <li>Open <span className="db-code-badge">.env.local</span> in this project.</li>
              <li>Set <span className="db-code-badge">DB_PASSWORD=your_root_password</span>.</li>
              <li>Click &quot;Retry Connection&quot; above. The app will automatically create the <span className="db-code-badge">todos_db</span> database and <span className="db-code-badge">todos</span> table!</li>
            </ol>
          </div>
        )}
      </div>

      <button
        onClick={() => setIsDismissed(true)}
        aria-label="Dismiss banner"
        style={{
          background: 'transparent',
          border: 'none',
          color: '#fbbf24',
          cursor: 'pointer',
          padding: '4px',
        }}
        id="dismiss-db-banner-btn"
      >
        ✕
      </button>
    </div>
  );
}
