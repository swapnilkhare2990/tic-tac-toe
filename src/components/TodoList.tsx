'use client';

import React from 'react';
import { Todo, UpdateTodoInput } from '@/types/todo';
import { TodoItem } from './TodoItem';

interface TodoListProps {
  todos: Todo[];
  isLoading: boolean;
  onToggleComplete: (id: number, completed: boolean) => void;
  onUpdate: (id: number, input: UpdateTodoInput) => Promise<boolean>;
  onDelete: (id: number) => void;
  hasFiltersActive: boolean;
  onResetFilters: () => void;
}

export function TodoList({
  todos,
  isLoading,
  onToggleComplete,
  onUpdate,
  onDelete,
  hasFiltersActive,
  onResetFilters,
}: TodoListProps) {
  if (isLoading && todos.length === 0) {
    return (
      <div className="todo-list-container" id="todo-list-loading">
        {[1, 2, 3].map((n) => (
          <div
            key={n}
            className="glass-panel"
            style={{
              height: '74px',
              borderRadius: 'var(--radius-md)',
              opacity: 0.4,
              animation: 'pulse 1.5s infinite',
            }}
          />
        ))}
      </div>
    );
  }

  if (todos.length === 0) {
    return (
      <div className="glass-panel empty-state-panel" id="empty-state-container">
        <div className="empty-state-icon">
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 11l3 3L22 4" />
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
          </svg>
        </div>
        <h3 className="empty-state-title">
          {hasFiltersActive ? 'No matching tasks found' : 'All clear! No tasks right now'}
        </h3>
        <p className="empty-state-desc">
          {hasFiltersActive
            ? 'Try changing your search term or filter parameters to find what you are looking for.'
            : 'Get started by creating your first task above. It will be stored directly in MySQL!'}
        </p>
        {hasFiltersActive && (
          <button
            className="btn-secondary btn-sm"
            onClick={onResetFilters}
            id="reset-filters-empty-btn"
          >
            Clear All Filters
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="todo-list-container" id="todo-list-container">
      {todos.map((todo) => (
        <TodoItem
          key={todo.id}
          todo={todo}
          onToggleComplete={onToggleComplete}
          onUpdate={onUpdate}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
