import type { StatusTransport, StatusUpdate, TravelStatus } from "./types";

// In-memory broadcast bus. Replace with SSETransport, PusherTransport, etc.
// when real-time infra is wired up. The interface is identical.
export class MockTransport implements StatusTransport {
  private listeners = new Set<(u: StatusUpdate) => void>();

  subscribe(onUpdate: (u: StatusUpdate) => void): () => void {
    this.listeners.add(onUpdate);
    return () => { this.listeners.delete(onUpdate); };
  }

  async publish(guestId: string, status: TravelStatus): Promise<void> {
    const update: StatusUpdate = { guestId, status };
    this.listeners.forEach(l => l(update));
  }
}
