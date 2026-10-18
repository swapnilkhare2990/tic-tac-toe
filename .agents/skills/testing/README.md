# Testing Skill

Comprehensive testing reference for **Next.js 16 + React 19 + TypeScript + MySQL** applications. Covers testing philosophy, setup, patterns for each layer, and CI integration.

---

## Testing Philosophy

> "Test behavior, not implementation. Write tests you'd want to read at 2am during an incident."

### Testing Trophy (recommended distribution)
```
          /‾‾‾‾‾‾‾\
         /  E2E   \    ← Few, high-value user journeys (Playwright)
        /‾‾‾‾‾‾‾‾‾‾‾\
       / Integration  \   ← API routes + Server Actions + DB
      /‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾\
     /   Unit Tests     \  ← Utils, validators, pure functions
    /____________________\
          Static          ← TypeScript + ESLint (always on)
```

---

## Stack Setup

### Vitest + React Testing Library
```bash
npm install -D vitest @vitejs/plugin-react jsdom \
  @testing-library/react @testing-library/user-event \
  @testing-library/jest-dom
```

**`vitest.config.ts`**:
```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      exclude: ['node_modules', '.next', 'src/test'],
    },
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
});
```

**`src/test/setup.ts`**:
```typescript
import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock next/navigation globally
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock next/cache
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
  unstable_cache: vi.fn(fn => fn),
}));
```

**Add to `package.json`**:
```json
{
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage",
    "test:ui": "vitest --ui"
  }
}
```

---

## File Organization

```
src/
├── components/
│   ├── Button.tsx
│   └── Button.test.tsx          ← Co-located with component
├── lib/
│   ├── utils.ts
│   └── utils.test.ts            ← Co-located with module
├── lib/actions/
│   ├── posts.ts
│   └── posts.test.ts
└── test/
    ├── setup.ts                 ← Global setup
    ├── helpers.ts               ← Shared test utilities
    └── fixtures/
        ├── users.ts             ← User factory functions
        └── posts.ts             ← Post factory functions
e2e/
├── auth.spec.ts
├── posts.spec.ts
└── fixtures/
    └── auth.fixture.ts          ← Playwright fixtures
```

---

## Unit Tests — Utilities

```typescript
// src/lib/utils.test.ts
import { describe, it, expect } from 'vitest';
import { truncate, slugify, formatDate } from './utils';

describe('truncate()', () => {
  it('returns full string when shorter than limit', () => {
    expect(truncate('Hello', 10)).toBe('Hello');
  });

  it('truncates and appends ellipsis when over limit', () => {
    expect(truncate('Hello World', 8)).toBe('Hello Wo…');
  });

  it('handles empty string', () => {
    expect(truncate('', 10)).toBe('');
  });
});

describe('slugify()', () => {
  it('converts spaces to hyphens and lowercases', () => {
    expect(slugify('Hello World')).toBe('hello-world');
  });

  it('removes special characters', () => {
    expect(slugify('Hello, World!')).toBe('hello-world');
  });
});
```

---

## Component Tests — React Testing Library

```typescript
// src/components/PostCard.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PostCard } from './PostCard';
import { createPostFixture } from '@/test/fixtures/posts';

describe('PostCard', () => {
  const post = createPostFixture({ title: 'My Post', status: 'published' });

  it('renders title and status', () => {
    render(<PostCard post={post} />);
    expect(screen.getByRole('heading', { name: 'My Post' })).toBeInTheDocument();
    expect(screen.getByText('published')).toBeInTheDocument();
  });

  it('calls onDelete when delete button is clicked', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    render(<PostCard post={post} onDelete={onDelete} />);

    await user.click(screen.getByRole('button', { name: /delete/i }));

    expect(onDelete).toHaveBeenCalledWith(post.id);
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('shows draft badge for draft posts', () => {
    const draft = createPostFixture({ status: 'draft' });
    render(<PostCard post={draft} />);
    expect(screen.getByText('Draft')).toBeInTheDocument();
  });
});
```

### Query Priority (Most → Least Preferred)
1. `getByRole` — best for accessibility
2. `getByLabelText` — form inputs
3. `getByPlaceholderText` — inputs with placeholders
4. `getByText` — visible text
5. `getByDisplayValue` — form values
6. `getByAltText` — images
7. `getByTitle` — title attributes
8. `getByTestId` — last resort, use `data-testid`

---

## Server Action Tests

```typescript
// src/lib/actions/posts.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Always mock at the module boundary (DB layer)
vi.mock('@/lib/db', () => ({
  default: { query: vi.fn() },
}));

import pool from '@/lib/db';
import { createPost } from './posts';

describe('createPost()', () => {
  beforeEach(() => vi.clearAllMocks());

  function makeFormData(data: Record<string, string>): FormData {
    const fd = new FormData();
    Object.entries(data).forEach(([k, v]) => fd.set(k, v));
    return fd;
  }

  it('returns success when DB insert succeeds', async () => {
    vi.mocked(pool.query).mockResolvedValueOnce([{ insertId: 1 }, []]);

    const result = await createPost(null, makeFormData({ title: 'Test', content: 'Body' }));

    expect(result).toEqual({ success: true, data: { id: 1 } });
  });

  it('returns validation error for empty title', async () => {
    const result = await createPost(null, makeFormData({ title: '', content: 'Body' }));

    expect(result).toMatchObject({ success: false, error: expect.stringContaining('title') });
    expect(pool.query).not.toHaveBeenCalled(); // DB never called
  });

  it('returns error result on DB failure', async () => {
    vi.mocked(pool.query).mockRejectedValueOnce(new Error('DB connection lost'));

    const result = await createPost(
      null,
      makeFormData({ title: 'Test', content: 'Body' })
    );

    expect(result).toEqual({ success: false, error: expect.any(String) });
  });
});
```

---

## API Route Tests

```typescript
// src/app/api/posts/route.test.ts
import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from './route';

vi.mock('@/lib/repositories/posts', () => ({
  getPosts: vi.fn().mockResolvedValue({
    items: [{ id: 1, title: 'Test Post' }],
    nextCursor: null,
    hasMore: false,
  }),
  createPost: vi.fn(),
}));

describe('GET /api/posts', () => {
  it('returns 200 with post list', async () => {
    const req = new NextRequest('http://localhost/api/posts');
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.pagination).toBeDefined();
  });

  it('applies limit from query param', async () => {
    const req = new NextRequest('http://localhost/api/posts?limit=5');
    await GET(req);
    // Verify limit was passed to repository
    const { getPosts } = await import('@/lib/repositories/posts');
    expect(vi.mocked(getPosts)).toHaveBeenCalledWith(expect.objectContaining({ limit: 5 }));
  });
});
```

---

## Test Fixtures / Factories

```typescript
// src/test/fixtures/posts.ts
import type { Post } from '@/types';

let counter = 0;

export function createPostFixture(overrides: Partial<Post> = {}): Post {
  counter++;
  return {
    id: counter,
    title: `Test Post ${counter}`,
    content: 'Test content body.',
    status: 'published',
    userId: 1,
    createdAt: new Date('2024-01-15T10:00:00Z'),
    updatedAt: new Date('2024-01-15T10:00:00Z'),
    ...overrides,
  };
}

export function createPostListFixture(count: number, overrides: Partial<Post> = {}): Post[] {
  return Array.from({ length: count }, () => createPostFixture(overrides));
}
```

---

## E2E Tests — Playwright

```typescript
// e2e/posts.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Posts', () => {
  test.beforeEach(async ({ page }) => {
    // Seed test data via API or direct DB call
    await page.request.post('/api/test/seed', { data: { scenario: 'posts' } });
  });

  test('user can create a post', async ({ page }) => {
    await page.goto('/posts/new');

    await page.getByLabel('Title').fill('My New Post');
    await page.getByLabel('Content').fill('Post body content here.');
    await page.getByRole('button', { name: 'Publish' }).click();

    // Should redirect to the new post
    await expect(page).toHaveURL(/\/posts\/\d+/);
    await expect(page.getByRole('heading', { name: 'My New Post' })).toBeVisible();
  });

  test('shows validation error for empty title', async ({ page }) => {
    await page.goto('/posts/new');

    await page.getByRole('button', { name: 'Publish' }).click();

    await expect(page.getByRole('alert')).toContainText('title');
  });
});
```

---

## Coverage Requirements

```typescript
// vitest.config.ts — enforce thresholds
test: {
  coverage: {
    thresholds: {
      lines: 70,
      functions: 80,
      branches: 70,
      statements: 70,
    },
  },
}
```

| Layer | Lines | Branches |
|---|---|---|
| `src/lib/utils` | 90% | 85% |
| `src/lib/actions` | 80% | 75% |
| `src/app/api/**/route.ts` | 80% | 75% |
| `src/components` | 70% | 65% |

---

## Running Tests

```bash
npm test                    # Watch mode (dev)
npm run test:run            # Single run (CI)
npm run test:coverage       # With coverage report
npm run test:ui             # Browser UI for test results

npx playwright test         # E2E headless
npx playwright test --ui    # E2E interactive
npx playwright codegen      # Record test interactions
```
