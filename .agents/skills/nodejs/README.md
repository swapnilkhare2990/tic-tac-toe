# Node.js Skill

Reference guide for Node.js patterns used in this Next.js project — async/await, modules, streams, environment management, and best practices for the Node.js runtime.

---

## Async Patterns

### async/await (Preferred)
```javascript
// Always prefer async/await over raw Promises for readability
async function fetchData(id) {
  try {
    const data = await database.query('SELECT * FROM items WHERE id = ?', [id]);
    return data;
  } catch (error) {
    console.error('[fetchData] Failed:', error);
    throw error; // Re-throw unless you're handling it here
  }
}
```

### Parallel Execution
```javascript
// ❌ Sequential — unnecessarily slow
const user = await getUser(id);
const posts = await getPosts(id);
const comments = await getComments(id);

// ✅ Parallel — all run concurrently
const [user, posts, comments] = await Promise.all([
  getUser(id),
  getPosts(id),
  getComments(id),
]);

// ✅ Partial failure tolerance
const results = await Promise.allSettled([
  fetchA(),
  fetchB(), // Can fail without killing the whole batch
]);
const successes = results
  .filter(r => r.status === 'fulfilled')
  .map(r => r.value);
```

### Async Iteration
```javascript
// Process large result sets without loading all into memory
async function processLargeTable(pool) {
  const connection = await pool.getConnection();
  try {
    const [rows] = await connection.query('SELECT id FROM large_table');
    for (const row of rows) {
      await processRow(row.id);
    }
  } finally {
    connection.release();
  }
}
```

### Timeout Wrapper
```javascript
function withTimeout(promise, ms, label = 'operation') {
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
  );
  return Promise.race([promise, timeout]);
}

// Usage
const data = await withTimeout(slowDbQuery(), 5000, 'getUserById');
```

---

## Module System (ES Modules)

This project uses TypeScript compiled to ESM. Key rules:

```typescript
// ✅ Named exports (preferred for tree-shaking)
export function formatDate(date: Date): string { ... }
export function formatCurrency(amount: number): string { ... }

// ✅ Default export — only for page components and main module entry points
export default function HomePage() { ... }

// ✅ Re-export pattern for public API
// src/lib/index.ts
export { formatDate, formatCurrency } from './utils';
export { pool } from './db';
```

---

## Environment Variables

```typescript
// src/lib/env.ts — validate at startup, not at call time
function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

export const env = {
  dbHost: requireEnv('DB_HOST'),
  dbPort: parseInt(process.env.DB_PORT ?? '3306', 10),
  dbUser: requireEnv('DB_USER'),
  dbPassword: requireEnv('DB_PASSWORD'),
  dbName: requireEnv('DB_NAME'),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  isDev: process.env.NODE_ENV !== 'production',
} as const;
```

---

## Error Types

```typescript
// Custom error classes for better error handling
export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 500
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id: string | number) {
    super(`${resource} with id ${id} not found`, 'NOT_FOUND', 404);
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR', 400);
    this.name = 'ValidationError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Access denied') {
    super(message, 'FORBIDDEN', 403);
    this.name = 'ForbiddenError';
  }
}

// In API routes
import { AppError } from '@/lib/errors';

export async function GET(request: NextRequest) {
  try {
    const data = await getData();
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('[API]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
```

---

## Logging

```typescript
// src/lib/logger.ts — structured logging
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

function log(level: LogLevel, message: string, data?: Record<string, unknown>) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...data,
  };
  // JSON logs for production (log aggregators parse JSON)
  if (process.env.NODE_ENV === 'production') {
    console[level](JSON.stringify(entry));
  } else {
    // Human-readable in dev
    console[level](`[${level.toUpperCase()}] ${message}`, data ?? '');
  }
}

export const logger = {
  debug: (msg: string, data?: Record<string, unknown>) => log('debug', msg, data),
  info: (msg: string, data?: Record<string, unknown>) => log('info', msg, data),
  warn: (msg: string, data?: Record<string, unknown>) => log('warn', msg, data),
  error: (msg: string, data?: Record<string, unknown>) => log('error', msg, data),
};

// Usage
logger.info('User created', { userId: 42, email: 'user@example.com' });
logger.error('DB query failed', { error: err.message, query: 'getUserById' });
```

---

## Utility Patterns

### Retry with Exponential Backoff
```typescript
async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  baseDelayMs = 500
): Promise<T> {
  let lastError: Error;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxAttempts) {
        const delay = baseDelayMs * Math.pow(2, attempt - 1); // 500, 1000, 2000ms
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError!;
}
```

### Debounce (for API calls from client)
```typescript
function debounce<T extends (...args: unknown[]) => unknown>(fn: T, ms: number): T {
  let timer: ReturnType<typeof setTimeout>;
  return ((...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  }) as T;
}

// Usage in Client Component
const debouncedSearch = useMemo(() => debounce(handleSearch, 300), []);
```

### Chunk Array for Batch Processing
```typescript
function chunk<T>(array: T[], size: number): T[][] {
  return Array.from({ length: Math.ceil(array.length / size) }, (_, i) =>
    array.slice(i * size, i * size + size)
  );
}

// Process 1000 items in batches of 50
for (const batch of chunk(items, 50)) {
  await Promise.all(batch.map(processItem));
}
```

---

## Node.js Version Requirements

- **Minimum**: Node.js 20 LTS
- **Check**: `node --version` should show `v20.x.x` or higher
- **Engine constraint** in `package.json`:
```json
{
  "engines": {
    "node": ">=20.0.0",
    "npm": ">=10.0.0"
  }
}
```
