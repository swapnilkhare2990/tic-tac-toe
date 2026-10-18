# React Skill

Reference guide for **React 19** patterns used in this Next.js 16 App Router project. Covers Server Components, Client Components, hooks, state management, forms, and best practices.

---

## React 19 — New APIs

### `useActionState` (replaces `useFormState`)
```typescript
'use client';
import { useActionState } from 'react'; // ← New in React 19
import { createPost } from '@/lib/actions/posts';

type State = { error?: string; success?: boolean } | null;

export function CreatePostForm() {
  const [state, formAction, isPending] = useActionState<State, FormData>(
    createPost,
    null
  );

  return (
    <form action={formAction}>
      <input name="title" required disabled={isPending} />
      <textarea name="content" required disabled={isPending} />
      <button type="submit" disabled={isPending}>
        {isPending ? 'Publishing…' : 'Publish'}
      </button>
      {state?.error && <p role="alert" className="error">{state.error}</p>}
      {state?.success && <p role="status">Post published!</p>}
    </form>
  );
}
```

### `use()` Hook for Promises and Context
```typescript
import { use, Suspense } from 'react';

// Unwrap a Promise in a Client Component (Suspense-compatible)
function UserProfile({ userPromise }: { userPromise: Promise<User> }) {
  const user = use(userPromise); // Suspends until resolved
  return <h1>Hello, {user.name}</h1>;
}

// Usage — pass promise from Server Component
export default async function Page() {
  const userPromise = getUser(1); // Don't await — pass the promise
  return (
    <Suspense fallback={<Skeleton />}>
      <UserProfile userPromise={userPromise} />
    </Suspense>
  );
}

// Also works for Context (replaces useContext)
const theme = use(ThemeContext);
```

### `useOptimistic` for Optimistic UI
```typescript
'use client';
import { useOptimistic, useTransition } from 'react';

export function LikeButton({ post }: { post: Post }) {
  const [optimisticPost, addOptimisticLike] = useOptimistic(
    post,
    (state, _) => ({ ...state, likeCount: state.likeCount + 1 })
  );
  const [, startTransition] = useTransition();

  return (
    <button
      onClick={() =>
        startTransition(async () => {
          addOptimisticLike(null); // Immediately update UI
          await likePost(post.id); // Actual server call
        })
      }
    >
      ❤️ {optimisticPost.likeCount}
    </button>
  );
}
```

---

## Server vs Client Components

### Decision Tree
```
Does it need:
  - Event handlers (onClick, onChange)?     → Client Component
  - Browser APIs (localStorage, window)?    → Client Component
  - React hooks (useState, useEffect)?      → Client Component
  - Real-time subscriptions?                → Client Component

Otherwise → Server Component (default, no directive needed)
```

### Composing Server + Client
```typescript
// ✅ Push "use client" as far down the tree as possible

// Server Component — fetches data
export default async function ProductPage({ params }: { params: { id: string } }) {
  const product = await getProduct(params.id); // Direct DB call
  return (
    <div>
      <ProductInfo product={product} />    {/* Server Component */}
      <AddToCartButton productId={product.id} /> {/* Client Component */}
    </div>
  );
}

// Client Component — only the interactive part
'use client';
export function AddToCartButton({ productId }: { productId: number }) {
  const [added, setAdded] = useState(false);
  return (
    <button onClick={() => setAdded(true)}>
      {added ? '✓ Added' : 'Add to Cart'}
    </button>
  );
}
```

### Passing Server Data to Client Components
```typescript
// ✅ Pass serializable props (strings, numbers, plain objects, arrays)
<ClientComponent data={plainObject} count={42} label="Hello" />

// ❌ Can't pass functions, class instances, or non-serializable values
<ClientComponent fn={serverFunction} dbConnection={pool} />
```

---

## Hooks Reference

### `useState` — Local UI State
```typescript
const [isOpen, setIsOpen] = useState(false);
const [count, setCount] = useState(0);

// Functional update for derived state
setCount(prev => prev + 1); // Safe even in batched updates
```

### `useEffect` — Side Effects (use sparingly)
```typescript
// ✅ Valid useEffect uses
useEffect(() => {
  // Syncing with external system (analytics, third-party widget)
  analytics.track('page_view', { page: 'home' });
}, []); // Run once on mount

useEffect(() => {
  // Event listeners
  window.addEventListener('resize', handleResize);
  return () => window.removeEventListener('resize', handleResize); // Cleanup!
}, [handleResize]);

// ❌ Never use for data fetching — use RSC or Server Actions instead
useEffect(() => {
  fetch('/api/users').then(...) // Anti-pattern in App Router
}, []);
```

### `useRef` — DOM Access & Mutable Values
```typescript
// DOM access
const inputRef = useRef<HTMLInputElement>(null);
const focusInput = () => inputRef.current?.focus();
return <input ref={inputRef} />;

// Mutable value without re-render (e.g., timer ID)
const timerId = useRef<ReturnType<typeof setTimeout>>();
```

### `useCallback` + `useMemo` — Memoization
```typescript
// useCallback — stable function reference for memoized children
const handleSearch = useCallback((query: string) => {
  setSearchQuery(query);
}, []); // Empty deps = always stable

// useMemo — expensive derived value
const sortedItems = useMemo(
  () => items.slice().sort((a, b) => a.name.localeCompare(b.name)),
  [items] // Recalculate only when items changes
);

// Rule: Don't add memo/useCallback/useMemo speculatively
// Profile first, then optimize the specific bottleneck
```

### Custom Hooks
```typescript
// src/hooks/useLocalStorage.ts
import { useState, useEffect } from 'react';

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === 'undefined') return initialValue;
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn(`[useLocalStorage] Failed to save "${key}"`, error);
    }
  }, [key, value]);

  return [value, setValue] as const;
}
```

---

## Context Pattern

```typescript
// src/contexts/AuthContext.tsx
'use client';
import { createContext, use, useState } from 'react';

interface AuthContextValue {
  user: User | null;
  login: (user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  return (
    <AuthContext value={{ user, login: setUser, logout: () => setUser(null) }}>
      {children}
    </AuthContext>
  );
}

// useAuth hook — throws if used outside provider
export function useAuth(): AuthContextValue {
  const ctx = use(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
```

---

## Suspense & Error Boundaries

```typescript
// app/dashboard/page.tsx
import { Suspense } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

export default function DashboardPage() {
  return (
    <main>
      <h1>Dashboard</h1>
      <ErrorBoundary fallback={<ErrorFallback />}>
        <Suspense fallback={<StatsSkeleton />}>
          <DashboardStats />
        </Suspense>
        <Suspense fallback={<TableSkeleton />}>
          <RecentActivity />
        </Suspense>
      </ErrorBoundary>
    </main>
  );
}

// app/dashboard/error.tsx — Next.js error boundary
'use client';
export default function ErrorFallback({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div role="alert">
      <h2>Something went wrong</h2>
      <button onClick={reset}>Try again</button>
    </div>
  );
}
```

---

## TypeScript + React Patterns

```typescript
// Props with children
interface CardProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

// Extend HTML element props
interface ButtonProps extends React.ComponentProps<'button'> {
  variant?: 'primary' | 'secondary' | 'danger';
  isLoading?: boolean;
}

// Polymorphic component
interface TextProps<T extends React.ElementType = 'p'> {
  as?: T;
  children: React.ReactNode;
}

// Event handlers
const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => { ... };
const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => { ... };
const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => { ... };

// forwardRef (rare — prefer callback refs)
const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, ...props }, ref) => (
    <div>
      <label>{label}</label>
      <input ref={ref} {...props} />
    </div>
  )
);
Input.displayName = 'Input';
```

---

## Common Anti-patterns to Avoid

```typescript
// ❌ Deriving state with useEffect + setState (causes extra render)
const [fullName, setFullName] = useState('');
useEffect(() => {
  setFullName(`${firstName} ${lastName}`);
}, [firstName, lastName]);

// ✅ Compute during render
const fullName = `${firstName} ${lastName}`;

// ❌ Object/array in dependency array (new reference each render)
useEffect(() => { ... }, [{ id: user.id }]); // Always re-runs!

// ✅ Use primitive value
useEffect(() => { ... }, [user.id]);

// ❌ Index as key
items.map((item, i) => <Item key={i} />);

// ✅ Stable unique ID as key
items.map(item => <Item key={item.id} />);
```
