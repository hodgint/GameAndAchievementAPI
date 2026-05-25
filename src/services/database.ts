/**
 * Legacy database module — re-exports repository functions for backward compatibility.
 */
export { executeQuery, executeMutation, DbError } from "../repositories/execute.js";
export {
  getAllGames,
  getGamesByPlatformId,
  insertPlatform,
  upsertGame,
  findGameByExternalId,
} from "../repositories/game.repository.js";
export { upsertAchievement } from "../repositories/achievement.repository.js";
