import { createSignal } from "solid-js";
import { A, useLocation } from "@solidjs/router";

// ─── Icons ────────────────────────────────────────────────────────────────────

function TimelineIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5 shrink-0">
      <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z" />
    </svg>
  );
}

function FlightsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5 shrink-0 rotate-90">
      <path d="M21 16v-2l-8-5V3.5A1.5 1.5 0 0 0 11.5 2 1.5 1.5 0 0 0 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
    </svg>
  );
}

function FundsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5 shrink-0">
      <path d="M21 18v1c0 1.1-.9 2-2 2H5c-1.11 0-2-.9-2-2V5c0-1.1.89-2 2-2h14c1.1 0 2 .9 2 2v1h-9c-1.11 0-2 .9-2 2v8c0 1.1.89 2 2 2h9zm-9-2h10V8H12v8zm4-2.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" />
    </svg>
  );
}

function MeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5 shrink-0">
      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
    </svg>
  );
}

function HamburgerIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6">
      <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5">
      <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
    </svg>
  );
}

// ─── Nav items ────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { href: "/",        label: "Timeline", icon: TimelineIcon },
  { href: "/flights", label: "Flights",  icon: FlightsIcon  },
  { href: "/funds",   label: "Funds",    icon: FundsIcon    },
  { href: "/me",      label: "Me",       icon: MeIcon       },
] as const;

function NavItem(props: {
  href: string;
  label: string;
  Icon: () => any;
  onClose: () => void;
}) {
  const location = useLocation();
  const isActive = () =>
    props.href === "/"
      ? location.pathname === "/"
      : location.pathname.startsWith(props.href);

  return (
    <A
      href={props.href}
      onClick={props.onClose}
      class={`flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-semibold
              transition-colors duration-150
              ${isActive()
                ? "bg-teal/15 text-teal"
                : "text-charcoal/60 hover:bg-charcoal/5 hover:text-charcoal"
              }`}
    >
      <props.Icon />
      {props.label}
    </A>
  );
}

// ─── NavBar ──────────────────────────────────────────────────────────────────

export function NavBar() {
  const [open, setOpen] = createSignal(false);
  const close = () => setOpen(false);

  return (
    <>
      {/* Top header bar */}
      <header class="fixed top-0 inset-x-0 z-30 h-14 paper-surface
                     border-b border-charcoal/10
                     flex items-center px-4">
        {/* Hamburger */}
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          class="w-10 h-10 flex items-center justify-center rounded-lg
                 text-charcoal/60 hover:text-charcoal hover:bg-charcoal/6
                 active:scale-95 transition-all"
        >
          <HamburgerIcon />
        </button>

        {/* Wordmark */}
        <span class="flex-1 text-center text-lg font-black tracking-tight text-charcoal">
          Bach
        </span>

        {/* Balance spacer */}
        <div class="w-10" />
      </header>

      {/* Backdrop */}
      <div
        class={`fixed inset-0 z-40 bg-charcoal/50 backdrop-blur-sm
                transition-opacity duration-300
                ${open() ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={close}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <div
        class={`fixed top-0 left-0 bottom-0 z-50 w-72
                paper-panel flex flex-col
                border-r border-charcoal/10
                shadow-xl
                transition-transform duration-300 ease-in-out
                ${open() ? "translate-x-0" : "-translate-x-full"}`}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation"
      >
        {/* Drawer header */}
        <div class="h-14 flex items-center justify-between px-4 border-b border-charcoal/10 shrink-0">
          <span class="text-lg font-black tracking-tight text-charcoal">Bach</span>
          <button
            type="button"
            onClick={close}
            aria-label="Close menu"
            class="w-9 h-9 flex items-center justify-center rounded-lg
                   text-charcoal/50 hover:text-charcoal hover:bg-charcoal/6
                   active:scale-95 transition-all"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Nav links */}
        <nav class="flex-1 overflow-y-auto p-3 space-y-1">
          {NAV_ITEMS.map(item => (
            <NavItem
              href={item.href}
              label={item.label}
              Icon={item.icon}
              onClose={close}
            />
          ))}
        </nav>

        {/* Drawer footer — sign out placeholder */}
        <div class="shrink-0 p-4 border-t border-charcoal/10">
          <p class="text-xs text-charcoal/30 text-center">Bach Weekend · Apr 8–12, 2027</p>
        </div>
      </div>

      {/* Content offset for fixed header */}
      <div class="h-14" />
    </>
  );
}
