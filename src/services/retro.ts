import { buildAuthorization, getAchievementsEarnedBetween, getGame, getUserProfile } from "@retroachievements/api";
import {retroAchievements} from "../config/defaults"

const username = retroAchievements.username;
const webApiKey = retroAchievements.apiKey;

const retroAuth = buildAuthorization({username, webApiKey});

// need to add validations to these
export async function retroProfile(user: any){
    return getUserProfile(retroAuth, {username: user});
}

export async function getRetroGameInfo(gameID: number){
    return getGame(retroAuth, {gameId: gameID})
}

export async function getRetroAchievementsByDateRange(user: string, fromDate: Date, toDate: Date){
    return getAchievementsEarnedBetween(retroAuth, {username: user, fromDate: fromDate, toDate: toDate})
}

