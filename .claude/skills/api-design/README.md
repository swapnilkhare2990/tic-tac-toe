# API Design Skill

Reference guide for designing **RESTful APIs** in Next.js App Router — covering resource naming, HTTP semantics, request/response shapes, versioning, pagination, error formats, and OpenAPI documentation.

---

## REST Principles

### Resource Naming

| Rule | ✅ Good | ❌ Bad |
|---|---|---|
| Plural nouns | `/users`, `/posts` | `/user`, `/getPost` |
| Lowercase, hyphenated | `/blog-posts` | `/blogPosts`, `/BlogPosts` |
| Hierarchical nesting | `/users/{id}/posts` | `/getUserPosts` |
| No verbs in URL | `/users/{id}` (DELETE) | `/deleteUser/{id}` |
| Max 2 levels deep | `/users/{id}/posts` | `/users/{id}/posts/{id}/comments/{id}` |

### HTTP Methods

| Method | Use | Idempotent | Body |
|---|---|---|---|
| `GET` | Read resource(s) | ✅ Yes | ❌ No |
| `POST` | Create resource | ❌ No | ✅ Yes |
| `PUT` | Replace resource entirely | ✅ Yes | ✅ Yes |
| `PATCH` | Partial update | ❌ No | ✅ Yes |
| `DELETE` | Remove resource | ✅ Yes | Optional |

### HTTP Status Codes

| Code | Meaning | Use Case |
|---|---|---|
| `200 OK` | Success | GET, PUT, PATCH responses |
| `201 Created` | Resource created | POST success |
| `204 No Content` | Success, no body | DELETE success |
| `400 Bad Request` | Invalid input | Validation errors |
| `401 Unauthorized` | Not authenticated | Missing/invalid auth token |
| `403 Forbidden` | Not authorized | Authenticated but insufficient permission |
| `404 Not Found` | Resource missing | GET/PUT/DELETE non-existent resource |
| `409 Conflict` | State conflict | Duplicate email, optimistic lock |
| `422 Unprocessable Entity` | Semantic validation error | Business rule violation |
| `429 Too Many Requests` | Rate limited | Rate limiter triggered |
| `500 Internal Server Error` | Unexpected server error | Unhandled exceptions |
| `503 Service Unavailable` | Service down | DB connection failed |

---

## Next.js Route Handler Patterns

### Full CRUD Resource

```typescript
// src/app/api/posts/route.ts

import { NextRequest, NextResponse } from 'next/server';

// GET /api/posts — list posts (with pagination)
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const page = Math.max(1, Number(searchParams.get('page') ?? '1'));
  const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') ?? '20')));
  const cursor = searchParams.get('cursor'); // Cursor-based pagination

  try {
    const { items, nextCursor, total } = await getPosts({ page, limit, cursor });
    return NextResponse.json({
      data: items,
      pagination: {
        page,
        limit,
        total,
        nextCursor,
        hasMore: !!nextCursor,
      },
    });
  } catch (error) {
    console.error('[GET /api/posts]', error);
    return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 });
  }
}

// POST /api/posts — create post
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = validateCreatePost(body); // Throws ValidationError if invalid
    const post = await createPost(validated);
    return NextResponse.json({ data: post }, { status: 201 });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message, field: error.field }, { status: 400 });
    }
    console.error('[POST /api/posts]', error);
    return NextResponse.json({ error: 'Failed to create post' }, { status: 500 });
  }
}
```

```typescript
// src/app/api/posts/[id]/route.ts

// GET /api/posts/{id}
export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!Number.isInteger(id) || id < 1) {
    return NextResponse.json({ error: 'Invalid post ID' }, { status: 400 });
  }
  const post = await getPostById(id);
  if (!post) return NextResponse.json({ error: 'Post not found' }, { status: 404 });
  return NextResponse.json({ data: post });
}

// PATCH /api/posts/{id} — partial update
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  const body = await request.json();
  // Authorization check — verify ownership
  const userId = await getAuthUserId(request);
  const post = await getPostById(id);
  if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (post.userId !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  
  const updated = await updatePost(id, body);
  return NextResponse.json({ data: updated });
}

// DELETE /api/posts/{id}
export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  // ... auth + ownership check
  await deletePost(id);
  return new NextResponse(null, { status: 204 });
}
```

---

## Response Envelope Format

Always use a consistent response shape:

```typescript
// ✅ Success — single resource
{
  "data": { "id": 1, "title": "Hello World", "createdAt": "2024-01-15T10:00:00Z" }
}

// ✅ Success — collection with pagination
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 142,
    "hasMore": true,
    "nextCursor": "eyJpZCI6MjB9"
  }
}

// ✅ Error — single error
{
  "error": "Post not found"
}

// ✅ Error — validation with field info
{
  "error": "Validation failed",
  "details": [
    { "field": "email", "message": "Invalid email format" },
    { "field": "name", "message": "Name is required" }
  ]
}
```

---

## Pagination

### Cursor-Based (Recommended for large datasets)
```typescript
// GET /api/posts?limit=20&cursor=eyJjcmVhdGVkQXQiOiIyMDI0LTAxLTE1VDEwOjAwOjAwWiJ9
// Cursor = base64(JSON) of the last item's sort key

export interface PaginationResult<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

export async function getPostsPaginated(
  limit: number,
  cursor?: string
): Promise<PaginationResult<Post>> {
  const decodedCursor = cursor
    ? JSON.parse(Buffer.from(cursor, 'base64').toString())
    : null;
  
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT * FROM posts
     WHERE (? IS NULL OR created_at < ?)
     ORDER BY created_at DESC
     LIMIT ?`,
    [decodedCursor?.createdAt ?? null, decodedCursor?.createdAt ?? null, limit + 1]
  );

  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  const lastItem = items[items.length - 1];
  const nextCursor = hasMore
    ? Buffer.from(JSON.stringify({ createdAt: lastItem.created_at })).toString('base64')
    : null;

  return { items: items as Post[], nextCursor, hasMore };
}
```

### Offset-Based (Simpler, acceptable for small datasets)
```typescript
// GET /api/posts?page=2&limit=20
const offset = (page - 1) * limit;
const [rows] = await pool.query(
  'SELECT * FROM posts ORDER BY created_at DESC LIMIT ? OFFSET ?',
  [limit, offset]
);
const [{ total }] = await pool.query('SELECT COUNT(*) as total FROM posts');
```

---

## Input Validation

```typescript
// src/lib/validation/posts.ts
export interface CreatePostInput {
  title: string;
  content: string;
  status?: 'draft' | 'published';
}

export function validateCreatePost(body: unknown): CreatePostInput {
  if (typeof body !== 'object' || body === null) {
    throw new ValidationError('Request body must be an object');
  }
  const { title, content, status } = body as Record<string, unknown>;

  if (typeof title !== 'string' || title.trim().length === 0) {
    throw new ValidationError('title is required', 'title');
  }
  if (title.trim().length > 255) {
    throw new ValidationError('title must be 255 characters or less', 'title');
  }
  if (typeof content !== 'string' || content.trim().length === 0) {
    throw new ValidationError('content is required', 'content');
  }
  if (status !== undefined && !['draft', 'published'].includes(status as string)) {
    throw new ValidationError('status must be "draft" or "published"', 'status');
  }

  return {
    title: title.trim(),
    content: content.trim(),
    status: (status as CreatePostInput['status']) ?? 'draft',
  };
}
```

---

## API Versioning

When introducing breaking changes:

```
/api/v1/users   ← stable, existing clients
/api/v2/users   ← new version with breaking changes
```

```typescript
// src/app/api/v1/users/route.ts  ← original
// src/app/api/v2/users/route.ts  ← breaking change (new response shape)
```

**Rules:**
- Never break existing API contracts — always version breaking changes
- Deprecate old versions with `Deprecation` response header
- Support old version for at least 6 months after new version ships

---

## API Documentation (OpenAPI / Swagger)

```yaml
# openapi.yaml (root of project)
openapi: '3.0.3'
info:
  title: Sample Next App API
  version: '1.0.0'

paths:
  /api/posts:
    get:
      summary: List posts
      parameters:
        - name: page
          in: query
          schema: { type: integer, default: 1 }
        - name: limit
          in: query
          schema: { type: integer, default: 20, maximum: 100 }
      responses:
        '200':
          description: Success
          content:
            application/json:
              schema:
                type: object
                properties:
                  data:
                    type: array
                    items:
                      $ref: '#/components/schemas/Post'

components:
  schemas:
    Post:
      type: object
      required: [id, title, createdAt]
      properties:
        id: { type: integer }
        title: { type: string }
        createdAt: { type: string, format: date-time }
```
