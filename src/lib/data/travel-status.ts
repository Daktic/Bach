import "server-only";
import type { TravelStatus } from "~/lib/types";

// "Who's here" statuses the organiser sets, until travel status is stored
// server-side (FL-8). Guests not listed are "home"; nobody's travelling yet.
// Each guest can change their own status from the Who's here bar.
export const mockTravelStatus: Record<string, TravelStatus> = {};
