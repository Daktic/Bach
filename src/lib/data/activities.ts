import type { Activity } from "~/lib/types";

export const activityData: Activity[] = [
  // Thursday Apr 8 — Arrival
  {
    id: "thu-arrival",
    day: "2027-04-08",
    title: "Arrive & Check In",
    description: "Flights land, grab the keys to the Airbnb, and get settled in.",
    startTime: "15:00",
  },
  {
    id: "thu-welcome",
    day: "2027-04-08",
    title: "Welcome Drinks",
    description: "First round together. The trip starts here.",
    startTime: "19:00",
  },

  // Friday Apr 9
  {
    id: "fri-morning",
    day: "2027-04-09",
    title: "Morning Activity",
    description: "TBD — something to get the blood moving.",
    startTime: "09:00",
  },
  {
    id: "fri-afternoon",
    day: "2027-04-09",
    title: "Afternoon Plans",
    description: "TBD",
    startTime: "14:00",
  },
  {
    id: "fri-dinner",
    day: "2027-04-09",
    title: "Group Dinner",
    description: "TBD",
    startTime: "19:00",
  },

  // Saturday Apr 10
  {
    id: "sat-main",
    day: "2027-04-10",
    title: "Main Event",
    description: "The centerpiece of the trip. Details TBD.",
    startTime: "12:00",
  },
  {
    id: "sat-night",
    day: "2027-04-10",
    title: "Night Out",
    description: "TBD",
    startTime: "21:00",
  },

  // Sunday Apr 11
  {
    id: "sun-pool",
    day: "2027-04-11",
    title: "Recovery Day",
    description: "Pool, food, good vibes.",
    startTime: "10:00",
  },
  {
    id: "sun-dinner",
    day: "2027-04-11",
    title: "Last Supper",
    description: "Final group dinner before everyone heads home.",
    startTime: "19:00",
  },

  // Monday Apr 12 — Departure
  {
    id: "mon-checkout",
    day: "2027-04-12",
    title: "Check Out & Depart",
    description: "Pack up, clean up, say the goodbyes.",
    startTime: "11:00",
  },
];
