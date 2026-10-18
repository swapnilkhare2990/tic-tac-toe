@AGENTS.md

# sample-next-app — Claude Code Configuration

> **Stack**: Next.js 16.3.5 · React 19 · TypeScript 5 · MySQL (mysql2) · Node.js 20

---

## Project Structure

```
src/
├── app/          # Next.js App Router — pages, layouts, API routes, Server Actions
├── components/   # Reusable React components (Server + Client)
├── lib/          # DB client, repositories, services, utilities, actions
└── types/        # TypeScript type definitions and interfaces
```

## Key Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Start dev server (http://localhost:3000) |
| `npm run build` | Production build |
| `npm run lint` | Run ESLint |
| `npx tsc --noEmit` | Type-check without emitting |
| `npm run db:migrate` | Run database migrations |
| `npm test` | Run unit/integration tests (Vitest) |
| `npx playwright test` | Run E2E tests |

---

## Agents

Specialist agents for each domain. Claude Code will route to the right agent based on the task.

| Agent | File | Use For |
|---|---|---|
| 🏛️ **architect** | `.claude/agents/architect.md` | Feature design, trade-offs, system structure |
| ⚙️ **backend** | `.claude/agents/backend.md` | API routes, Server Actions, middleware |
| 🎨 **frontend** | `.claude/agents/frontend.md` | React components, CSS, client interactivity |
| 🗄️ **database** | `.claude/agents/database.md` | MySQL schema, migrations, queries |
| 🧪 **testing** | `.claude/agents/testing.md` | Unit, integration, E2E tests |
| 🔐 **security** | `.claude/agents/security.md` | Security review, auth, input validation |
| 🚀 **devops** | `.claude/agents/devops.md` | Docker, CI/CD, deployment |
| ⚡ **performance** | `.claude/agents/performance.md` | Core Web Vitals, bundle, caching |
| 👁️ **code-reviewer** | `.claude/agents/code-reviewer.md` | PR review, code quality checks |

---

## Skills

Reference guides available for agents to consult during tasks.

| Skill | Path | Contents |
|---|---|---|
| **nodejs** | `.claude/skills/nodejs/README.md` | Async, error handling, logging, env vars |
| **react** | `.claude/skills/react/README.md` | React 19 hooks, RSC, forms, context |
| **mongodb** | `.claude/skills/mongodb/README.md` | MongoDB native driver + Mongoose (future) |
| **api-design** | `.claude/skills/api-design/README.md` | REST, pagination, validation, OpenAPI |
| **testing** | `.claude/skills/testing/README.md` | Vitest + RTL + Playwright patterns |
| **security** | `.claude/skills/security/README.md` | OWASP Top 10, auth, SQL injection, XSS |

---

## Critical Conventions

### TypeScript
- **No `any`** — use `unknown` and narrow with type guards
- All functions have explicit return types
- Types/interfaces live in `src/types/`

### React & Next.js
- **Server Components by default** — add `"use client"` only when truly needed
- **Server Actions for mutations** — not API routes for internal data changes
- Use `useActionState` (React 19) — not deprecated `useFormState`
- `next/image` for all images, `next/link` for all internal links

### Database
- **Parameterized queries always** — `?` placeholders, never string interpolation
- SQL only in `src/lib/` — never in components or route handlers
- Always release connections in `finally` blocks

### Security
- Validate all inputs server-side — never trust the client
- Verify resource ownership on every mutation
- Secrets via `process.env` — never `NEXT_PUBLIC_` for sensitive values

### Code Style
- Named exports for all modules except page components (default export)
- `PascalCase` for components/types, `camelCase` for functions/variables
- `snake_case` for database columns and table names

---

## Environment Variables

See `.env.example` for all required variables. Copy to `.env.local` for local development.

```bash
cp .env.example .env.local
```
