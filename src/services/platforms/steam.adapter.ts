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
import { steam } from "../../config/defaults.js";
import {
  getLinkedCredentials,
  saveLinkedCredentials,
} from "../linked-account.service.js";

type SteamCredentials = {
  steamId: string;
  apiKey: string;
};

interface SteamOwnedGame {
  appid: number;
  name: string;
  playtime_forever: number;
  img_icon_url?: string;
}

interface SteamAchievementSchema {
  name: string;
  displayName: string;
  description?: string;
  icon?: string;
  icongray?: string;
  hidden?: number;
}

interface SteamPlayerAchievement {
  apiname: string;
  achieved: number;
  unlocktime: number;
}

async function steamGet<T>(
  path: string,
  params: Record<string, string>,
): Promise<T> {
  const search = new URLSearchParams({
    ...params,
    key: params.key ?? process.env.STEAM_API_KEY ?? "",
  });
  const url = `https://api.steampowered.com/${path}?${search}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Steam API error: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export class SteamAdapter implements PlatformAdapter {
  readonly platform: AccountPlatform = "steam";

  async linkAccount(input: LinkAccountInput): Promise<void> {
    const steamId =
      (input.credentials.steamId as string | undefined) ??
      input.externalUserId ??
      steam.id;
    const apiKey =
      (input.credentials.apiKey as string | undefined) ??
      process.env.STEAM_API_KEY;
    if (!steamId || !apiKey) {
      throw new Error("steamId and Steam Web API key are required");
    }

    await saveLinkedCredentials(
      input.userId,
      this.platform,
      steamId,
      input.externalUsername,
      { steamId, apiKey },
    );
  }

  async sync(userId: number): Promise<SyncSummary> {
    const linked = await getLinkedCredentials<SteamCredentials>(userId, "steam");
    if (!linked) {
      throw new Error("Steam account not linked");
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
      const { steamId, apiKey } = linked.credentials;

      const owned = await steamGet<{
        response: { games?: SteamOwnedGame[] };
      }>("IPlayerService/GetOwnedGames/v1/", {
        key: apiKey,
        steamid: steamId,
        include_appinfo: "1",
        include_played_free_games: "1",
        format: "json",
      });

      for (const game of owned.response.games ?? []) {
        const gameId = await gameRepo.upsertGame({
          name: game.name,
          accountPlatform: "steam",
          externalId: String(game.appid),
          imageUrl: game.img_icon_url
            ? `https://media.steampowered.com/steamcommunity/public/images/apps/${game.appid}/${game.img_icon_url}.jpg`
            : null,
        });
        summary.gamesSynced += 1;

        await userGameRepo.upsertUserGame({
          userId,
          gameId,
          playtime: game.playtime_forever,
        });

        const [schema, playerAchievements] = await Promise.all([
          steamGet<{
            game: { availableGameStats?: { achievements?: SteamAchievementSchema[] } };
          }>("ISteamUserStats/GetSchemaForGame/v2/", {
            key: apiKey,
            appid: String(game.appid),
          }).catch(() => ({
            game: { availableGameStats: { achievements: [] as SteamAchievementSchema[] } },
          })),
          steamGet<{
            playerstats: { achievements?: SteamPlayerAchievement[] };
          }>("ISteamUserStats/GetPlayerAchievements/v1/", {
            key: apiKey,
            steamid: steamId,
            appid: String(game.appid),
          }).catch(() => ({
            playerstats: { achievements: [] as SteamPlayerAchievement[] },
          })),
        ]);

        const unlockMap = new Map(
          (playerAchievements.playerstats.achievements ?? [])
            .filter((a: SteamPlayerAchievement) => a.achieved === 1)
            .map((a: SteamPlayerAchievement) => [a.apiname, a.unlocktime]),
        );

        for (const ach of schema.game.availableGameStats?.achievements ?? []) {
          const achievementId = await achievementRepo.upsertAchievement({
            gameId,
            platform: "steam",
            externalId: ach.name,
            name: ach.displayName,
            description: ach.description ?? null,
            imageUrl: ach.icon
              ? `https://cdn.cloudflare.steamstatic.com/steamcommunity/public/images/apps/${game.appid}/${ach.icon}`
              : null,
            achievementType: ach.hidden ? "hidden" : "standard",
            metadata: { apiname: ach.name },
          });
          summary.achievementsSynced += 1;

          const unlockTime = unlockMap.get(ach.name);
          if (unlockTime) {
            await userAchievementRepo.upsertUserAchievement({
              userId,
              achievementId,
              dateEarned: new Date(Number(unlockTime) * 1000),
            });
            summary.userAchievementsSynced += 1;
          }
        }
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
