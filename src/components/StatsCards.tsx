'use client';

import React from 'react';
import { Todo } from '@/types/todo';

interface StatsCardsProps {
  todos: Todo[];
}

export function StatsCards({ todos }: StatsCardsProps) {
  const total = todos.length;
  const completed = todos.filter((t) => t.completed).length;
  const inProgress = total - completed;
  const highPriority = todos.filter((t) => t.priority === 'high' && !t.completed).length;
  const percentComplete = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="stats-grid" id="stats-grid">
      {/* Total Tasks */}
      <div className="glass-panel stat-card" id="stat-total-card">
        <div className="stat-label">Total Tasks</div>
        <div className="stat-number-row">
          <span className="stat-number">{total}</span>
          <div className="stat-icon" style={{ color: '#818cf8' }}>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="m9 12 2 2 4-4" />
            </svg>
          </div>
        </div>
        <div className="progress-track">
          <div
            className="progress-fill"
            style={{ width: `${percentComplete}%` }}
          />
        </div>
      </div>

      {/* In Progress */}
      <div className="glass-panel stat-card" id="stat-pending-card">
        <div className="stat-label">In Progress</div>
        <div className="stat-number-row">
          <span className="stat-number" style={{ color: '#fbbf24' }}>
            {inProgress}
          </span>
          <div className="stat-icon" style={{ color: '#fbbf24' }}>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
        </div>
        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
          {total > 0 ? `${100 - percentComplete}% remaining` : 'No active tasks'}
        </span>
      </div>

      {/* Completed */}
      <div className="glass-panel stat-card" id="stat-completed-card">
        <div className="stat-label">Completed</div>
        <div className="stat-number-row">
          <span className="stat-number" style={{ color: '#34d399' }}>
            {completed}
          </span>
          <div className="stat-icon" style={{ color: '#34d399' }}>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
        </div>
        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
          {percentComplete}% completion rate
        </span>
      </div>

      {/* High Priority Pending */}
      <div className="glass-panel stat-card" id="stat-high-card">
        <div className="stat-label">High Priority</div>
        <div className="stat-number-row">
          <span className="stat-number" style={{ color: '#fb7185' }}>
            {highPriority}
          </span>
          <div className="stat-icon" style={{ color: '#fb7185' }}>
            <svg
              width="18"
              height="18"
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
        </div>
        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
          {highPriority > 0 ? 'Requires attention' : 'All urgent tasks done'}
        </span>
      </div>
    </div>
  );
}
