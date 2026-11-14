import "server-only";
import type { FlightDirection, FlightLeg } from "~/lib/types";

// Mock flights until guests' entries are stored server-side (FL-2).
//
// Times are each airport's local wall time with its UTC offset, as real flight
// data gives them: departures in the origin's zone, arrivals in PHX time
// (-07:00, Arizona doesn't observe DST). In April the East Coast is on EDT
// (-04:00), Chicago on CDT (-05:00) and LA on PDT (-07:00).
//
// ?mockDate=2027-04-08T14:00 (2 PM Arizona) gives a good spread of statuses:
//   — Chris & Andrew: landed      (arrived before 14:00 Arizona)
//   — Garrett:       in the air  (departed 13:30, arrives 15:45 → 33% progress)
//   — Avery:          in the air  (departed 12:30 Arizona, arrives 16:00)
//   — Brett:          boarding    (departs 14:25 Arizona)
//   — Jerid:          upcoming    (departs 18:45 Arizona)

export interface SeedFlight extends FlightLeg {
  id: string;
  guestId: string;
  direction: FlightDirection;
}

export const seedFlights: SeedFlight[] = [
  {
    id: "f1",
    guestId: "chris",
    direction: "in",
    flightNumber: "AA 1105",
    airline: "American",
    origin: "JFK",
    destination: "PHX",
    departsAt: "2027-04-08T10:00:00-04:00",
    arrivesAt: "2027-04-08T10:30:00-07:00",
  },
  {
    id: "f2",
    guestId: "andrew",
    direction: "in",
    flightNumber: "WN 4432",
    airline: "Southwest",
    origin: "MDW",
    destination: "PHX",
    departsAt: "2027-04-08T11:15:00-05:00",
    arrivesAt: "2027-04-08T11:50:00-07:00",
  },
  {
    id: "f3",
    guestId: "gberg",
    direction: "in",
    flightNumber: "AA 321",
    airline: "American",
    origin: "LAX",
    destination: "PHX",
    departsAt: "2027-04-08T13:30:00-07:00",
    arrivesAt: "2027-04-08T15:45:00-07:00",
  },
  {
    id: "f4",
    guestId: "avery",
    direction: "in",
    flightNumber: "DL 567",
    airline: "Delta",
    origin: "ATL",
    destination: "PHX",
    departsAt: "2027-04-08T15:30:00-04:00",
    arrivesAt: "2027-04-08T16:00:00-07:00",
  },
  {
    id: "f5",
    guestId: "brett",
    direction: "in",
    flightNumber: "UA 892",
    airline: "United",
    origin: "ORD",
    destination: "PHX",
    departsAt: "2027-04-08T16:25:00-05:00",
    arrivesAt: "2027-04-08T17:10:00-07:00",
  },
  {
    id: "f6",
    guestId: "jerid",
    direction: "in",
    flightNumber: "B6 214",
    airline: "JetBlue",
    origin: "BOS",
    destination: "PHX",
    departsAt: "2027-04-08T21:45:00-04:00",
    arrivesAt: "2027-04-08T22:30:00-07:00",
  },
];
