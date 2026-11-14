import { clientOnly } from "@solidjs/start";
import { Suspense } from "solid-js";
import { ProfileShell, ProfileSkeleton } from "~/components/me/ProfileShell";

// clientOnly — the profile reads this device's saved name, photo and flights
// (localStorage) and uses the file input + canvas for photo uploads. The
// server renders the same shell and skeleton the page shows while it loads.
const ProfilePage = clientOnly(() =>
  import("~/components/me/ProfilePage").then((m) => ({ default: m.ProfilePage })),
);

export default function MePage() {
  return (
    <Suspense>
      <ProfilePage
        fallback={
          <ProfileShell>
            <ProfileSkeleton />
          </ProfileShell>
        }
      />
    </Suspense>
  );
}
