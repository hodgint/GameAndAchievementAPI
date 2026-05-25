import { authenticate } from "@xboxreplay/xboxlive-auth";
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
import {
  getLinkedCredentials,
  saveLinkedCredentials,
} from "../linked-account.service.js";

type XboxCredentials = {
  xuid: string;
  xstsToken: string;
  gamertag?: string;
  expiresOn?: string;
};

interface XboxAchievement {
  id: string;
  name: string;
  description?: string;
  lockedDescription?: string;
  mediaAssets?: { type: string; name: string; url: string }[];
  titleAssociations?: { name: string; id: string }[];
  progressionState?: string;
  timeUnlocked?: string;
  rewards?: { value: string; type: string; name?: string }[];
  rarity?: { currentCategory: string; currentPercentage: number };
}

interface XboxAchievementsResponse {
  achievements: XboxAchievement[];
  pagingInfo?: { totalRecords: number; continuationToken?: string };
}

async function fetchXboxAchievements(
  xuid: string,
  xstsToken: string,
  continuationToken?: string,
): Promise<XboxAchievementsResponse> {
  const url = new URL(
    `https://achievements.xboxlive.com/users/xuid(${xuid})/achievements`,
  );
  if (continuationToken) {
    url.searchParams.set("continuationToken", continuationToken);
  }

  const res = await fetch(url.toString(), {
    headers: {
      "x-xbl-contract-version": "2",
      Authorization: `XBL3.0 x=${xuid};${xstsToken}`,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(`Xbox achievements API error: ${res.status}`);
  }

  return res.json() as Promise<XboxAchievementsResponse>;
}

export class XboxAdapter implements PlatformAdapter {
  readonly platform: AccountPlatform = "xbox";

  async linkAccount(input: LinkAccountInput): Promise<void> {
    let credentials: XboxCredentials;

    if (input.credentials.xstsToken && input.credentials.xuid) {
      credentials = {
        xuid: String(input.credentials.xuid),
        xstsToken: String(input.credentials.xstsToken),
        gamertag: input.externalUsername,
        expiresOn: input.credentials.expiresOn as string | undefined,
      };
    } else {
      const email = input.credentials.email as string | undefined;
      const password = input.credentials.password as string | undefined;
      if (!email || !password) {
        throw new Error(
          "Xbox link requires xuid+xstsToken or email+password for authentication",
        );
      }
      const auth = await authenticate(
        email as `${string}@${string}.${string}`,
        password,
      );
      credentials = {
        xuid: String(auth.xuid),
        xstsToken: auth.xsts_token,
        gamertag: (auth.display_claims as { gtg?: string } | undefined)?.gtg,
        expiresOn: auth.expires_on,
      };
    }

    await saveLinkedCredentials(
      input.userId,
      this.platform,
      credentials.xuid,
      credentials.gamertag,
      credentials,
    );
  }

  async sync(userId: number): Promise<SyncSummary> {
    const linked = await getLinkedCredentials<XboxCredentials>(userId, "xbox");
    if (!linked) {
      throw new Error("Xbox account not linked");
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
      const { xuid, xstsToken } = linked.credentials;
      let continuationToken: string | undefined;
      const gameCache = new Map<string, number>();

      do {
        const page = await fetchXboxAchievements(
          xuid,
          xstsToken,
          continuationToken,
        );

        for (const ach of page.achievements) {
          const title = ach.titleAssociations?.[0];
          const titleId = title?.id ?? "unknown";
          const titleName = title?.name ?? "Unknown Xbox Title";

          let gameId = gameCache.get(titleId);
          if (!gameId) {
            gameId = await gameRepo.upsertGame({
              name: titleName,
              accountPlatform: "xbox",
              externalId: titleId,
            });
            gameCache.set(titleId, gameId);
            summary.gamesSynced += 1;
            await userGameRepo.upsertUserGame({ userId, gameId });
          }

          const gamerscore = ach.rewards?.find((r) => r.type === "Gamerscore");
          const imageUrl =
            ach.mediaAssets?.find((m) => m.type === "Icon")?.url ?? null;

          const achievementId = await achievementRepo.upsertAchievement({
            gameId,
            platform: "xbox",
            externalId: ach.id,
            name: ach.name,
            description: ach.description ?? ach.lockedDescription ?? null,
            imageUrl,
            achievementType: ach.progressionState ?? "achieved",
            points: gamerscore ? Number(gamerscore.value) : 0,
            metadata: {
              rarity: ach.rarity,
              progressionState: ach.progressionState,
            },
          });
          summary.achievementsSynced += 1;

          if (ach.progressionState === "Achieved" && ach.timeUnlocked) {
            await userAchievementRepo.upsertUserAchievement({
              userId,
              achievementId,
              dateEarned: new Date(ach.timeUnlocked),
            });
            summary.userAchievementsSynced += 1;
          }
        }

        continuationToken = page.pagingInfo?.continuationToken;
      } while (continuationToken);

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
