# ADR 0012 — Shared rides: cars sorted in Bach, booked through Uber and Lyft links

**Date:** 2026-11-17
**Status:** Proposed

## Context

The crew needs to get around Phoenix in groups: from the airport to the house, to dinner, and to and from golf. Someone has to work out how many cars to call and which type, who rides in which, who books each one, and who owes the booker money afterwards. The organiser wants that coordinated in Bach, with a way to call the car straight from the app in either Uber or Lyft.

Options for the booking itself:

- **Uber's and Lyft's ride-request APIs.** These would book the ride from inside Bach. Both are closed to new developers and need a partnership, and they also gate price estimates.
- **Uber for Business / Lyft Business.** These can book rides for other people through an API, but they need a business account billed per ride. That's far too much for a one-weekend trip.
- **Native ride intents.** iOS SiriKit ride intents (`INRequestRideIntent`) are provided by ride apps for Siri and Maps to call; another app can't invoke them. Bach is a website in any case.
- **Deep links.** `https://m.uber.com/ul/?action=setPickup&…` and `https://lyft.com/ride?id=…&pickup[…]&destination[…]` open the installed app (or its mobile site) with the trip filled in. The guest taps Request and pays in their own account. No keys or approval are needed.

Options for paying the booker back: send money through Bach (Stripe, like the pools in ADR 0010), connect to Splitwise's OAuth API, or just keep a tally in Bach and leave paying to whatever the group already uses.

## Decision

1. **Booking happens in the ride apps, through deep links.** Each car gets "Open in Uber" and "Open in Lyft" buttons. Uber's link can't pick the car type (its product ids are per city and need the API), so the page says which type to choose. Lyft's link does pick it: `lyft` or `lyft_plus` for XL.
2. **Places come from a fixed list** in `src/lib/ride-places.ts` with names, addresses and OpenStreetMap pins, so every link has a real pickup and drop-off. The house has no pin in the public repo. A ride from the house uses the phone's current location as the pickup.
3. **Rides live in Turso:** `rides`, `ride_riders` and `ride_bookings`. Any guest can add a ride, put anyone in it, choose its cars and move people between them, as on a group text. There's no admin (ADR 0009).
4. **Bach picks the cheapest mix of cars** (`src/lib/rides.ts`). A Standard car seats 4 and an XL seats 6. XL is estimated at 1.6× a Standard fare, which is a rough Phoenix figure, not a quote. Every mix where each car is needed is listed cheapest first; the group can pick another, and that choice holds while it still fits. Riders fill the emptiest car in the order they joined. Someone moved by hand stays in their car, and moving into a full car swaps with that car's newest rider.
5. **Booking a car fixes the group.** "I booked it" records the booker, the app used, and who is in that car at that moment. From then on the ride's riders and cars can't change until the booker gives the booking up. That way the fare always splits between the people who were actually in the car.
6. **Bach keeps the tab; Splitwise or Venmo moves the money.** The booker enters the fare. It splits evenly between the car's riders, with odd cents going to the first riders. Each other rider owes the booker their share. The booker, or that rider, ticks "Paid back". A Ride tab nets what's still owed between each pair of guests and copies a summary to paste into Splitwise.
7. **The page polls every 15 seconds while it's on screen**, like the chat (ADR 0011). Every change returns the whole list of rides.

## Consequences

- No new accounts, keys or partner approvals. If either app changes its link format, only `ride-places.ts` changes.
- Bach can't show live prices, wait times or driver status, and can't tell whether a car really was booked. Guests mark that themselves.
- Uber opens on the guest's last-used car type. The XL hint has to be read and followed.
- The 1.6× XL factor drives which mix is "cheapest". It's one constant in `CAR_KINDS` if real prices disagree.
- Pins for new places, and the house's pin, are edited by hand in `ride-places.ts`. Without the house's pin, Lyft opens without a destination for rides from the house.
- Money never passes through Bach for rides, so there are no card fees and nothing to reconcile in Stripe. "Paid back" is only as accurate as the people ticking it.
- Possible later additions, none of them built: suggesting airport groups from the flight board (arrivals within about 30 minutes of each other), creating rides from timeline activities, and Splitwise's API.
