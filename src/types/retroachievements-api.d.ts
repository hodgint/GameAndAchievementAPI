declare module "@retroachievements/api" {
  export interface AuthObject {
    username: string;
    webApiKey: string;
  }

  export function buildAuthorization(config: {
    username: string;
    webApiKey: string;
  }): AuthObject;

  export function getUserProfile(
    authorization: AuthObject,
    payload: { username: string },
  ): Promise<unknown>;

  export function getGame(
    authorization: AuthObject,
    payload: { gameId: number },
  ): Promise<unknown>;

  export function getUserCompletedGames(
    authorization: AuthObject,
    payload: { username: string },
  ): Promise<
    Array<{
      gameId: number;
      title: string;
      imageIcon?: string;
      consoleName?: string;
      numAwarded?: number;
    }>
  >;

  export function getGameExtended(
    authorization: AuthObject,
    payload: { gameId: number },
  ): Promise<{
    id: number;
    title: string;
    genre?: string;
    publisher?: string;
    developer?: string;
    imageIcon?: string;
    achievements?: Record<
      string,
      {
        id: number;
        title: string;
        description: string;
        points: number;
        type?: string;
        badgeName: string;
        displayOrder?: number;
        trueRatio?: number;
        author?: string;
        numAwarded?: number;
      }
    >;
  }>;

  export function getAchievementsEarnedBetween(
    authorization: AuthObject,
    payload: { username: string; fromDate: Date; toDate: Date },
  ): Promise<
    Array<{
      date: string;
      achievementId: number;
      gameId: number;
    }>
  >;
}
