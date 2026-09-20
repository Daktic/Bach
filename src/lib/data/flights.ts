import type { GuestFlight, GuestWithoutFlight } from "~/lib/types";

// All times are local to the trip destination.
// mockDate=2027-04-08T14:00:00 gives a good spread of statuses for testing:
//   — Chris & Sarah: landed (arrived before 14:00)
//   — Jake: in the air (departed 12:30, arrives 16:00)
//   — Mike: boarding (departs 14:25)
//   — Ryan: upcoming (departs 18:45)

export const mockFlights: GuestFlight[] = [
  {
    id: "f1",
    guestName: "Chris",
    flightNumber: "AA 1105",
    airline: "American",
    origin: "JFK",
    destination: "PHX",
    departsAt: "2027-04-08T07:00:00",
    arrivesAt: "2027-04-08T10:30:00",
  },
  {
    id: "f2",
    guestName: "Sarah",
    flightNumber: "WN 4432",
    airline: "Southwest",
    origin: "MDW",
    destination: "PHX",
    departsAt: "2027-04-08T09:15:00",
    arrivesAt: "2027-04-08T11:50:00",
  },
  {
    id: "f3",
    guestName: "Jake",
    flightNumber: "DL 567",
    airline: "Delta",
    origin: "ATL",
    destination: "PHX",
    departsAt: "2027-04-08T12:30:00",
    arrivesAt: "2027-04-08T16:00:00",
  },
  {
    id: "f4",
    guestName: "Mike",
    flightNumber: "UA 892",
    airline: "United",
    origin: "ORD",
    destination: "PHX",
    departsAt: "2027-04-08T14:25:00",
    arrivesAt: "2027-04-08T17:10:00",
  },
  {
    id: "f5",
    guestName: "Ryan",
    flightNumber: "B6 214",
    airline: "JetBlue",
    origin: "BOS",
    destination: "PHX",
    departsAt: "2027-04-08T18:45:00",
    arrivesAt: "2027-04-08T22:30:00",
  },
];

export const mockGuestsWithoutFlight: GuestWithoutFlight[] = [
  { id: "g1", guestName: "Tom" },
];
