export type TravelStatus = "home" | "car" | "plane" | "arrived";

export interface StatusUpdate {
  guestId: string;
  status: TravelStatus;
}

// Swap this interface for SSETransport, PusherTransport, AblyTransport, etc.
export interface StatusTransport {
  subscribe(onUpdate: (update: StatusUpdate) => void): () => void;
  publish(guestId: string, status: TravelStatus): Promise<void>;
}
