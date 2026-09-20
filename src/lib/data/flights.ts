import type { GuestFlight, GuestWithoutFlight } from "~/lib/types";

// All times are local to the trip destination (MST / Phoenix, no DST).
// mockDate=2027-04-08T14:00:00 gives a good spread of statuses:
//   — Chris & Sarah: landed      (arrived before 14:00)
//   — Garrett:       in the air  (departed 13:30, arrives 15:45 → 33% progress)
//   — Jake:          in the air  (departed 12:30, arrives 16:00)
//   — Mike:          boarding    (departs 14:25)
//   — Ryan:          upcoming    (departs 18:45)

export const mockFlights: GuestFlight[] = [
  {
    id: "f1",
    guestId: "chris",
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
    guestId: "sarah",
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
    guestId: "gberg",
    guestName: "Garrett",
    flightNumber: "AA 321",
    airline: "American",
    origin: "LAX",
    destination: "PHX",
    departsAt: "2027-04-08T13:30:00",
    arrivesAt: "2027-04-08T15:45:00",
  },
  {
    id: "f4",
    guestId: "jake",
    guestName: "Jake",
    flightNumber: "DL 567",
    airline: "Delta",
    origin: "ATL",
    destination: "PHX",
    departsAt: "2027-04-08T12:30:00",
    arrivesAt: "2027-04-08T16:00:00",
  },
  {
    id: "f5",
    guestId: "mike",
    guestName: "Mike",
    flightNumber: "UA 892",
    airline: "United",
    origin: "ORD",
    destination: "PHX",
    departsAt: "2027-04-08T14:25:00",
    arrivesAt: "2027-04-08T17:10:00",
  },
  {
    id: "f6",
    guestId: "ryan",
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
  { id: "tom",   guestName: "Tom"    },
  { id: "alex",  guestName: "Alex"   },
  { id: "jordan",guestName: "Jordan" },
  { id: "tyler", guestName: "Tyler"  },
];
