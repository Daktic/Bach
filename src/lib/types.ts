export interface Activity {
  id: string;
  day: string;         // "YYYY-MM-DD"
  title: string;
  description: string;
  image?: string;      // path relative to /public
  startTime?: string;  // "HH:MM" 24h
  endTime?: string;
  location?: string;
  details?: string;    // extended prose for the dialog
}

export type DayStatus = "past" | "current" | "future";

// ─── Flights ──────────────────────────────────────────────────────────────────

export type FlightStatus = "upcoming" | "boarding" | "in_air" | "landed" | "delayed";

export interface GuestFlight {
  id: string;
  guestId: string;      // matches CrewMember.id — links flight to identity
  guestName: string;
  flightNumber: string;
  airline: string;
  origin: string;       // IATA code e.g. "JFK"
  destination: string;  // IATA code e.g. "PHX"
  departsAt: string;    // ISO local datetime "2027-04-08T09:00:00"
  arrivesAt: string;    // ISO local datetime "2027-04-08T13:45:00"
}

export interface GuestFlightWithStatus extends GuestFlight {
  status: FlightStatus;
  progressFraction: number;    // 0–1, meaningful only for in_air
  minutesUntilArrival: number; // negative once landed
}

export interface GuestWithoutFlight {
  id: string;
  guestName: string;
}

export interface TripDay {
  date: string;        // "YYYY-MM-DD"
  label: string;       // "Thursday · Apr 8"
  status: DayStatus;
  activities: Activity[];
}
