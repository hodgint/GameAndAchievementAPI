import { randomUUID } from "node:crypto";
import type { AccountPlatform } from "../interfaces/db.interface.js";
import type { SyncSummary } from "../interfaces/platform-adapter.interface.js";
import { syncPlatform } from "./sync.service.js";

export type SyncJobStatus = "queued" | "running" | "success" | "error";

export interface SyncJob {
  id: string;
  userId: number;
  platform: AccountPlatform;
  status: SyncJobStatus;
  createdAt: Date;
  finishedAt?: Date;
  summary?: SyncSummary;
  error?: string;
}

const queue: SyncJob[] = [];
const jobsById = new Map<string, SyncJob>();
let processing = false;

function enqueue(job: SyncJob): void {
  queue.push(job);
  jobsById.set(job.id, job);
  void drainQueue();
}

async function drainQueue(): Promise<void> {
  if (processing) return;
  processing = true;
  while (queue.length > 0) {
    const job = queue.shift()!;
    job.status = "running";
    try {
      job.summary = await syncPlatform(job.userId, job.platform);
      job.status = "success";
    } catch (err) {
      job.status = "error";
      job.error = err instanceof Error ? err.message : String(err);
    }
    job.finishedAt = new Date();
  }
  processing = false;
}

export function startBackgroundSync(
  userId: number,
  platform: AccountPlatform,
): SyncJob {
  const job: SyncJob = {
    id: randomUUID(),
    userId,
    platform,
    status: "queued",
    createdAt: new Date(),
  };
  enqueue(job);
  return job;
}

export function getSyncJob(jobId: string): SyncJob | undefined {
  return jobsById.get(jobId);
}

export function listSyncJobsForUser(userId: number): SyncJob[] {
  return [...jobsById.values()]
    .filter((j) => j.userId === userId)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}
