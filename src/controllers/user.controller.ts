import type { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import type {
  AchievementListQuery,
  GameListQuery,
} from "../interfaces/list-query.interface.js";
import * as userGameRepo from "../repositories/user-game.repository.js";
import * as userAchievementRepo from "../repositories/user-achievement.repository.js";
import { parseListQuery } from "../utils/list-query.js";
import {
  achievementListQuerySchema,
  gameListQuerySchema,
} from "../validators/list-query.validator.js";

function toGameListQuery(
  parsed: ReturnType<typeof gameListQuerySchema.parse>,
): GameListQuery {
  return {
    search: parsed.q,
    platform: parsed.platform,
    completion: parsed.completion,
    sort: parsed.sort,
    order: parsed.order,
    minPlaytime: parsed.minPlaytime,
    hasAchievements: parsed.hasAchievements,
    limit: parsed.limit,
    offset: parsed.offset,
  };
}

function toAchievementListQuery(
  parsed: ReturnType<typeof achievementListQuerySchema.parse>,
): AchievementListQuery {
  return {
    search: parsed.q,
    platform: parsed.platform,
    gameId: parsed.gameId,
    from: parsed.from,
    to: parsed.to,
    minPoints: parsed.minPoints,
    sort: parsed.sort,
    order: parsed.order,
    limit: parsed.limit,
    offset: parsed.offset,
  };
}

export async function getMyGames(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const parsed = parseListQuery(gameListQuerySchema, req);
    const query = toGameListQuery(parsed);
    const result = await userGameRepo.listUserGames(req.userId!, query);

    res.json({
      games: result.items.map((g) => ({
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
        completionPercent:
          Number(g.achievement_total) > 0
            ? Math.round(
                (Number(g.achievement_earned) / Number(g.achievement_total)) *
                  100,
              )
            : 0,
      })),
      total: result.total,
      limit: result.limit,
      offset: result.offset,
      filters: {
        q: query.search,
        platform: query.platform,
        completion: query.completion,
        sort: query.sort,
        order: query.order,
        minPlaytime: query.minPlaytime,
        hasAchievements: query.hasAchievements,
      },
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
    const parsed = parseListQuery(achievementListQuerySchema, req);
    const query = toAchievementListQuery(parsed);
    const result = await userAchievementRepo.listUserAchievements(
      req.userId!,
      query,
    );

    res.json({
      achievements: result.items.map((a) => ({
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
      total: result.total,
      limit: result.limit,
      offset: result.offset,
      filters: {
        q: query.search,
        platform: query.platform,
        gameId: query.gameId,
        from: query.from,
        to: query.to,
        minPoints: query.minPoints,
        sort: query.sort,
        order: query.order,
      },
    });
  } catch (err) {
    next(err);
  }
}
