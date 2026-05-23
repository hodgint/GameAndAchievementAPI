import {
  exchangeAccessCodeForAuthTokens,
  exchangeNpssoForAccessCode,
  exchangeRefreshTokenForAuthTokens,
  getTitleTrophies,
  getUserTitles,
  getUserTrophiesEarnedForTitle,
} from "psn-api";
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
import { playstation } from "../../config/defaults.js";
import {
  getLinkedCredentials,
  saveLinkedCredentials,
} from "../linked-account.service.js";

type PsnCredentials = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  accountId: string;
};

async function getAuthorization(
  userId: number,
): Promise<{ authorization: { accessToken: string }; accountId: string; credentials: PsnCredentials }> {
  const linked = await getLinkedCredentials<PsnCredentials>(userId, "psn");
  if (!linked) {
    throw new Error("PlayStation account not linked");
  }

  let { accessToken, refreshToken, expiresAt } = linked.credentials;
  if (Date.now() >= expiresAt - 60_000) {
    const refreshed = await exchangeRefreshTokenForAuthTokens(refreshToken);
    accessToken = refreshed.accessToken;
    refreshToken = refreshed.refreshToken;
    expiresAt = Date.now() + refreshed.expiresIn * 1000;
    await saveLinkedCredentials(
      userId,
      "psn",
      linked.externalUserId,
      linked.externalUsername ?? undefined,
      {
        accessToken,
        refreshToken,
        expiresAt,
        accountId: linked.credentials.accountId,
      },
    );
  }

  return {
    authorization: { accessToken },
    accountId: linked.credentials.accountId,
    credentials: { ...linked.credentials, accessToken, refreshToken, expiresAt },
  };
}

export class PsnAdapter implements PlatformAdapter {
  readonly platform: AccountPlatform = "psn";

  async linkAccount(input: LinkAccountInput): Promise<void> {
    const npsso =
      (input.credentials.npsso as string | undefined) ?? playstation.npsso;
    if (!npsso) {
      throw new Error("npsso token is required to link PlayStation account");
    }

    const accessCode = await exchangeNpssoForAccessCode(npsso);
    const tokens = await exchangeAccessCodeForAuthTokens(accessCode);
    const accountId =
      (input.credentials.accountId as string | undefined) ??
      playstation.accountID ??
      "me";

    await saveLinkedCredentials(
      input.userId,
      this.platform,
      accountId,
      input.externalUsername,
      {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: Date.now() + tokens.expiresIn * 1000,
        accountId,
      },
    );
  }

  async sync(userId: number): Promise<SyncSummary> {
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
      const { authorization, accountId } = await getAuthorization(userId);
      let offset = 0;
      const limit = 100;
      let hasMore = true;

      while (hasMore) {
        const titles = await getUserTitles(authorization, accountId, {
          limit,
          offset,
        });

        for (const title of titles.trophyTitles) {
          const npCommunicationId = title.npCommunicationId;
          const gameId = await gameRepo.upsertGame({
            name: title.trophyTitleName,
            accountPlatform: "psn",
            externalId: npCommunicationId,
            imageUrl: title.trophyTitleIconUrl ?? null,
          });
          summary.gamesSynced += 1;

          await userGameRepo.upsertUserGame({ userId, gameId });

          const [catalog, earned] = await Promise.all([
            getTitleTrophies(authorization, npCommunicationId, "all", {
              npServiceName: title.npServiceName,
            }),
            getUserTrophiesEarnedForTitle(
              authorization,
              accountId,
              npCommunicationId,
              "all",
              { npServiceName: title.npServiceName },
            ),
          ]);

          const earnedMap = new Map(
            earned.trophies
              .filter((t) => t.earned)
              .map((t) => [t.trophyId, t.earnedDateTime]),
          );

          for (const trophy of catalog.trophies) {
            const achievementId = await achievementRepo.upsertAchievement({
              gameId,
              platform: "psn",
              externalId: String(trophy.trophyId),
              name: trophy.trophyName ?? "Unknown Trophy",
              description: trophy.trophyDetail ?? null,
              imageUrl: trophy.trophyIconUrl ?? null,
              achievementType: trophy.trophyType ?? null,
              points: 0,
              sortOrder: trophy.trophyId,
              metadata: {
                trophyType: trophy.trophyType,
                trophyHidden: trophy.trophyHidden,
                trophyGroupId: trophy.trophyGroupId,
              },
            });
            summary.achievementsSynced += 1;

            const earnedAt = earnedMap.get(trophy.trophyId);
            if (earnedAt) {
              await userAchievementRepo.upsertUserAchievement({
                userId,
                achievementId,
                dateEarned: new Date(earnedAt),
              });
              summary.userAchievementsSynced += 1;
            }
          }
        }

        offset += titles.trophyTitles.length;
        hasMore = titles.trophyTitles.length === limit;
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
