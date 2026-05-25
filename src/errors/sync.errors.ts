import type { SyncStateData } from "../interfaces/db.interface.js";

export class SyncConflictError extends Error {
  constructor(
    message: string,
    public readonly syncState: SyncStateData | null,
  ) {
    super(message);
    this.name = "SyncConflictError";
  }
}

export class AccountNotLinkedError extends Error {
  constructor(public readonly platform: string) {
    super(`${platform} account not linked`);
    this.name = "AccountNotLinkedError";
  }
}
