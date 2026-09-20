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

export interface TripDay {
  date: string;        // "YYYY-MM-DD"
  label: string;       // "Thursday · Apr 8"
  status: DayStatus;
  activities: Activity[];
}
