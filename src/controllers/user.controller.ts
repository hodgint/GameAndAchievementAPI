import type { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import * as userGameRepo from "../repositories/user-game.repository.js";
import * as userAchievementRepo from "../repositories/user-achievement.repository.js";
import { accountPlatformSchema } from "../validators/account.validator.js";

export async function getMyGames(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const platform =
      typeof req.query.platform === "string"
        ? accountPlatformSchema.parse(req.query.platform)
        : undefined;
    const games = await userGameRepo.listUserGames(req.userId!, platform);
    res.json({
      games: games.map((g) => ({
        id: g.id,
        gameId: g.game_id,
        name: g.game_name,
        platform: g.account_platform,
        imageUrl: g.game_image_url,
        playtime: g.playtime,
        lastPlayed: g.last_played,
        dateOwned: g.date_owned,
        achievementTotal: Number(g.achievement_total),
        achievementEarned: Number(g.achievement_earned),
      })),
    });
  } catch (err) {
    next(err);
  }
}

export async function getMyAchievements(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const platform =
      typeof req.query.platform === "string"
        ? accountPlatformSchema.parse(req.query.platform)
        : undefined;
    const gameId =
      typeof req.query.gameId === "string"
        ? Number(req.query.gameId)
        : undefined;

    const achievements = await userAchievementRepo.listUserAchievements(
      req.userId!,
      platform,
      gameId,
    );

    res.json({
      achievements: achievements.map((a) => ({
        id: a.id,
        achievementId: a.achievement_id,
        name: a.achievement_name,
        description: a.achievement_description,
        imageUrl: a.achievement_image_url,
        platform: a.platform,
        points: a.points,
        gameId: a.game_id,
        gameName: a.game_name,
        dateEarned: a.date_earned,
        progress: a.progress,
      })),
    });
  } catch (err) {
    next(err);
  }
}
