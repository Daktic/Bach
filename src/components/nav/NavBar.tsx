import { A, createAsync, useLocation } from "@solidjs/router";
import {
  createEffect,
  createSignal,
  ErrorBoundary,
  For,
  on,
  onCleanup,
  onMount,
  Show,
  Suspense,
  type JSX,
} from "solid-js";
import { usePulse } from "~/lib/client/pulse";
import { loadMyProfile, onMyProfileChange, type MyProfile } from "~/lib/client/my-profile";
import { signOut, signOutStarted } from "~/lib/client/sign-out";
import { meQuery } from "~/lib/queries";
import type { Me } from "~/lib/types";

// ─── Icons ────────────────────────────────────────────────────────────────────

function TimelineIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5 shrink-0" aria-hidden="true">
      <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z" />
    </svg>
  );
}

function FlightsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5 shrink-0 rotate-90" aria-hidden="true">
      <path d="M21 16v-2l-8-5V3.5A1.5 1.5 0 0 0 11.5 2 1.5 1.5 0 0 0 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5 shrink-0" aria-hidden="true">
      <path d="M21 6h-2v9H6v2c0 .55.45 1 1 1h11l4 4V7c0-.55-.45-1-1-1zm-4 6V3c0-.55-.45-1-1-1H3c-.55 0-1 .45-1 1v14l4-4h10c.55 0 1-.45 1-1z" />
    </svg>
  );
}

function RidesIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5 shrink-0" aria-hidden="true">
      <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z" />
    </svg>
  );
}

function FundsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5 shrink-0" aria-hidden="true">
      <path d="M21 18v1c0 1.1-.9 2-2 2H5c-1.11 0-2-.9-2-2V5c0-1.1.89-2 2-2h14c1.1 0 2 .9 2 2v1h-9c-1.11 0-2 .9-2 2v8c0 1.1.89 2 2 2h9zm-9-2h10V8H12v8zm4-2.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" />
    </svg>
  );
}

function MeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5 shrink-0" aria-hidden="true">
      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
    </svg>
  );
}

function SignOutIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5 shrink-0" aria-hidden="true">
      <path d="M10.09 15.59 11.5 17l5-5-5-5-1.41 1.41L12.67 11H3v2h9.67l-2.58 2.59zM19 3H5c-1.11 0-2 .9-2 2v4h2V5h14v14H5v-4H3v4c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z" />
    </svg>
  );
}

function HamburgerIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6" aria-hidden="true">
      <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5" aria-hidden="true">
      <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
    </svg>
  );
}

// ─── Nav items ────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { href: "/",        label: "Timeline", icon: TimelineIcon },
  { href: "/flights", label: "Flights",  icon: FlightsIcon  },
  { href: "/rides",   label: "Rides",    icon: RidesIcon    },
  { href: "/chat",    label: "Chat",     icon: ChatIcon     },
  { href: "/funds",   label: "Funds",    icon: FundsIcon    },
  { href: "/me",      label: "Me",       icon: MeIcon       },
] as const;

const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-charcoal";

/** "3", or "99+". Charcoal with cream text: orange is too light for small text. */
function UnreadBadge(props: { count: number; class?: string }) {
  return (
    <span
      aria-hidden="true"
      class={`inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-charcoal px-1.5
              text-[11px] font-black leading-none text-cream ${props.class ?? ""}`}
    >
      {props.count > 99 ? "99+" : props.count}
    </span>
  );
}

const unreadLabel = (count: number) => `${count} unread ${count === 1 ? "message" : "messages"}`;

function NavItem(props: {
  href: string;
  label: string;
  Icon: () => JSX.Element;
  onNavigate: () => void;
  /** Unread messages, shown as a count after the label. */
  unread?: number;
}) {
  const location = useLocation();
  const isActive = () =>
    props.href === "/"
      ? location.pathname === "/"
      : location.pathname.startsWith(props.href);

  // Teal is too light to mark the current page on its own, so the label goes
  // heavier; the tint and the bar keep the brand colour.
  return (
    <A
      href={props.href}
      end={props.href === "/"}
      onClick={props.onNavigate}
      class={`relative flex min-h-11 items-center gap-3 px-4 py-3.5 rounded-xl text-sm
              transition-colors duration-150 ${focusRing}
              ${isActive()
                ? "bg-teal/15 font-black text-charcoal"
                : "font-semibold text-charcoal/75 hover:bg-charcoal/5 hover:text-charcoal"
              }`}
    >
      <Show when={isActive()}>
        <span class="absolute inset-y-3 left-0 w-1 rounded-full bg-teal" aria-hidden="true" />
      </Show>
      <props.Icon />
      {props.label}
      <Show when={props.unread}>
        {(count) => (
          <>
            <UnreadBadge count={count()} class="ml-auto" />
            <span class="sr-only">, {unreadLabel(count())}</span>
          </>
        )}
      </Show>
    </A>
  );
}

// ─── Signed-in guest (drawer footer) ──────────────────────────────────────────

function Avatar(props: { src: string | null; initials: string }) {
  // The photo renders only after mount, so it never loads during SSR and
  // onError is attached before it can fail. Until then (and if it fails)
  // the initials show, as they do for Apple accounts, which have no photo.
  const [mounted, setMounted] = createSignal(false);
  const [failedSrc, setFailedSrc] = createSignal<string | null>(null);
  onMount(() => setMounted(true));
  const photo = () => (mounted() && props.src && props.src !== failedSrc() ? props.src : null);

  return (
    <div
      class="w-10 h-10 shrink-0 rounded-full paper-card ring-2 ring-charcoal/10
             overflow-hidden flex items-center justify-center"
    >
      <Show
        when={photo()}
        fallback={
          <span class="text-xs font-bold text-charcoal/75 select-none">{props.initials}</span>
        }
      >
        {(src) => (
          <img
            src={src()}
            alt=""
            referrerpolicy="no-referrer"
            class="w-full h-full object-cover"
            onError={(e) => setFailedSrc(e.currentTarget.getAttribute("src"))}
          />
        )}
      </Show>
    </div>
  );
}

function GuestBadge(props: { me: Me; drawerOpen: boolean }) {
  // Name/photo edits from /me are kept in this browser for now (ME-2). Re-read
  // them whenever the drawer opens so changes show without a reload.
  const [local, setLocal] = createSignal<MyProfile>({});
  createEffect(() => {
    if (!props.drawerOpen) return;
    const id = props.me.id;
    const apply = () => setLocal(loadMyProfile(id));
    apply();
    onCleanup(onMyProfileChange(id, apply));
  });

  return (
    <div class="flex items-center gap-3 px-4 py-2">
      <Avatar src={local().avatarDataUrl ?? props.me.image} initials={props.me.initials} />
      <div class="min-w-0">
        <p class="truncate text-sm font-black text-charcoal">{local().name ?? props.me.name}</p>
        <Show when={props.me.email}>
          {(email) => <p class="truncate text-xs text-charcoal/75">{email()}</p>}
        </Show>
      </div>
    </div>
  );
}

function GuestSkeleton() {
  return (
    <div class="flex items-center gap-3 px-4 py-2" aria-hidden="true">
      <div class="w-10 h-10 shrink-0 rounded-full bg-charcoal/10" />
      <div class="space-y-1.5">
        <div class="h-3 w-20 rounded bg-charcoal/10" />
        <div class="h-2.5 w-32 rounded bg-charcoal/10" />
      </div>
    </div>
  );
}

// ─── NavBar ──────────────────────────────────────────────────────────────────

export function NavBar() {
  const location = useLocation();
  const me = createAsync(() => meQuery());
  // Keeps the app's check-in running on every page: presence and the chat badge.
  const { unread } = usePulse();
  // On /chat the messages are on screen, so there's nothing to flag.
  const unreadShown = () => (location.pathname.startsWith("/chat") ? 0 : unread());
  const [open, setOpen] = createSignal(false);
  const [signingOut, setSigningOut] = createSignal(false);
  const [signOutFailed, setSignOutFailed] = createSignal(false);
  let menuButton: HTMLButtonElement | undefined;
  let closeButton: HTMLButtonElement | undefined;
  let drawer: HTMLDivElement | undefined;

  function openDrawer() {
    setOpen(true);
    closeButton?.focus({ preventScroll: true });
  }

  function close() {
    if (!open()) return;
    const focusWasInside = !!drawer?.contains(document.activeElement);
    setOpen(false);
    // The drawer is now inert, so hand focus back to the hamburger. When a
    // link closed it, AppShell then moves focus on to the new page's <h1>.
    if (focusWasInside) menuButton?.focus({ preventScroll: true });
  }

  // The open drawer is modal: Tab and Shift+Tab wrap around inside it.
  function keepFocusInside(e: KeyboardEvent) {
    if (e.key !== "Tab" || !drawer) return;
    const items = drawer.querySelectorAll<HTMLElement>("a[href], button:not(:disabled)");
    const first = items[0];
    const last = items[items.length - 1];
    if (!first || !last) return;
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  // AUTH-6: ends the Auth.js session and lands on /sign-in.
  async function handleSignOut() {
    if (signingOut()) return;
    setSigningOut(true);
    setSignOutFailed(false);
    try {
      await signOut(); // navigates away on success; stays "Signing out…"
    } catch (err) {
      console.error("[nav] sign-out failed", err);
      setSigningOut(false);
      setSignOutFailed(true);
    }
  }

  // Close when the route changes another way too (e.g. the Back button).
  createEffect(on(() => location.pathname, () => close(), { defer: true }));

  onMount(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open()) {
        e.preventDefault();
        close();
      }
    };
    // Back after signing out, from this drawer or from /me, can restore this
    // page from the bfcache with trip data still on it; reload so the
    // middleware sends it to /sign-in. NavBar is on every page but /sign-in,
    // so this covers both sign-out buttons.
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted && signOutStarted()) window.location.reload();
    };
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("pageshow", onPageShow);
    onCleanup(() => {
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("pageshow", onPageShow);
    });
  });

  return (
    <>
      {/* Top header bar */}
      <header class="fixed top-0 inset-x-0 z-30 h-14 paper-surface
                     border-b border-charcoal/10
                     flex items-center px-4">
        {/* Hamburger */}
        <button
          ref={menuButton}
          type="button"
          onClick={openDrawer}
          aria-label="Open menu"
          aria-haspopup="dialog"
          aria-expanded={open()}
          aria-controls="nav-drawer"
          class={`w-11 h-11 flex items-center justify-center rounded-lg
                  text-charcoal/75 hover:text-charcoal hover:bg-charcoal/6
                  active:scale-95 transition-all ${focusRing}`}
        >
          <HamburgerIcon />
        </button>

        {/* Wordmark */}
        <span class="flex-1 text-center text-lg font-black tracking-tight text-charcoal">
          Bach
        </span>

        {/* Chat shortcut, with the unread count (also balances the hamburger) */}
        <A
          href="/chat"
          aria-label={unreadShown() > 0 ? `Chat, ${unreadLabel(unreadShown())}` : "Chat"}
          class={`relative w-11 h-11 flex items-center justify-center rounded-lg
                  text-charcoal/75 hover:text-charcoal hover:bg-charcoal/6
                  active:scale-95 transition-all ${focusRing}`}
          activeClass="text-charcoal"
        >
          <ChatIcon />
          <Show when={unreadShown() > 0}>
            <UnreadBadge count={unreadShown()} class="absolute right-0.5 top-0.5 ring-2 ring-cream" />
          </Show>
        </A>
      </header>

      {/* Backdrop */}
      <div
        class={`fixed inset-0 z-40 bg-charcoal/50 backdrop-blur-sm
                transition-opacity duration-300 motion-reduce:transition-none
                ${open() ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={close}
        aria-hidden="true"
      />

      {/* Drawer panel. Closed, it is inert at once and hidden after sliding
          out (visibility only transitions on the way out), so nothing in it
          can be tabbed to or read out. Nothing inside may transition
          `visibility` (e.g. transition-all): it would fade in from hidden and
          the close button couldn't take focus on open. */}
      <div
        ref={drawer}
        id="nav-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Navigation"
        inert={!open()}
        onKeyDown={keepFocusInside}
        class={`fixed top-0 left-0 bottom-0 z-50 w-72 max-w-[85vw]
                paper-panel flex flex-col
                border-r border-charcoal/10
                shadow-xl
                duration-300 ease-in-out motion-reduce:transition-none
                ${open()
                  ? "translate-x-0 visible transition-transform"
                  : "-translate-x-full invisible transition-[translate,visibility]"}`}
      >
        {/* Drawer header */}
        <div class="h-14 flex items-center justify-between px-4 border-b border-charcoal/10 shrink-0">
          <span class="text-lg font-black tracking-tight text-charcoal">Bach</span>
          <button
            ref={closeButton}
            type="button"
            onClick={close}
            aria-label="Close menu"
            class={`w-11 h-11 flex items-center justify-center rounded-lg
                    text-charcoal/75 hover:text-charcoal hover:bg-charcoal/6
                    active:scale-95 transition-[color,background-color,scale] ${focusRing}`}
          >
            <CloseIcon />
          </button>
        </div>

        {/* Nav links */}
        <nav class="flex-1 overflow-y-auto p-3 space-y-1" aria-label="Main">
          <For each={NAV_ITEMS}>
            {(item) => (
              <NavItem
                href={item.href}
                label={item.label}
                Icon={item.icon}
                onNavigate={close}
                unread={item.href === "/chat" ? unreadShown() : undefined}
              />
            )}
          </For>
        </nav>

        {/* Drawer footer — who's signed in, and sign out (NAV-2) */}
        <div class="shrink-0 p-3 border-t border-charcoal/10 space-y-1">
          <ErrorBoundary
            fallback={(err) => {
              console.error("[nav] could not load the signed-in guest", err);
              return null;
            }}
          >
            <Suspense fallback={<GuestSkeleton />}>
              <Show when={me()}>
                {(guest) => <GuestBadge me={guest()} drawerOpen={open()} />}
              </Show>
            </Suspense>
          </ErrorBoundary>

          <button
            type="button"
            onClick={handleSignOut}
            disabled={signingOut()}
            aria-busy={signingOut()}
            class={`w-full min-h-11 flex items-center gap-3 px-4 py-3 rounded-xl
                    text-sm font-semibold text-charcoal/75
                    transition-colors duration-150
                    enabled:hover:bg-charcoal/5 enabled:hover:text-charcoal
                    disabled:opacity-60 ${focusRing}`}
          >
            <SignOutIcon />
            {signingOut() ? "Signing out…" : "Sign out"}
          </button>

          <Show when={signOutFailed()}>
            <p role="alert" class="px-4 text-xs font-semibold text-charcoal/80">
              Couldn't sign out. Check your connection and try again.
            </p>
          </Show>

          <p class="pt-2 text-xs text-charcoal/75 text-center">Bach Weekend · Apr 8–12, 2027</p>
        </div>
      </div>

      {/* Content offset for fixed header */}
      <div class="h-14" />
    </>
  );
}
