import { createSignal, onMount, Show } from "solid-js";
import { mockFlights } from "~/lib/data/flights";
import { formatTime } from "~/lib/flights";
import { lookupFlight } from "~/lib/api/aviationstack";
import type { GuestFlight } from "~/lib/types";

// Will be replaced with session.user.id once auth is wired
const CURRENT_USER_ID = "gberg";
const PROFILE_KEY  = "bach:profile";
const FLIGHTS_KEY  = "bach:flights_v2";
const TRIP_DATE    = "2027-04-08";
const RETURN_DATE  = "2027-04-12";

// ─── Shared field style ───────────────────────────────────────────────────────

const fieldCls = `w-full rounded-xl border border-charcoal/15 bg-white/60
  px-3 py-2.5 text-sm font-medium text-charcoal
  placeholder:text-charcoal/30
  focus:outline-none focus:ring-2 focus:ring-teal/40 focus:border-teal/50
  transition-all`;

// ─── Icons ────────────────────────────────────────────────────────────────────

function CameraIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6 text-white">
      <path d="M12 15.2A3.2 3.2 0 0 1 8.8 12 3.2 3.2 0 0 1 12 8.8 3.2 3.2 0 0 1 15.2 12 3.2 3.2 0 0 1 12 15.2M20 4h-3.17L15 2H9L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4">
      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
    </svg>
  );
}

function PlaneIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4 rotate-90">
      <path d="M21 16v-2l-8-5V3.5A1.5 1.5 0 0 0 11.5 2 1.5 1.5 0 0 0 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
    </svg>
  );
}

// ─── Avatar upload ────────────────────────────────────────────────────────────

function AvatarUpload(props: {
  initials: string;
  src: string | null;
  onChange: (dataUrl: string) => void;
}) {
  let inputRef: HTMLInputElement | undefined;

  function handleFile(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result;
      if (typeof result === "string") props.onChange(result);
    };
    reader.readAsDataURL(file);
  }

  return (
    <div class="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={() => inputRef?.click()}
        class="relative group focus:outline-none"
        aria-label="Change profile photo"
      >
        <div
          class="w-24 h-24 rounded-full paper-card overflow-hidden
                 ring-2 ring-charcoal/10 group-hover:ring-teal
                 flex items-center justify-center transition-all duration-200"
        >
          <Show
            when={props.src}
            fallback={
              <span class="text-2xl font-black text-charcoal/40 select-none">
                {props.initials}
              </span>
            }
          >
            <img src={props.src!} alt="Profile" class="w-full h-full object-cover" />
          </Show>
        </div>
        {/* Hover overlay */}
        <div
          class="absolute inset-0 rounded-full bg-charcoal/45
                 flex items-center justify-center
                 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
        >
          <CameraIcon />
        </div>
      </button>

      <button
        type="button"
        onClick={() => inputRef?.click()}
        class="text-xs font-semibold text-charcoal/45 hover:text-teal transition-colors"
      >
        Change photo
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFile}
        class="sr-only"
      />
    </div>
  );
}

// ─── Saved leg row ────────────────────────────────────────────────────────────

function SavedLegRow(props: { label: string; flight: GuestFlight }) {
  const f = props.flight;
  return (
    <div class="space-y-2">
      <p class="text-[9px] font-bold uppercase tracking-wider text-charcoal/35">{props.label}</p>
      <div class="flex items-center gap-3">
        <div class="text-center">
          <p class="text-lg font-black text-charcoal">{f.origin}</p>
          <p class="text-[10px] text-charcoal/40">{formatTime(f.departsAt)}</p>
        </div>
        <div class="flex-1 flex flex-col items-center gap-0.5">
          <PlaneIcon />
          <p class="text-[10px] font-bold text-charcoal/40">{f.airline} · {f.flightNumber}</p>
        </div>
        <div class="text-center">
          <p class="text-lg font-black text-charcoal">{f.destination}</p>
          <p class="text-[10px] text-charcoal/40">{formatTime(f.arrivesAt)}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Found-flight mini card ───────────────────────────────────────────────────

function FlightFoundCard(props: {
  flight: GuestFlight;
  onUse: () => void;
  onClear: () => void;
}) {
  const f = props.flight;
  return (
    <div class="rounded-xl border-2 border-teal/40 bg-teal/5 p-3 space-y-3">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-[10px] font-bold uppercase tracking-widest text-charcoal/40">{f.airline}</p>
          <p class="text-sm font-black text-charcoal">{f.flightNumber}</p>
        </div>
        <span class="text-xs font-bold text-teal bg-teal/10 px-2 py-1 rounded-lg">Found</span>
      </div>
      <div class="flex items-center gap-3">
        <div class="text-center">
          <p class="text-lg font-black text-charcoal">{f.origin}</p>
          <p class="text-xs text-charcoal/50">{formatTime(f.departsAt)}</p>
        </div>
        <PlaneIcon />
        <div class="text-center">
          <p class="text-lg font-black text-charcoal">{f.destination}</p>
          <p class="text-xs text-charcoal/50">{formatTime(f.arrivesAt)}</p>
        </div>
      </div>
      <div class="flex gap-2">
        <button
          type="button"
          onClick={props.onUse}
          class="flex-1 rounded-xl bg-teal px-3 py-2 text-xs font-bold text-charcoal
                 hover:bg-teal/85 active:scale-[0.98] transition-all"
        >
          Use this flight
        </button>
        <button
          type="button"
          onClick={props.onClear}
          class="rounded-xl border border-charcoal/15 px-3 py-2 text-xs font-semibold
                 text-charcoal/50 hover:text-charcoal transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

// ─── Flight lookup row ────────────────────────────────────────────────────────

type LookupState = "idle" | "loading" | "found" | "not_found";

function FlightLookupRow(props: {
  label: string;
  defaultDate: string;
  onFound: (f: GuestFlight) => void;
}) {
  const [input,     setInput    ] = createSignal("");
  const [flightDate, setFlightDate] = createSignal(props.defaultDate);
  const [state,     setState    ] = createSignal<LookupState>("idle");
  const [found,     setFound    ] = createSignal<GuestFlight | null>(null);

  function doLookup() {
    const raw = input().trim();
    if (!raw) return;
    setState("loading");
    setFound(null);

    // Normalize input: remove spaces, uppercase
    lookupFlight(raw, flightDate()).then(result => {
      if (result) {
        setFound({
          id:          result.flightNumber,
          guestId:     "",
          guestName:   "",
          flightNumber: result.flightNumber,
          airline:     result.airline,
          origin:      result.origin,
          destination: result.destination,
          departsAt:   result.departsAt,
          arrivesAt:   result.arrivesAt,
        });
        setState("found");
      } else {
        setState("not_found");
      }
    }).catch(() => setState("not_found"));
  }

  return (
    <div class="space-y-2">
      <p class="text-[10px] font-bold uppercase tracking-wider text-charcoal/35">
        {props.label}
      </p>

      <div class="grid grid-cols-[5.5rem_1fr_auto] gap-2 items-center">
        <input
          type="text"
          placeholder="AA 321"
          value={input()}
          onInput={(e) => { setInput(e.currentTarget.value); setState("idle"); }}
          onKeyDown={(e) => e.key === "Enter" && doLookup()}
          class={fieldCls}
          spellcheck={false}
          autocomplete="off"
        />
        <input
          type="date"
          value={flightDate()}
          onChange={(e) => setFlightDate(e.currentTarget.value)}
          class={fieldCls}
        />
        <button
          type="button"
          onClick={doLookup}
          disabled={state() === "loading" || !input().trim()}
          class="rounded-xl bg-charcoal px-4 py-2.5 text-xs font-bold text-cream
                 disabled:opacity-40 hover:bg-charcoal/85 active:scale-[0.98] transition-all
                 whitespace-nowrap"
        >
          {state() === "loading" ? "…" : "Look up"}
        </button>
      </div>

      <Show when={state() === "found" && found()} keyed>
        {(flight) => (
          <FlightFoundCard
            flight={flight}
            onUse={() => { props.onFound(flight); setState("idle"); setInput(""); }}
            onClear={() => { setState("idle"); setInput(""); }}
          />
        )}
      </Show>

      <Show when={state() === "not_found"}>
        <p class="text-xs font-semibold text-orange py-0.5">
          No flight found — double-check the number and date.
        </p>
      </Show>
    </div>
  );
}

// ─── Flight section ───────────────────────────────────────────────────────────

function FlightSection() {
  const defaultInbound = mockFlights.find(f => f.guestId === CURRENT_USER_ID) ?? null;

  const [savedInbound,  setSavedInbound ] = createSignal<GuestFlight | null>(defaultInbound);
  const [savedOutbound, setSavedOutbound] = createSignal<GuestFlight | null>(null);
  const [editing, setEditing] = createSignal(!defaultInbound);

  onMount(() => {
    const raw = localStorage.getItem(FLIGHTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.inbound)  setSavedInbound(parsed.inbound);
      if (parsed.outbound) setSavedOutbound(parsed.outbound);
      setEditing(!parsed.inbound && !parsed.outbound);
    }
  });

  function saveToStorage(inbound: GuestFlight | null, outbound: GuestFlight | null) {
    localStorage.setItem(FLIGHTS_KEY, JSON.stringify({ inbound, outbound }));
  }

  const hasSaved = () => savedInbound() || savedOutbound();

  return (
    <div class="paper-card rounded-xl p-4 space-y-4">
      <div class="flex items-center justify-between">
        <p class="text-xs font-semibold uppercase tracking-widest text-charcoal/40">
          My flights
        </p>
        <Show when={hasSaved() && !editing()}>
          <button
            type="button"
            onClick={() => setEditing(true)}
            class="text-xs font-semibold text-charcoal/45 hover:text-teal transition-colors"
          >
            Change
          </button>
        </Show>
      </div>

      {/* Saved summary */}
      <Show when={!editing() && hasSaved()}>
        <div class="space-y-3">
          <Show when={savedInbound()}>
            {(f) => <SavedLegRow label="Flying in" flight={f()} />}
          </Show>
          <Show when={savedInbound() && savedOutbound()}>
            <div class="w-full h-px bg-charcoal/8" />
          </Show>
          <Show when={savedOutbound()}>
            {(f) => <SavedLegRow label="Flying home" flight={f()} />}
          </Show>
        </div>
      </Show>

      {/* Lookup form */}
      <Show when={editing()}>
        <div class="space-y-4">
          <FlightLookupRow
            label="Flying in"
            defaultDate={TRIP_DATE}
            onFound={(f) => {
              setSavedInbound(f);
              saveToStorage(f, savedOutbound());
            }}
          />

          <div class="w-full h-px bg-charcoal/8" />

          <FlightLookupRow
            label="Flying home"
            defaultDate={RETURN_DATE}
            onFound={(f) => {
              setSavedOutbound(f);
              saveToStorage(savedInbound(), f);
            }}
          />

          <Show when={hasSaved()}>
            <button
              type="button"
              onClick={() => setEditing(false)}
              class="w-full text-xs font-semibold text-charcoal/40 hover:text-charcoal
                     transition-colors py-1"
            >
              Done
            </button>
          </Show>
        </div>
      </Show>
    </div>
  );
}

// ─── Profile form ─────────────────────────────────────────────────────────────

function ProfileForm() {
  const [name,      setName      ] = createSignal("Garrett");
  const [email,     setEmail     ] = createSignal("");
  const [avatarSrc, setAvatarSrc ] = createSignal<string | null>(null);
  const [saved,     setSaved     ] = createSignal(false);

  const initials = () => {
    const parts = name().trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return (parts[0] ?? "ME").slice(0, 2).toUpperCase();
  };

  onMount(() => {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      setName(p.name ?? "");
      setEmail(p.email ?? "");
      setAvatarSrc(p.avatarDataUrl ?? null);
    }
  });

  function handleSave(e: Event) {
    e.preventDefault();
    localStorage.setItem(
      PROFILE_KEY,
      JSON.stringify({ name: name(), email: email(), avatarDataUrl: avatarSrc() })
    );
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <form onSubmit={handleSave} class="space-y-6">
      {/* Avatar */}
      <div class="paper-card rounded-xl p-6 flex flex-col items-center gap-1">
        <AvatarUpload
          initials={initials()}
          src={avatarSrc()}
          onChange={setAvatarSrc}
        />
      </div>

      {/* Name + email */}
      <div class="paper-card rounded-xl p-4 space-y-4">
        <p class="text-xs font-semibold uppercase tracking-widest text-charcoal/40">
          Profile
        </p>

        <div class="space-y-1.5">
          <label class="text-xs font-semibold text-charcoal/55">Display name</label>
          <input
            type="text"
            value={name()}
            onInput={(e) => setName(e.currentTarget.value)}
            placeholder="Your name"
            class={fieldCls}
          />
        </div>

        <div class="space-y-1.5">
          <div class="flex items-baseline justify-between">
            <label class="text-xs font-semibold text-charcoal/55">Email</label>
            <span class="text-[10px] text-charcoal/35">
              Apple may not share this automatically
            </span>
          </div>
          <input
            type="email"
            value={email()}
            onInput={(e) => setEmail(e.currentTarget.value)}
            placeholder="you@example.com"
            class={fieldCls}
          />
        </div>
      </div>

      {/* Flight */}
      <div id="flight-section">
        <FlightSection />
      </div>

      {/* Save */}
      <button
        type="submit"
        class={`w-full rounded-xl px-4 py-3 text-sm font-bold transition-all
                active:scale-[0.98]
                ${saved()
                  ? "bg-teal text-charcoal"
                  : "bg-charcoal text-cream hover:bg-charcoal/85"
                }`}
      >
        <Show when={saved()} fallback="Save profile">
          <span class="flex items-center justify-center gap-2">
            <CheckIcon /> Saved
          </span>
        </Show>
      </button>
    </form>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function ProfilePage() {
  return (
    <div class="mx-auto max-w-lg px-4 py-6 space-y-6">
      <div>
        <h1 class="text-2xl font-black text-charcoal">My Profile</h1>
        <p class="mt-1 text-sm text-charcoal/50">
          Your details, flight, and how the crew sees you.
        </p>
      </div>

      <ProfileForm />
    </div>
  );
}
