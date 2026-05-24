import { database } from "./defaults.js";
import { loadEnv } from "./env.js";
import * as mariadb from "mariadb";

const env = loadEnv();

export const pool = mariadb.createPool({
  host: database.address,
  user: database.user,
  password: database.pass,
  database: database.name,
  connectionLimit: env.DB_POOL_SIZE,
  acquireTimeout: 30_000,
});
