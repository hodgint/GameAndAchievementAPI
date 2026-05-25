import type { Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import type {
  AchievementListQuery,
  GameListQuery,
} from "../interfaces/list-query.interface.js";
import * as userGameRepo from "../repositories/user-game.repository.js";
import * as userAchievementRepo from "../repositories/user-achievement.repository.js";
import * as achievementRepo from "../repositories/achievement.repository.js";
import * as gameRepo from "../repositories/game.repository.js";
import * as userRepo from "../repositories/user.repository.js";
import { parseListQuery } from "../utils/list-query.js";
import {
  achievementListQuerySchema,
  gameListQuerySchema,
} from "../validators/list-query.validator.js";
import { updateProfileSchema } from "../validators/user.validator.js";

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

function mapGameRow(g: Awaited<ReturnType<typeof userGameRepo.findUserGame>>) {
  if (!g) return null;
  return {
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
  };
}

export async function getMe(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = await userRepo.findUserById(req.userId!);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    const stats = await userRepo.getUserProfileStats(req.userId!);
    const { password_hash: _, ...safeUser } = user;
    res.json({ user: safeUser, stats });
  } catch (err) {
    next(err);
  }
}

export async function updateMe(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = updateProfileSchema.parse(req.body);
    const user = await userRepo.findUserById(req.userId!);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    if (body.displayName) {
      await userRepo.updateUserProfile(req.userId!, body.displayName);
    }

    if (body.newPassword) {
      const valid = await bcrypt.compare(
        body.currentPassword!,
        user.password_hash,
      );
      if (!valid) {
        res.status(400).json({ error: "Current password is incorrect" });
        return;
      }
      const hash = await bcrypt.hash(body.newPassword, 12);
      await userRepo.updateUserPassword(req.userId!, hash);
    }

    const updated = await userRepo.findUserById(req.userId!);
    const { password_hash: _, ...safeUser } = updated!;
    res.json({ user: safeUser });
  } catch (err) {
    next(err);
  }
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
      games: result.items.map((g) => mapGameRow(g)!),
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

export async function getMyGame(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const gameId = Number(req.params.gameId);
    if (!Number.isFinite(gameId)) {
      res.status(400).json({ error: "Invalid game ID" });
      return;
    }

    const userGame = await userGameRepo.findUserGame(req.userId!, gameId);
    if (!userGame) {
      res.status(404).json({ error: "Game not in your library" });
      return;
    }

    const game = await gameRepo.findGameById(gameId);
    res.json({
      game: mapGameRow(userGame),
      details: game
        ? {
            description: game.description,
            publisher: game.publisher,
            developer: game.developer,
            releaseDate: game.release_date,
            externalId: game.external_id,
          }
        : null,
    });
  } catch (err) {
    next(err);
  }
}

export async function getMyGameAchievements(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const gameId = Number(req.params.gameId);
    if (!Number.isFinite(gameId)) {
      res.status(400).json({ error: "Invalid game ID" });
      return;
    }

    const userGame = await userGameRepo.findUserGame(req.userId!, gameId);
    if (!userGame) {
      res.status(404).json({ error: "Game not in your library" });
      return;
    }

    const board = await achievementRepo.listGameAchievementBoard(
      req.userId!,
      gameId,
    );

    res.json({
      gameId,
      gameName: userGame.game_name,
      achievements: board.map((a) => ({
        id: a.id,
        externalId: a.external_id,
        name: a.name,
        description: a.description,
        imageUrl: a.image_url,
        type: a.achievement_type,
        points: a.points,
        sortOrder: a.sort_order,
        platform: a.platform,
        earned: Boolean(a.earned),
        dateEarned: a.date_earned,
        progress: a.progress,
      })),
      earned: board.filter((a) => a.earned).length,
      total: board.length,
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
