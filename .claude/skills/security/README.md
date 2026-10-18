# Security Skill

Comprehensive application security reference for **Next.js 16 + React 19 + TypeScript + MySQL**. Covers OWASP Top 10, authentication, authorization, input validation, secrets management, and secure deployment.

---

## OWASP Top 10 — Quick Reference

| # | Vulnerability | Primary Mitigation |
|---|---|---|
| A01 | Broken Access Control | Server-side ownership checks on every mutation |
| A02 | Cryptographic Failures | bcrypt for passwords, HTTPS, secure cookies |
| A03 | Injection (SQL, XSS) | Parameterized queries, React auto-escaping |
| A04 | Insecure Design | Threat modeling, defense in depth |
| A05 | Security Misconfiguration | Security headers, env var validation |
| A06 | Vulnerable Components | `npm audit`, dependency updates |
| A07 | Auth Failures | Strong sessions, MFA support, rate limiting |
| A08 | Data Integrity Failures | Signed tokens, input validation |
| A09 | Logging Failures | Structured logging, no secrets in logs |
| A10 | Server-Side Request Forgery | Allowlist external URLs |

---

## Authentication

### Password Hashing
```typescript
// src/lib/auth/password.ts
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12; // Never go below 10 in production

export async function hashPassword(plaintext: string): Promise<string> {
  if (plaintext.length < 8) throw new Error('Password must be at least 8 characters');
  return bcrypt.hash(plaintext, SALT_ROUNDS);
}

export async function verifyPassword(
  plaintext: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(plaintext, hash);
}

// Timing-safe comparison for tokens (use instead of === for secrets)
import { timingSafeEqual } from 'crypto';
export function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}
```

### JWT Token Management
```typescript
// src/lib/auth/tokens.ts
import { SignJWT, jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? (() => { throw new Error('Missing JWT_SECRET'); })()
);

export interface TokenPayload {
  userId: number;
  role: 'user' | 'admin';
}

export async function signToken(payload: TokenPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as TokenPayload;
  } catch {
    return null; // Expired, invalid signature, malformed
  }
}
```

### Session Cookie (Secure Configuration)
```typescript
// src/lib/auth/session.ts
import { cookies } from 'next/headers';

const COOKIE_NAME = 'session';

export async function setSession(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,                                           // Block JS access
    secure: process.env.NODE_ENV === 'production',           // HTTPS in production
    sameSite: 'lax',                                         // CSRF protection
    maxAge: 60 * 60 * 24 * 7,                                // 7 days
    path: '/',
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function getSession(): Promise<TokenPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}
```

---

## Authorization — Never Trust the Client

```typescript
// src/lib/auth/middleware.ts
import { getSession } from './session';
import { ForbiddenError, UnauthorizedError } from '@/lib/errors';

// Require authenticated user
export async function requireAuth(): Promise<TokenPayload> {
  const session = await getSession();
  if (!session) throw new UnauthorizedError();
  return session;
}

// Require admin role
export async function requireAdmin(): Promise<TokenPayload> {
  const session = await requireAuth();
  if (session.role !== 'admin') throw new ForbiddenError();
  return session;
}

// In route handlers
export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAuth();       // Must be logged in
  const post = await getPostById(Number(params.id));
  if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  
  // MUST verify ownership — never trust client-sent userId
  if (post.userId !== session.userId && session.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  
  await deletePost(post.id);
  return new NextResponse(null, { status: 204 });
}
```

---

## SQL Injection Prevention

```typescript
// ✅ ALWAYS use parameterized queries
const [rows] = await pool.query<RowDataPacket[]>(
  'SELECT id, name FROM users WHERE email = ? AND is_active = 1',
  [email]
);

// ✅ Multiple params
const [rows] = await pool.query(
  'INSERT INTO posts (title, content, user_id) VALUES (?, ?, ?)',
  [title, content, userId]
);

// ✅ Dynamic column names (safe approach when needed)
const allowedSortColumns = ['created_at', 'title', 'updated_at'] as const;
type SortColumn = typeof allowedSortColumns[number];
function validateSortColumn(col: string): SortColumn {
  if (!allowedSortColumns.includes(col as SortColumn)) {
    throw new Error('Invalid sort column');
  }
  return col as SortColumn;
}
const sortBy = validateSortColumn(queryParam); // Allowlist, not parameterize
const [rows] = await pool.query(`SELECT * FROM posts ORDER BY ${sortBy} DESC LIMIT ?`, [limit]);

// ❌ NEVER — string interpolation with user input
const [rows] = await pool.query(`SELECT * FROM users WHERE id = ${userId}`);
```

---

## XSS Prevention

```typescript
// ✅ React auto-escapes all JSX expressions
<p>{userContent}</p>                 // Safe — React escapes HTML entities

// ✅ If you need HTML, sanitize first
import DOMPurify from 'isomorphic-dompurify';

const sanitized = DOMPurify.sanitize(userHtml, {
  ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'a'],
  ALLOWED_ATTR: ['href', 'target', 'rel'],
});
<div dangerouslySetInnerHTML={{ __html: sanitized }} />;

// ❌ Never use unsanitized user content in dangerouslySetInnerHTML
<div dangerouslySetInnerHTML={{ __html: userContent }} />  // XSS vulnerability!

// ✅ CSP headers to limit damage even if XSS occurs
// Content-Security-Policy: default-src 'self'; script-src 'self'
```

---

## Input Validation

```typescript
// src/lib/validation.ts
export class ValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export const validators = {
  email(value: unknown): string {
    if (typeof value !== 'string') throw new ValidationError('Email must be a string', 'email');
    const trimmed = value.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      throw new ValidationError('Invalid email format', 'email');
    }
    if (trimmed.length > 320) throw new ValidationError('Email too long', 'email');
    return trimmed;
  },

  password(value: unknown): string {
    if (typeof value !== 'string') throw new ValidationError('Password required', 'password');
    if (value.length < 8) throw new ValidationError('Password must be at least 8 characters', 'password');
    if (value.length > 72) throw new ValidationError('Password too long', 'password'); // bcrypt limit
    return value;
  },

  positiveInt(value: unknown, field: string): number {
    const n = Number(value);
    if (!Number.isInteger(n) || n < 1) {
      throw new ValidationError(`${field} must be a positive integer`, field);
    }
    return n;
  },

  string(value: unknown, field: string, maxLength = 255): string {
    if (typeof value !== 'string') throw new ValidationError(`${field} must be a string`, field);
    const trimmed = value.trim();
    if (trimmed.length === 0) throw new ValidationError(`${field} is required`, field);
    if (trimmed.length > maxLength) throw new ValidationError(`${field} exceeds maximum length of ${maxLength}`, field);
    return trimmed;
  },
};
```

---

## Rate Limiting

```typescript
// src/lib/rate-limit.ts
// Production: replace Map with Redis (use ioredis + @upstash/ratelimit)
const store = new Map<string, { count: number; resetAt: number }>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, resetAt: now + windowMs };
  }

  if (entry.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count++;
  return { allowed: true, remaining: limit - entry.count, resetAt: entry.resetAt };
}

// In API route
export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') ?? 'unknown';
  const { allowed, remaining } = rateLimit(`login:${ip}`, 5, 15 * 60 * 1000); // 5 attempts/15min

  if (!allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Try again later.' },
      {
        status: 429,
        headers: { 'Retry-After': '900', 'X-RateLimit-Remaining': '0' },
      }
    );
  }
  // ... handle login
}
```

---

## Security Headers

```typescript
// next.config.ts
const securityHeaders = [
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",  // Needed for Next.js inline scripts
      "style-src 'self' 'unsafe-inline'",   // Needed for CSS-in-JS / inline styles
      "img-src 'self' data: blob: https:",
      "font-src 'self' https://fonts.gstatic.com",
      "connect-src 'self'",
      "frame-ancestors 'none'",
    ].join('; '),
  },
];

const nextConfig = {
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }];
  },
};
```

---

## Secrets Management

```bash
# ✅ Generate strong secrets
openssl rand -base64 32    # For JWT_SECRET, SESSION_SECRET
openssl rand -hex 32       # For API keys

# ✅ Never commit real secrets
echo ".env.local" >> .gitignore

# ✅ Rotate secrets regularly
# Store in: cloud provider secrets manager, Doppler, Vault
```

```typescript
// src/lib/env.ts — validate at startup
const requiredSecrets = ['JWT_SECRET', 'DB_PASSWORD'] as const;

for (const key of requiredSecrets) {
  if (!process.env[key]) {
    throw new Error(`Missing required secret: ${key}`);
  }
  if (process.env[key]!.length < 32) {
    throw new Error(`${key} must be at least 32 characters`);
  }
}
```

---

## Dependency Security

```bash
# Check for known CVEs
npm audit

# Auto-fix where safe
npm audit fix

# Check for outdated packages
npm outdated

# Find unused dependencies
npx depcheck

# Check specific package for vulnerabilities
npx better-npm-audit audit
```

**CI Check** — add to GitHub Actions:
```yaml
- name: Security audit
  run: npm audit --audit-level=high
```
