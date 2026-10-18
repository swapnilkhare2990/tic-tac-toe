# tic / tac

A small, two-player tic-tac-toe game built with Next.js and React. Players share one board, take turns as **X** and **O**, and see the result added to the recent-round archive when the game ends.

## Features

- Two-player local gameplay with win and draw detection
- Highlighted winning line and reset/play-again controls
- Match scoreboard for X wins, O wins, and draws
- Recent-round history, limited to the latest 50 saved results
- MySQL persistence with a process-local in-memory fallback when MySQL is unavailable
- Additional todo and database-health API routes included in the project

## Requirements

- Node.js 20 or newer
- npm
- MySQL 8 or a compatible MySQL server (optional for local play; recommended for persistence)

## Getting started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Configure the database if you want persistent results. Copy the example file to `.env.local` and update the values:

   ```bash
   cp .env.example .env.local
   ```

   On Windows PowerShell, use:

   ```powershell
   Copy-Item .env.example .env.local
   ```

   Available variables:

   | Variable | Default | Description |
   | --- | --- | --- |
   | `DB_HOST` | `localhost` | MySQL host |
   | `DB_PORT` | `3306` | MySQL port |
   | `DB_USER` | `root` | MySQL user |
   | `DB_PASSWORD` | empty | MySQL password |
   | `DB_NAME` | `todos_db` | Database name |

3. Start the development server:

   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000).

The app creates the configured database and its `todos` and `games` tables automatically when a database-backed request is first made. You can also run the migration explicitly:

```bash
npm run db:migrate
```

If MySQL cannot be reached, the app continues to work using in-memory data. That fallback is reset whenever the server restarts, so it should not be used where durable history is required.

## Available scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Next.js development server |
| `npm run build` | Create a production build |
| `npm start` | Serve the production build |
| `npm run lint` | Run ESLint |
| `npm run db:migrate` | Create the database and required tables in MySQL |

## API routes

### Games

- `GET /api/games` — return saved game results
- `POST /api/games` — save a result

  ```json
  { "winner": "X", "isDraw": false }
  ```

  For a draw, send `{ "winner": null, "isDraw": true }`.

### Health

- `GET /api/health` — check MySQL connectivity and return the active database configuration (without the password)

### Todos

The project also exposes the underlying todo API:

- `GET /api/todos` — list todos; supports `search`, `status`, `priority`, and `category` query parameters
- `POST /api/todos` — create a todo
- `PATCH /api/todos/:id` — update a todo
- `DELETE /api/todos/:id` — delete a todo

## Project structure

```text
src/
├── app/
│   ├── api/          # Games, health, and todo API routes
│   ├── page.tsx      # Tic-tac-toe game screen
│   └── globals.css   # Global styles
├── components/       # Reusable UI components for the todo experience
├── lib/db.ts         # MySQL access and in-memory fallback store
└── types/            # Shared TypeScript types
scripts/migrate.mjs   # Optional explicit MySQL migration
```

## Production

Build and run the production server with:

```bash
npm run build
npm start
```

Set the database environment variables in the hosting provider before starting the app. Do not commit `.env.local` or any file containing database credentials.

## Learn more

- [Next.js documentation](https://nextjs.org/docs)
- [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying)
- [MySQL documentation](https://dev.mysql.com/doc/)
