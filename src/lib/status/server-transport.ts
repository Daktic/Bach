import { getCrewStatuses, setMyStatus } from "~/lib/api/travel";
import type { StatusTransport, StatusUpdate, TravelStatus } from "./types";

// "Who's here" over the database (FL-8, ADR 0007): publishing saves the
// signed-in guest's status, and subscribers poll everyone's statuses every
// 30 seconds and whenever the page comes back into view. Polling is plenty
// for ten people.

const POLL_MS = 30_000;

export class ServerTransport implements StatusTransport {
  private listeners = new Set<(u: StatusUpdate) => void>();
  private timer: ReturnType<typeof setInterval> | undefined;
  private onVisible = () => {
    if (document.visibilityState === "visible") void this.poll();
  };

  subscribe(onUpdate: (u: StatusUpdate) => void): () => void {
    this.listeners.add(onUpdate);
    if (this.listeners.size === 1) this.start();
    else void this.poll();
    return () => {
      this.listeners.delete(onUpdate);
      if (this.listeners.size === 0) this.stop();
    };
  }

  async publish(guestId: string, status: TravelStatus): Promise<void> {
    // Show it straight away; the server uses the signed-in guest, not guestId.
    this.emit({ guestId, status });
    try {
      await setMyStatus(status);
    } finally {
      void this.poll(); // reconcile with what was actually stored
    }
  }

  private emit(update: StatusUpdate) {
    this.listeners.forEach((l) => l(update));
  }

  private async poll() {
    try {
      const statuses = await getCrewStatuses();
      for (const [guestId, status] of Object.entries(statuses)) this.emit({ guestId, status });
    } catch {
      // Offline or signed out: keep showing the last known statuses.
    }
  }

  private start() {
    if (typeof window === "undefined") return;
    void this.poll();
    this.timer = setInterval(() => void this.poll(), POLL_MS);
    document.addEventListener("visibilitychange", this.onVisible);
  }

  private stop() {
    clearInterval(this.timer);
    if (typeof document !== "undefined") document.removeEventListener("visibilitychange", this.onVisible);
  }
}
