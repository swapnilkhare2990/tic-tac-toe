export type Priority = 'low' | 'medium' | 'high';

export interface Todo {
  id: number;
  title: string;
  description: string | null;
  priority: Priority;
  category: string;
  completed: boolean;
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateTodoInput {
  title: string;
  description?: string;
  priority?: Priority;
  category?: string;
  due_date?: string | null;
}

export interface UpdateTodoInput {
  title?: string;
  description?: string;
  priority?: Priority;
  category?: string;
  completed?: boolean;
  due_date?: string | null;
}

export interface FilterState {
  search: string;
  status: 'all' | 'active' | 'completed';
  priority: 'all' | Priority;
  category: string;
  sortBy: 'created_at' | 'due_date' | 'priority' | 'title';
  sortOrder: 'asc' | 'desc';
}

export interface DatabaseStatus {
  connected: boolean;
  message?: string;
  config?: {
    host: string;
    port: number;
    user: string;
    database: string;
  };
}
