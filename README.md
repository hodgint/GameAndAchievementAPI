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

**Database Schema:**
