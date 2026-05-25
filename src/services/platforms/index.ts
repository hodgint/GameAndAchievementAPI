import type { AccountPlatform } from "../../interfaces/db.interface.js";
import type { PlatformAdapter } from "../../interfaces/platform-adapter.interface.js";
import { PsnAdapter } from "./psn.adapter.js";
import { RetroAdapter } from "./retro.adapter.js";
import { SteamAdapter } from "./steam.adapter.js";
import { XboxAdapter } from "./xbox.adapter.js";

const adapters: Record<AccountPlatform, PlatformAdapter> = {
  retro: new RetroAdapter(),
  psn: new PsnAdapter(),
  steam: new SteamAdapter(),
  xbox: new XboxAdapter(),
};

export function getPlatformAdapter(platform: AccountPlatform): PlatformAdapter {
  const adapter = adapters[platform];
  if (!adapter) {
    throw new Error(`Unsupported platform: ${platform}`);
  }
  return adapter;
}

export { RetroAdapter, PsnAdapter, SteamAdapter, XboxAdapter };
