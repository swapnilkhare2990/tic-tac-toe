'use client';

import React, { useState } from 'react';
import { Priority, Todo, UpdateTodoInput } from '@/types/todo';

interface TodoItemProps {
  todo: Todo;
  onToggleComplete: (id: number, completed: boolean) => void;
  onUpdate: (id: number, input: UpdateTodoInput) => Promise<boolean>;
  onDelete: (id: number) => void;
}

export function TodoItem({ todo, onToggleComplete, onUpdate, onDelete }: TodoItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(todo.title);
  const [editDesc, setEditDesc] = useState(todo.description || '');
  const [editPriority, setEditPriority] = useState<Priority>(todo.priority);
  const [editCategory, setEditCategory] = useState(todo.category);
  const [editDueDate, setEditDueDate] = useState(todo.due_date || '');
  const [isSaving, setIsSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Format due date & check overdue
  const getDueDateInfo = (dueDateStr: string | null) => {
    if (!dueDateStr) return null;
    const due = new Date(dueDateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const isOverdue = due < today && !todo.completed;
    const isToday = due.toDateString() === today.toDateString();

    const formatted = new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
    }).format(due);

    return {
      label: isToday ? 'Due Today' : formatted,
      isOverdue,
    };
  };

  const dueInfo = getDueDateInfo(todo.due_date);

  const handleSaveEdit = async () => {
    if (!editTitle.trim()) return;
    setIsSaving(true);
    const success = await onUpdate(todo.id, {
      title: editTitle.trim(),
      description: editDesc.trim() || undefined,
      priority: editPriority,
      category: editCategory.trim() || 'General',
      due_date: editDueDate || null,
    });
    if (success) {
      setIsEditing(false);
    }
    setIsSaving(false);
  };

  const handleCancelEdit = () => {
    setEditTitle(todo.title);
    setEditDesc(todo.description || '');
    setEditPriority(todo.priority);
    setEditCategory(todo.category);
    setEditDueDate(todo.due_date || '');
    setIsEditing(false);
  };

  return (
    <div
      className={`glass-panel todo-item-card fade-in ${todo.completed ? 'completed' : ''}`}
      id={`todo-item-${todo.id}`}
    >
      {/* Checkbox */}
      {!isEditing && (
        <div className="custom-checkbox-wrapper">
          <button
            type="button"
            className={`custom-checkbox ${todo.completed ? 'checked' : ''}`}
            onClick={() => onToggleComplete(todo.id, !todo.completed)}
            aria-label={todo.completed ? 'Mark as active' : 'Mark as completed'}
            id={`todo-checkbox-${todo.id}`}
          >
            {todo.completed && (
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#ffffff"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </button>
        </div>
      )}

      {/* Main Body */}
      {isEditing ? (
        <div className="edit-mode-container" id={`todo-edit-mode-${todo.id}`}>
          <input
            type="text"
            className="text-input"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            placeholder="Task Title"
            id={`edit-title-input-${todo.id}`}
          />
          <textarea
            className="textarea-input"
            value={editDesc}
            onChange={(e) => setEditDesc(e.target.value)}
            placeholder="Task description / notes..."
            id={`edit-desc-input-${todo.id}`}
          />

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
            <select
              className="custom-select"
              value={editPriority}
              onChange={(e) => setEditPriority(e.target.value as Priority)}
              id={`edit-priority-select-${todo.id}`}
            >
              <option value="low">🟢 Low</option>
              <option value="medium">🟡 Medium</option>
              <option value="high">🔴 High</option>
            </select>

            <input
              type="text"
              className="text-input"
              value={editCategory}
              onChange={(e) => setEditCategory(e.target.value)}
              placeholder="Category"
              id={`edit-category-input-${todo.id}`}
            />

            <input
              type="date"
              className="custom-select"
              value={editDueDate}
              onChange={(e) => setEditDueDate(e.target.value)}
              id={`edit-date-input-${todo.id}`}
            />
          </div>

          <div className="edit-actions-row">
            <button
              type="button"
              className="btn-secondary btn-sm"
              onClick={handleCancelEdit}
              disabled={isSaving}
              id={`cancel-edit-btn-${todo.id}`}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn-primary btn-sm"
              onClick={handleSaveEdit}
              disabled={!editTitle.trim() || isSaving}
              id={`save-edit-btn-${todo.id}`}
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      ) : (
        <div className="todo-body">
          <div className="todo-header-line">
            <span
              className={`todo-title ${todo.completed ? 'completed' : ''}`}
              id={`todo-title-${todo.id}`}
            >
              {todo.title}
            </span>

            {/* Priority Badge */}
            <span
              className={`badge badge-priority-${todo.priority}`}
              id={`todo-priority-${todo.id}`}
            >
              {todo.priority}
            </span>

            {/* Category Tag */}
            {todo.category && (
              <span className="badge badge-category" id={`todo-category-${todo.id}`}>
                {todo.category}
              </span>
            )}
          </div>

          {/* Description */}
          {todo.description && (
            <p className="todo-description" id={`todo-description-${todo.id}`}>
              {todo.description}
            </p>
          )}

          {/* Metadata: Due Date & Timestamp */}
          <div className="todo-meta-line">
            {dueInfo && (
              <span className={`meta-item ${dueInfo.isOverdue ? 'overdue' : ''}`}>
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                {dueInfo.label}
              </span>
            )}
            <span className="meta-item">
              <svg
                width="13"
                height="13"
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
              {new Date(todo.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {!isEditing && (
        <div className="todo-actions">
          <button
            type="button"
            className="btn-icon"
            onClick={() => setIsEditing(true)}
            aria-label="Edit task"
            title="Edit task"
            id={`edit-todo-btn-${todo.id}`}
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>

          {confirmDelete ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <button
                type="button"
                className="btn-icon delete"
                style={{ color: '#fb7185', background: 'rgba(244, 63, 94, 0.2)' }}
                onClick={() => onDelete(todo.id)}
                aria-label="Confirm delete"
                title="Confirm delete"
                id={`confirm-delete-btn-${todo.id}`}
              >
                ✓
              </button>
              <button
                type="button"
                className="btn-icon"
                onClick={() => setConfirmDelete(false)}
                aria-label="Cancel delete"
                title="Cancel"
                id={`cancel-delete-btn-${todo.id}`}
              >
                ✕
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="btn-icon delete"
              onClick={() => setConfirmDelete(true)}
              aria-label="Delete task"
              title="Delete task"
              id={`delete-todo-btn-${todo.id}`}
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
