import mysql, { Pool, RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { CreateTodoInput, Priority, Todo, UpdateTodoInput } from '@/types/todo';

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = parseInt(process.env.DB_PORT || '3306', 10);
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || 'todos_db';

let pool: Pool | null = null;
let isInitialized = false;

export interface GameResult {
  id: number;
  winner: 'X' | 'O' | null;
  isDraw: boolean;
  playedAt: string;
}

// In-memory fallback store in case database is unreachable or credentials need setup
const memoryTodos: Todo[] = [
  {
    id: 1,
    title: 'Welcome to Next.js Todos!',
    description: 'Check out the modern dark glassmorphic UI, filter options, and live MySQL backend.',
    priority: 'high',
    category: 'Getting Started',
    completed: false,
    due_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 2,
    title: 'Configure MySQL credentials in .env.local',
    description: 'Set your DB_PASSWORD in .env.local to persist tasks directly into your local MySQL database.',
    priority: 'medium',
    category: 'Database',
    completed: false,
    due_date: null,
    created_at: new Date(Date.now() - 3600000).toISOString(),
    updated_at: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 3,
    title: 'Explore task filters and priority tags',
    description: 'Filter by Active, Completed, or priority (Low, Medium, High).',
    priority: 'low',
    category: 'Features',
    completed: true,
    due_date: null,
    created_at: new Date(Date.now() - 7200000).toISOString(),
    updated_at: new Date(Date.now() - 3600000).toISOString(),
  },
];
let memoryIdCounter = 4;
const memoryGames: GameResult[] = [];
let memoryGameIdCounter = 1;

export async function getDbPool(): Promise<Pool> {
  if (pool) return pool;

  // First ensure the database exists
  const tempConn = await mysql.createConnection({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    connectTimeout: 5000,
  });

  await tempConn.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\`;`);
  await tempConn.end();

  // Create pool
  pool = mysql.createPool({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
  });

  return pool;
}

export async function initDb(): Promise<void> {
  if (isInitialized) return;

  const currentPool = await getDbPool();
  await currentPool.query(`
    CREATE TABLE IF NOT EXISTS todos (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      priority ENUM('low', 'medium', 'high') NOT NULL DEFAULT 'medium',
      category VARCHAR(50) NOT NULL DEFAULT 'General',
      completed BOOLEAN NOT NULL DEFAULT FALSE,
      due_date VARCHAR(20) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await currentPool.query(`
    CREATE TABLE IF NOT EXISTS games (
      id INT AUTO_INCREMENT PRIMARY KEY,
      winner ENUM('X', 'O') NULL,
      is_draw BOOLEAN NOT NULL DEFAULT FALSE,
      played_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  isInitialized = true;
}

interface GameRow extends RowDataPacket {
  id: number;
  winner: 'X' | 'O' | null;
  is_draw: number | boolean;
  played_at: Date;
}

function mapGame(row: GameRow): GameResult {
  return { id: row.id, winner: row.winner, isDraw: Boolean(row.is_draw), playedAt: new Date(row.played_at).toISOString() };
}

export async function getGames(): Promise<{ games: GameResult[]; isFallback: boolean }> {
  try {
    await initDb();
    const p = await getDbPool();
    const [rows] = await p.query<GameRow[]>('SELECT * FROM games ORDER BY played_at DESC, id DESC LIMIT 50');
    return { games: rows.map(mapGame), isFallback: false };
  } catch (error) {
    console.warn('MySQL unavailable, using memory game history:', (error as Error).message);
    return { games: [...memoryGames], isFallback: true };
  }
}

export async function createGame(winner: 'X' | 'O' | null, isDraw: boolean): Promise<{ game: GameResult; isFallback: boolean }> {
  try {
    await initDb();
    const p = await getDbPool();
    const [result] = await p.query<ResultSetHeader>('INSERT INTO games (winner, is_draw) VALUES (?, ?)', [winner, isDraw]);
    const [rows] = await p.query<GameRow[]>('SELECT * FROM games WHERE id = ?', [result.insertId]);
    return { game: mapGame(rows[0]), isFallback: false };
  } catch (error) {
    console.warn('MySQL unavailable for game result, using memory store:', (error as Error).message);
    const game: GameResult = { id: memoryGameIdCounter++, winner, isDraw, playedAt: new Date().toISOString() };
    memoryGames.unshift(game);
    return { game, isFallback: true };
  }
}

export async function checkConnection(): Promise<{
  connected: boolean;
  message: string;
  config: { host: string; port: number; user: string; database: string };
}> {
  try {
    const p = await getDbPool();
    await p.query('SELECT 1');
    await initDb();
    return {
      connected: true,
      message: 'Successfully connected to MySQL database',
      config: { host: DB_HOST, port: DB_PORT, user: DB_USER, database: DB_NAME },
    };
  } catch (error: unknown) {
    const err = error as Error & { code?: string };
    let message = err.message;
    if (err.code === 'ER_ACCESS_DENIED_ERROR') {
      message = `Access denied for user '${DB_USER}'@'${DB_HOST}'. Please set the correct DB_PASSWORD in .env.local.`;
    } else if (err.code === 'ECONNREFUSED') {
      message = `Could not connect to MySQL server at ${DB_HOST}:${DB_PORT}. Make sure the MySQL service is running.`;
    }
    return {
      connected: false,
      message,
      config: { host: DB_HOST, port: DB_PORT, user: DB_USER, database: DB_NAME },
    };
  }
}

interface TodoRow extends RowDataPacket {
  id: number;
  title: string;
  description: string | null;
  priority: Priority;
  category: string;
  completed: number | boolean;
  due_date: string | null;
  created_at: Date;
  updated_at: Date;
}

function mapRow(row: TodoRow): Todo {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    priority: row.priority,
    category: row.category || 'General',
    completed: Boolean(row.completed),
    due_date: row.due_date || null,
    created_at: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    updated_at: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString(),
  };
}

export async function getAllTodos(params?: {
  search?: string;
  status?: string;
  priority?: string;
  category?: string;
}): Promise<{ todos: Todo[]; isFallback: boolean }> {
  try {
    await initDb();
    const p = await getDbPool();

    const conditions: string[] = [];
    const values: (string | number | boolean)[] = [];

    if (params?.search) {
      conditions.push('(title LIKE ? OR description LIKE ?)');
      values.push(`%${params.search}%`, `%${params.search}%`);
    }

    if (params?.status === 'active') {
      conditions.push('completed = FALSE');
    } else if (params?.status === 'completed') {
      conditions.push('completed = TRUE');
    }

    if (params?.priority && params.priority !== 'all') {
      conditions.push('priority = ?');
      values.push(params.priority);
    }

    if (params?.category && params.category !== 'all') {
      conditions.push('category = ?');
      values.push(params.category);
    }

    let query = 'SELECT * FROM todos';
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    query += ' ORDER BY completed ASC, created_at DESC';

    const [rows] = await p.query<TodoRow[]>(query, values);
    return { todos: rows.map(mapRow), isFallback: false };
  } catch (error) {
    console.warn('MySQL unavailable, falling back to memory store:', (error as Error).message);
    let filtered = [...memoryTodos];

    if (params?.search) {
      const q = params.search.toLowerCase();
      filtered = filtered.filter(
        (t) => t.title.toLowerCase().includes(q) || (t.description && t.description.toLowerCase().includes(q))
      );
    }
    if (params?.status === 'active') {
      filtered = filtered.filter((t) => !t.completed);
    } else if (params?.status === 'completed') {
      filtered = filtered.filter((t) => t.completed);
    }
    if (params?.priority && params.priority !== 'all') {
      filtered = filtered.filter((t) => t.priority === params.priority);
    }
    if (params?.category && params.category !== 'all') {
      filtered = filtered.filter((t) => t.category.toLowerCase() === params.category?.toLowerCase());
    }

    return {
      todos: filtered.sort((a, b) => Number(a.completed) - Number(b.completed)),
      isFallback: true,
    };
  }
}

export async function createTodo(input: CreateTodoInput): Promise<{ todo: Todo; isFallback: boolean }> {
  try {
    await initDb();
    const p = await getDbPool();

    const title = input.title.trim();
    const description = input.description?.trim() || null;
    const priority = input.priority || 'medium';
    const category = input.category?.trim() || 'General';
    const dueDate = input.due_date || null;

    const [result] = await p.query<ResultSetHeader>(
      'INSERT INTO todos (title, description, priority, category, completed, due_date) VALUES (?, ?, ?, ?, FALSE, ?)',
      [title, description, priority, category, dueDate]
    );

    const [newRows] = await p.query<TodoRow[]>('SELECT * FROM todos WHERE id = ?', [result.insertId]);
    return { todo: mapRow(newRows[0]), isFallback: false };
  } catch (error) {
    console.warn('MySQL unavailable for insert, using memory store:', (error as Error).message);
    const newTodo: Todo = {
      id: memoryIdCounter++,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      priority: input.priority || 'medium',
      category: input.category?.trim() || 'General',
      completed: false,
      due_date: input.due_date || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    memoryTodos.unshift(newTodo);
    return { todo: newTodo, isFallback: true };
  }
}

export async function updateTodo(
  id: number,
  input: UpdateTodoInput
): Promise<{ todo: Todo | null; isFallback: boolean }> {
  try {
    await initDb();
    const p = await getDbPool();

    const fields: string[] = [];
    const values: (string | number | boolean | null)[] = [];

    if (input.title !== undefined) {
      fields.push('title = ?');
      values.push(input.title.trim());
    }
    if (input.description !== undefined) {
      fields.push('description = ?');
      values.push(input.description.trim() || null);
    }
    if (input.priority !== undefined) {
      fields.push('priority = ?');
      values.push(input.priority);
    }
    if (input.category !== undefined) {
      fields.push('category = ?');
      values.push(input.category.trim() || 'General');
    }
    if (input.completed !== undefined) {
      fields.push('completed = ?');
      values.push(input.completed);
    }
    if (input.due_date !== undefined) {
      fields.push('due_date = ?');
      values.push(input.due_date);
    }

    if (fields.length === 0) {
      const [rows] = await p.query<TodoRow[]>('SELECT * FROM todos WHERE id = ?', [id]);
      return { todo: rows[0] ? mapRow(rows[0]) : null, isFallback: false };
    }

    values.push(id);
    await p.query(`UPDATE todos SET ${fields.join(', ')} WHERE id = ?`, values);

    const [rows] = await p.query<TodoRow[]>('SELECT * FROM todos WHERE id = ?', [id]);
    return { todo: rows[0] ? mapRow(rows[0]) : null, isFallback: false };
  } catch (error) {
    console.warn('MySQL unavailable for update, using memory store:', (error as Error).message);
    const index = memoryTodos.findIndex((t) => t.id === id);
    if (index === -1) return { todo: null, isFallback: true };

    const current = memoryTodos[index];
    const updated: Todo = {
      ...current,
      title: input.title !== undefined ? input.title.trim() : current.title,
      description: input.description !== undefined ? input.description?.trim() || null : current.description,
      priority: input.priority !== undefined ? input.priority : current.priority,
      category: input.category !== undefined ? input.category.trim() : current.category,
      completed: input.completed !== undefined ? input.completed : current.completed,
      due_date: input.due_date !== undefined ? input.due_date : current.due_date,
      updated_at: new Date().toISOString(),
    };
    memoryTodos[index] = updated;
    return { todo: updated, isFallback: true };
  }
}

export async function deleteTodo(id: number): Promise<{ success: boolean; isFallback: boolean }> {
  try {
    await initDb();
    const p = await getDbPool();
    const [res] = await p.query<ResultSetHeader>('DELETE FROM todos WHERE id = ?', [id]);
    return { success: res.affectedRows > 0, isFallback: false };
  } catch (error) {
    console.warn('MySQL unavailable for delete, using memory store:', (error as Error).message);
    const initialLen = memoryTodos.length;
    const index = memoryTodos.findIndex((t) => t.id === id);
    if (index !== -1) {
      memoryTodos.splice(index, 1);
    }
    return { success: memoryTodos.length < initialLen, isFallback: true };
  }
}
