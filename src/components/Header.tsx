'use client';

import React from 'react';
import { DatabaseStatus } from '@/types/todo';

interface HeaderProps {
  dbStatus: DatabaseStatus | null;
  onRefreshDb: () => void;
}

export function Header({ dbStatus, onRefreshDb }: HeaderProps) {
  const today = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  }).format(new Date());

  return (
    <header className="glass-panel header-wrapper" id="app-header">
      <div className="brand-section">
        <div className="brand-logo-badge">
          <svg
            width="26"
            height="26"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            color="#ffffff"
          >
            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>
        </div>
        <div>
          <h1 className="brand-title">TaskFlow</h1>
          <p className="brand-subtitle">
            {today} • Next.js & MySQL Powered
          </p>
        </div>
      </div>

      <div className="header-status-group">
        {dbStatus ? (
          <div
            className={`db-badge ${dbStatus.connected ? 'connected' : 'disconnected'}`}
            title={dbStatus.message || (dbStatus.connected ? 'Connected to MySQL' : 'Using Local Storage Fallback')}
            id="db-status-badge"
          >
            <span
              className={`status-dot ${dbStatus.connected ? 'connected' : 'disconnected'}`}
            />
            <span>
              {dbStatus.connected
                ? `MySQL Connected (${dbStatus.config?.database || 'todos_db'})`
                : 'MySQL Offline (Local Store)'}
            </span>
            <button
              onClick={onRefreshDb}
              aria-label="Refresh database connection status"
              style={{
                background: 'transparent',
                border: 'none',
                color: 'inherit',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                padding: '2px',
              }}
              id="refresh-db-btn"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
              </svg>
            </button>
          </div>
        ) : (
          <div className="db-badge" id="db-status-loading">
            <span className="status-dot" style={{ background: '#94a3b8' }} />
            <span>Checking MySQL...</span>
          </div>
        )}
      </div>
    </header>
  );
}
