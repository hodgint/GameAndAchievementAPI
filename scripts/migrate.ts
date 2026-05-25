import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import mariadb from "mariadb";
import { database } from "../src/config/defaults.js";

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(__dirname, "..", "migrations");

async function migrate(): Promise<void> {
  const conn = await mariadb.createConnection({
    host: database.address,
    user: database.user,
    password: database.pass,
    database: database.name,
    multipleStatements: true,
  });

  try {
    await conn.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const files = readdirSync(migrationsDir)
      .filter((f) => f.endsWith(".sql"))
      .sort();

    for (const file of files) {
      const id = file;
      const applied = await conn.query(
        "SELECT id FROM schema_migrations WHERE id = ?",
        [id],
      );
      if (Array.isArray(applied) && applied.length > 0) {
        console.log(`Skip ${id} (already applied)`);
        continue;
      }

      const sql = readFileSync(join(migrationsDir, file), "utf8");
      console.log(`Applying ${id}...`);
      await conn.query(sql);
      await conn.query("INSERT INTO schema_migrations (id) VALUES (?)", [id]);
      console.log(`Applied ${id}`);
    }

    console.log("Migrations complete.");
  } finally {
    await conn.end();
  }
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
