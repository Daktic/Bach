import "server-only";
import type { TravelStatus } from "~/lib/types";

// Mock "Who's here" statuses until travel status is stored server-side (FL-8).
// Guests not listed default to "home". Matches the seed flights at
// ?mockDate=2027-04-08T14:00 (2 PM Arizona).
export const mockTravelStatus: Record<string, TravelStatus> = {
  chris: "arrived",  // landed 10:30
  andrew: "arrived",  // landed 11:50
  gberg: "plane",    // in the air until 15:45
  avery: "plane",     // in the air until 16:00
  brett: "car",       // heading to the airport, departs 14:25 Arizona
  jerid: "home",      // departs this evening
  phil: "home",
  kyle: "home",
  matt: "home",
  scott: "home",
};
