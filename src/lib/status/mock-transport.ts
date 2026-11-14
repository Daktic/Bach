import type { StatusTransport, StatusUpdate, TravelStatus } from "./types";

const STATUSES: ReadonlySet<string> = new Set<TravelStatus>(["home", "car", "plane", "arrived"]);

type StatusStorage = Pick<Storage, "getItem" | "setItem">;

export interface MockTransportOptions {
  /** Remember published statuses in this browser under this key. */
  storageKey?: string;
  /** Defaults to localStorage; injectable for tests. */
  storage?: StatusStorage;
}

// In-browser broadcast bus for "Who's here". Nothing leaves this device, so
// other guests don't see a change until this is swapped for a server-backed
// transport (SSE, polling…) with the same StatusTransport interface (FL-8).
//
// With `storageKey`, published statuses are saved in localStorage and replayed
// to each new subscriber, so a guest's own status survives a reload.
export class MockTransport implements StatusTransport {
  private listeners = new Set<(u: StatusUpdate) => void>();

  constructor(private readonly options: MockTransportOptions = {}) {}

  subscribe(onUpdate: (u: StatusUpdate) => void): () => void {
    this.listeners.add(onUpdate);
    for (const [guestId, status] of Object.entries(this.load())) onUpdate({ guestId, status });
    return () => { this.listeners.delete(onUpdate); };
  }

  async publish(guestId: string, status: TravelStatus): Promise<void> {
    this.save(guestId, status);
    const update: StatusUpdate = { guestId, status };
    this.listeners.forEach(l => l(update));
  }

  private storage(): StatusStorage | null {
    if (!this.options.storageKey) return null;
    if (this.options.storage) return this.options.storage;
    try {
      return typeof localStorage === "undefined" ? null : localStorage;
    } catch {
      return null; // site data blocked
    }
  }

  private load(): Record<string, TravelStatus> {
    const storage = this.storage();
    if (!storage) return {};
    try {
      const parsed: unknown = JSON.parse(storage.getItem(this.options.storageKey!) ?? "{}");
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
      return Object.fromEntries(
        Object.entries(parsed).filter(
          (entry): entry is [string, TravelStatus] => typeof entry[1] === "string" && STATUSES.has(entry[1]),
        ),
      );
    } catch {
      return {};
    }
  }

  private save(guestId: string, status: TravelStatus): void {
    const storage = this.storage();
    if (!storage) return;
    try {
      storage.setItem(this.options.storageKey!, JSON.stringify({ ...this.load(), [guestId]: status }));
    } catch {
      // Storage full or blocked: the status just isn't remembered.
    }
  }
}
