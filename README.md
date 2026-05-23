# GameAndAchievementAPI

Game and Acheivement API that integrates with various Achievement and Trophy systems

**Essential Dependencies:**

- **`express`**: The core framework for building your API.
- **`dotenv`**: For managing environment variables.
- **`helmet`**: Adds security-related HTTP headers to your Express app.
- **`morgan`**: A logging middleware for requests.

**TypeScript and Dev Dependencies:**

- **`typescript`**: The TypeScript compiler.
- **`ts-node`**: Allows TypeScript to be run directly in Node.js.
- **`tsx`**: ts-node but better.
- **`@types/node`**: Type definitions for Node.js.
- **`@types/express`**: Type definitions for Express.

**Folder structure:**

````Text

|--root/
|  |--src/
|   |--config/ - Database and environments
|   |--controllers/ - Handles incoming HTTP requests
|   |--interfaces/ - Interfaces and types
|   |--middleware/ - Custom functions like authentications and validations
|   |--models/ - Database models
|   |--routes/ - API Routes and map to controller methods
|   |--services/ - App logic that then routes to controllers
|   |--utils/ - Utility functions like logging and other functions that may be used all over the app
|   |--validators/ - Validation logic for requests
|--tests/ - Test functions
````

**Setup:**

1. Copy `.env.example` to `.env` and configure MariaDB + API keys.
2. Run migrations: `npm run migrate`
3. Start dev server: `npm run dev`

**API (v1 prefix `/api/v1`):**

| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/register` | Create account (`email`, `password`, `displayName`) |
| POST | `/auth/login` | Login, returns JWT |
| GET | `/users/me/games` | Unified game library (optional `?platform=`) |
| GET | `/users/me/achievements` | Unified achievement feed (optional `?platform=`, `?gameId=`) |
| GET | `/users/me/accounts` | Linked platform accounts (no secrets) |
| POST | `/users/me/accounts/:platform/link` | Link Xbox, Steam, RetroAchievements, or PSN |
| DELETE | `/users/me/accounts/:platform/link` | Unlink platform |
| POST | `/users/me/sync/:platform` | Sync one platform into the database |
| POST | `/users/me/sync` | Sync all platforms |

Protected routes require header: `Authorization: Bearer <token>`

**Database Schema:**

Unified `achievements` table with `platform` + `metadata` JSON; platform-specific game rows in `games` keyed by `(account_platform, external_id)`. See `migrations/001_initial.sql`.
