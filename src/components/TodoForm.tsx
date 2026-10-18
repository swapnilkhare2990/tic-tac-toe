'use client';

import React, { useState } from 'react';
import { CreateTodoInput, Priority } from '@/types/todo';

interface TodoFormProps {
  onAddTodo: (input: CreateTodoInput) => Promise<boolean>;
}

export function TodoForm({ onAddTodo }: TodoFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [category, setCategory] = useState('General');
  const [customCategory, setCustomCategory] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const categories = ['General', 'Work', 'Personal', 'Shopping', 'Health', 'Finance', 'Other'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || isSubmitting) return;

    setIsSubmitting(true);
    const finalCategory = category === 'Other' && customCategory.trim() ? customCategory.trim() : category;

    const success = await onAddTodo({
      title: title.trim(),
      description: description.trim() || undefined,
      priority,
      category: finalCategory,
      due_date: dueDate || null,
    });

    if (success) {
      setTitle('');
      setDescription('');
      setDueDate('');
      setPriority('medium');
      setCategory('General');
      setCustomCategory('');
      setIsExpanded(false);
    }
    setIsSubmitting(false);
  };

  return (
    <div className="glass-panel form-panel" id="todo-form-panel">
      <div className="form-header">
        <h2 className="form-title">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ color: 'var(--primary)' }}
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="16" />
            <line x1="8" y1="12" x2="16" y2="12" />
          </svg>
          Create New Task
        </h2>
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="form-toggle-btn"
          id="toggle-form-details-btn"
        >
          {isExpanded ? 'Simple Mode' : 'Add Details (Priority, Date)'}
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              transform: isExpanded ? 'rotate(180deg)' : 'none',
              transition: 'transform 0.2s',
            }}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="todo-form-content" id="create-todo-form">
        <div className="input-primary-group">
          <input
            type="text"
            className="text-input"
            placeholder="What needs to be done? (e.g. Prepare client presentation)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            id="todo-title-input"
          />
          <button
            type="submit"
            className="btn-primary"
            disabled={!title.trim() || isSubmitting}
            id="submit-todo-btn"
          >
            {isSubmitting ? 'Adding...' : 'Add Task'}
          </button>
        </div>

        {isExpanded && (
          <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label className="field-label" htmlFor="todo-desc-input">Description / Notes</label>
              <textarea
                id="todo-desc-input"
                className="textarea-input"
                placeholder="Add more details, links, or context..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="form-meta-row">
              {/* Priority Selector */}
              <div>
                <label className="field-label" htmlFor="priority-select">Priority Level</label>
                <select
                  id="priority-select"
                  className="custom-select"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as Priority)}
                >
                  <option value="low">🟢 Low Priority</option>
                  <option value="medium">🟡 Medium Priority</option>
                  <option value="high">🔴 High Priority</option>
                </select>
              </div>

              {/* Category */}
              <div>
                <label className="field-label" htmlFor="category-select">Category</label>
                <select
                  id="category-select"
                  className="custom-select"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
                {category === 'Other' && (
                  <input
                    type="text"
                    className="text-input"
                    style={{ marginTop: '8px', padding: '8px 12px' }}
                    placeholder="Enter custom category"
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    id="custom-category-input"
                  />
                )}
              </div>

              {/* Due Date */}
              <div>
                <label className="field-label" htmlFor="due-date-input">Due Date</label>
                <input
                  type="date"
                  id="due-date-input"
                  className="custom-select"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
