import { createAsync } from "@solidjs/router";
import { createSignal, ErrorBoundary, Show, Suspense } from "solid-js";
import { signOut } from "~/lib/client/sign-out";
import { meQuery } from "~/lib/queries";
import { FlightSection } from "./FlightSection";
import { ProfileCard } from "./ProfileCard";
import { ProfileShell, ProfileSkeleton } from "./ProfileShell";
import { ErrorNote, secondaryBtn } from "./ui";

// /me — the signed-in guest's profile and flights. Rendered client-only (see
// src/routes/me/index.tsx): it reads this device's saved name, photo and flights.

export function ProfilePage() {
  const me = createAsync(() => meQuery());

  return (
    <ProfileShell>
      <ErrorBoundary fallback={<LoadError />}>
        <Suspense fallback={<ProfileSkeleton />}>
          <Show when={me()}>
            {(guest) => (
              <>
                <ProfileCard me={guest()} />
                <FlightSection me={guest()} />
                <SignOut />
              </>
            )}
          </Show>
        </Suspense>
      </ErrorBoundary>
    </ProfileShell>
  );
}

function LoadError() {
  return (
    <div class="paper-card space-y-3 rounded-xl p-4">
      <ErrorNote>Couldn't load your profile. Check your connection and try again.</ErrorNote>
      <button type="button" class={`${secondaryBtn} w-full`} onClick={() => window.location.reload()}>
        Try again
      </button>
    </div>
  );
}

/**
 * AUTH-6. Back after signing out can restore /me from the bfcache with the
 * guest's name, email, photo and flights still on it; NavBar, which is on
 * this page too, reloads it then (see lib/client/sign-out.ts).
 */
function SignOut() {
  // Stays true once signOut() succeeds: it navigates away and never returns.
  const [pending, setPending] = createSignal(false);
  const [failed, setFailed] = createSignal(false);

  async function handleSignOut() {
    setPending(true);
    setFailed(false);
    try {
      await signOut(); // navigates away on success
    } catch {
      setPending(false);
      setFailed(true);
    }
  }

  return (
    <div class="space-y-2">
      <button type="button" onClick={handleSignOut} disabled={pending()} class={`${secondaryBtn} w-full`}>
        {pending() ? "Signing out…" : "Sign out"}
      </button>
      <Show when={failed()}>
        <ErrorNote>Couldn't sign out. Check your connection and try again.</ErrorNote>
      </Show>
    </div>
  );
}
