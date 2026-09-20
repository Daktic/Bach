import { clientOnly } from "@solidjs/start";
import { Suspense } from "solid-js";

const CrewStatusBar = clientOnly(() =>
  import("~/components/crew/CrewStatusBar").then(m => ({ default: m.CrewStatusBar }))
);

const FlightTracker = clientOnly(() =>
  import("~/components/flights/FlightTracker").then(m => ({ default: m.FlightTracker }))
);

export default function FlightsPage() {
  return (
    <>
      <Suspense>
        <CrewStatusBar />
      </Suspense>
      <Suspense fallback={<div class="p-8 text-center text-sm text-charcoal/40">Loading flights…</div>}>
        <FlightTracker />
      </Suspense>
    </>
  );
}
