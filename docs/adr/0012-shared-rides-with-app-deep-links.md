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
2. **A ride is a destination, not a trip.** Bach organises the cars; the pickup is wherever the booker's phone is when they tap. Uber's link says `pickup=my_location` and works it out itself. Lyft's link needs coordinates to take a destination at all, so the Rides page asks for the phone's position while it's open (`src/lib/client/position.ts`) and builds the link from it; if location is refused, Lyft opens on the car type alone and the page says so. Destinations are searched through OpenStreetMap's Nominatim from a server function (`src/lib/server/places.ts`: results cached an hour, a per-guest budget, and upstream calls spaced a second apart, as its usage policy asks), with the itinerary's spots offered before anyone types (`suggestedDestinations` in `src/lib/ride-places.ts`). Nothing but a name, an address line and a pin is stored. A time is optional: most rides are "we're leaving now".
3. **Rides live in Turso:** `rides`, `ride_cars`, `ride_riders` and `ride_bookings`. Any guest can add a ride, add or remove its cars, and seat anyone, as on a group text. There's no admin (ADR 0009).
4. **The crew fills the cars by hand, seat by seat.** Each car is drawn from above with a driver and its seats: 4 in a Standard (UberX, Lyft), 6 in an XL (UberXL, Lyft XL). People with no seat sit on a bench above the cars. Someone gets into a seat by being dragged there, by being tapped on the bench and then a seat tapped, or by tapping the seat and picking a name. Putting someone in a taken seat swaps the two. A long press on a car (or a tap on its size badge) switches it between Standard and XL; going down to a Standard drops whoever sat in seats 5 and 6 back to the bench. "Auto-arrange" re-sorts the people in the unbooked cars into the cheapest mix (`bestPlan` in `src/lib/rides.ts`: XL counted at 1.6× a Standard fare, a rough Phoenix figure), spread evenly, as a starting point the group can then move around.
5. **Booking a car fixes that car.** "I booked it" records the booker, the app used, and who is in that car at that moment. From then on nobody gets in or out of it and its size can't change until the booker gives the booking up, so the fare always splits between the people who were actually in the car. The ride's other cars stay open.
6. **Bach keeps the tab; Splitwise or Venmo moves the money.** The booker enters the fare. It splits evenly between the car's riders, with odd cents going to the first riders. Each other rider owes the booker their share. The booker, or that rider, ticks "Paid back". A Ride tab nets what's still owed between each pair of guests and copies a summary to paste into Splitwise.
7. **The page polls every 15 seconds while it's on screen**, like the chat (ADR 0011). Every change returns the whole list of rides.

## Consequences

- No new accounts, keys or partner approvals. If either app changes its link format, only `ride-places.ts` changes. Nominatim is free but asks for restraint; if the group ever outgrows it, the search function is the one place to swap in a paid geocoder.
- Bach can't show live prices, wait times or driver status, and can't tell whether a car really was booked. Guests mark that themselves.
- Uber opens on the guest's last-used car type. The XL hint has to be read and followed.
- The 1.6× XL factor only drives the "Auto-arrange" suggestion. It's one constant in `CAR_KINDS` if real prices disagree.
- Drag-and-drop is built on pointer events with the chips set to `touch-action: none`, so a finger on a chip drags instead of scrolling the page; the page scrolls from anywhere else. Every seat is also a button, so the picker covers keyboards and screen readers.
- The suggested spots are edited by hand in `ride-places.ts`; anything else is searched on the day. The house isn't suggested (the repo is public), so someone searches its address once and the ride keeps it.
- Lyft only gets the destination from a phone that has shared its location with Bach. Uber doesn't need it.
- Money never passes through Bach for rides, so there are no card fees and nothing to reconcile in Stripe. "Paid back" is only as accurate as the people ticking it.
- Possible later additions, none of them built: suggesting airport groups from the flight board (arrivals within about 30 minutes of each other), creating rides from timeline activities, and Splitwise's API.
