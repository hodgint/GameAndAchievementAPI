import {
  buildAuthorization,
  getAchievementsEarnedBetween,
  getGame,
  getUserProfile,
} from "@retroachievements/api";
import { retroAchievements } from "../config/defaults.js";

const username = retroAchievements.username;
const webApiKey = retroAchievements.apiKey;

const retroAuth = buildAuthorization({ username, webApiKey });

export async function retroProfile(user: string) {
  return getUserProfile(retroAuth, { username: user });
}

export async function getRetroGameInfo(gameID: number) {
  return getGame(retroAuth, { gameId: gameID });
}

export async function getRetroAchievementsByDateRange(
  user: string,
  fromDate: Date,
  toDate: Date,
) {
  return getAchievementsEarnedBetween(retroAuth, {
    username: user,
    fromDate,
    toDate,
  });
}
