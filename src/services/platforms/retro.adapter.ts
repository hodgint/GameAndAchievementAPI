import {
  buildAuthorization,
  getAchievementsEarnedBetween,
  getGameExtended,
  getUserCompletedGames,
} from "@retroachievements/api";
import type { AccountPlatform } from "../../interfaces/db.interface.js";
import type {
  LinkAccountInput,
  PlatformAdapter,
  SyncSummary,
} from "../../interfaces/platform-adapter.interface.js";
import * as achievementRepo from "../../repositories/achievement.repository.js";
import * as gameRepo from "../../repositories/game.repository.js";
import * as syncStateRepo from "../../repositories/sync-state.repository.js";
import * as userAchievementRepo from "../../repositories/user-achievement.repository.js";
import * as userGameRepo from "../../repositories/user-game.repository.js";
import { withTransaction } from "../../repositories/execute.js";
import { retroAchievements } from "../../config/defaults.js";
import {
  getLinkedCredentials,
  saveLinkedCredentials,
} from "../linked-account.service.js";

const RA_IMAGE_BASE = "https://media.retroachievements.org";

function raImage(path: string | undefined): string | null {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${RA_IMAGE_BASE}${path}`;
}

export class RetroAdapter implements PlatformAdapter {
  readonly platform: AccountPlatform = "retro";

  async linkAccount(input: LinkAccountInput): Promise<void> {
    const username =
      (input.credentials.username as string | undefined) ??
      input.externalUsername ??
      input.externalUserId;
    await saveLinkedCredentials(
      input.userId,
      this.platform,
      username,
      username,
      {
        username,
        webApiKey:
          (input.credentials.webApiKey as string | undefined) ??
          retroAchievements.apiKey,
      },
    );
  }

  async sync(userId: number): Promise<SyncSummary> {
    const linked = await getLinkedCredentials<{
      username: string;
      webApiKey?: string;
    }>(userId, this.platform);
    if (!linked) {
      throw new Error("RetroAchievements account not linked");
    }

    await syncStateRepo.upsertSyncState({
      userId,
      platform: this.platform,
      status: "running",
    });

    const summary: SyncSummary = {
      gamesSynced: 0,
      achievementsSynced: 0,
      userAchievementsSynced: 0,
    };

    try {
      const auth = buildAuthorization({
        username: linked.credentials.username,
        webApiKey: linked.credentials.webApiKey ?? retroAchievements.apiKey,
      });

      const completedGames = await getUserCompletedGames(auth, {
        username: linked.credentials.username,
      });

      const seenGameIds = new Set<number>();
      for (const entry of completedGames) {
        if (seenGameIds.has(entry.gameId)) continue;
        seenGameIds.add(entry.gameId);

        const gameExtended = await getGameExtended(auth, {
          gameId: entry.gameId,
        });

        await withTransaction(async (conn) => {
          const gameId = await gameRepo.upsertGame(
            {
              name: gameExtended.title,
              accountPlatform: "retro",
              externalId: String(gameExtended.id),
              description: gameExtended.genre ?? null,
              publisher: gameExtended.publisher ?? null,
              developer: gameExtended.developer ?? null,
              imageUrl: raImage(gameExtended.imageIcon),
            },
            conn,
          );
          summary.gamesSynced += 1;

          await userGameRepo.upsertUserGame(
            {
              userId,
              gameId,
              playtime: 0,
            },
            conn,
          );

          const achievements = gameExtended.achievements ?? {};
          for (const ach of Object.values(achievements)) {
            const achievementId = await achievementRepo.upsertAchievement(
              {
                gameId,
                platform: "retro",
                externalId: String(ach.id),
                name: ach.title,
                description: ach.description,
                imageUrl: raImage(`/Badge/${ach.badgeName}.png`),
                achievementType: ach.type ?? null,
                points: ach.points ?? 0,
                sortOrder: ach.displayOrder ?? null,
                metadata: {
                  hardcorePoints: ach.points,
                  softcorePoints: ach.points,
                  trueRatio: ach.trueRatio,
                  author: ach.author,
                },
              },
              conn,
            );
            summary.achievementsSynced += 1;

            if ((ach.numAwarded ?? 0) > 0) {
              await userAchievementRepo.upsertUserAchievement(
                {
                  userId,
                  achievementId,
                  dateEarned: new Date(),
                },
                conn,
              );
              summary.userAchievementsSynced += 1;
            }
          }
        });
      }

      const fromDate = new Date();
      fromDate.setFullYear(fromDate.getFullYear() - 10);
      const earned = await getAchievementsEarnedBetween(auth, {
        username: linked.credentials.username,
        fromDate,
        toDate: new Date(),
      });

      for (const unlock of earned) {
        const game = await gameRepo.findGameByExternalId(
          "retro",
          String(unlock.gameId),
        );
        if (!game) continue;
        const achievement = await achievementRepo.findAchievementByExternalId(
          "retro",
          game.id,
          String(unlock.achievementId),
        );
        if (!achievement) continue;
        await userAchievementRepo.upsertUserAchievement({
          userId,
          achievementId: achievement.id,
          dateEarned: new Date(unlock.date),
        });
      }

      await syncStateRepo.upsertSyncState({
        userId,
        platform: this.platform,
        status: "success",
        lastSyncAt: new Date(),
        errorMessage: null,
      });
    } catch (err) {
      await syncStateRepo.upsertSyncState({
        userId,
        platform: this.platform,
        status: "error",
        errorMessage: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }

    return summary;
  }
}
