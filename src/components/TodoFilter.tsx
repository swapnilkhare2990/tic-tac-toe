'use client';

import React from 'react';
import { FilterState, Priority } from '@/types/todo';

interface TodoFilterProps {
  filters: FilterState;
  onFilterChange: (newFilters: Partial<FilterState>) => void;
  categories: string[];
}

export function TodoFilter({ filters, onFilterChange, categories }: TodoFilterProps) {
  return (
    <div className="glass-panel filter-bar" id="todo-filter-bar">
      <div className="filter-top-row">
        {/* Search Input */}
        <div className="search-input-wrapper">
          <span className="search-icon">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </span>
          <input
            type="text"
            className="search-input"
            placeholder="Search tasks by keyword..."
            value={filters.search}
            onChange={(e) => onFilterChange({ search: e.target.value })}
            id="todo-search-input"
          />
          {filters.search && (
            <button
              onClick={() => onFilterChange({ search: '' })}
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
              }}
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </div>

        {/* Status Tabs */}
        <div className="status-tabs" role="tablist" id="status-tabs-container">
          <button
            className={`tab-btn ${filters.status === 'all' ? 'active' : ''}`}
            onClick={() => onFilterChange({ status: 'all' })}
            id="filter-all-tab"
            role="tab"
            aria-selected={filters.status === 'all'}
          >
            All
          </button>
          <button
            className={`tab-btn ${filters.status === 'active' ? 'active' : ''}`}
            onClick={() => onFilterChange({ status: 'active' })}
            id="filter-active-tab"
            role="tab"
            aria-selected={filters.status === 'active'}
          >
            Active
          </button>
          <button
            className={`tab-btn ${filters.status === 'completed' ? 'active' : ''}`}
            onClick={() => onFilterChange({ status: 'completed' })}
            id="filter-completed-tab"
            role="tab"
            aria-selected={filters.status === 'completed'}
          >
            Completed
          </button>
        </div>

        {/* Priority Filter */}
        <div style={{ minWidth: '150px' }}>
          <select
            className="custom-select"
            style={{ padding: '8px 12px', fontSize: '13px' }}
            value={filters.priority}
            onChange={(e) => onFilterChange({ priority: e.target.value as 'all' | Priority })}
            id="filter-priority-select"
          >
            <option value="all">All Priorities</option>
            <option value="high">🔴 High Priority</option>
            <option value="medium">🟡 Medium Priority</option>
            <option value="low">🟢 Low Priority</option>
          </select>
        </div>
      </div>

      {/* Category Pills Row */}
      {categories.length > 0 && (
        <div className="filter-bottom-row">
          <div className="category-pills">
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>
              Category:
            </span>
            <button
              className={`pill-filter ${filters.category === 'all' ? 'active' : ''}`}
              onClick={() => onFilterChange({ category: 'all' })}
              id="category-pill-all"
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                className={`pill-filter ${filters.category === cat ? 'active' : ''}`}
                onClick={() => onFilterChange({ category: cat })}
                id={`category-pill-${cat.toLowerCase().replace(/\s+/g, '-')}`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
