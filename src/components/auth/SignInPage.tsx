import { signIn } from "@auth/solid-start/client";
import { useSearchParams } from "@solidjs/router";
import { createSignal, Match, onCleanup, onMount, Show, Switch, type JSX } from "solid-js";
import { Dynamic } from "solid-js/web";
import { safeNextPath } from "~/lib/redirects";

type Provider = "google" | "apple";
type Notice = "denied" | "snag";

// AUTH-8: the provider last tapped on this device, highlighted on return.
const LAST_PROVIDER_KEY = "bach:last-provider";
// Auth.js drops ?next when it sends a failed sign-in back here, so each
// attempt's destination is kept for this tab and reused on the retry.
const RETRY_NEXT_KEY = "bach:sign-in-next";

// ─── Icons ────────────────────────────────────────────────────────────────────

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" class="w-5 h-5 shrink-0" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" class="w-5 h-5 shrink-0 fill-white" aria-hidden="true">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
    </svg>
  );
}

function Spinner() {
  return (
    <svg viewBox="0 0 24 24" fill="none" class="w-5 h-5 shrink-0 motion-safe:animate-spin" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="3" class="opacity-25" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" stroke-width="3" stroke-linecap="round" />
    </svg>
  );
}

function AlertIcon(props: { class: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" class={`w-5 h-5 shrink-0 ${props.class}`} aria-hidden="true">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
    </svg>
  );
}

// ─── Browser storage (client only; every call can throw in private mode) ─────

function readLastProvider(): Provider | null {
  try {
    const value = localStorage.getItem(LAST_PROVIDER_KEY);
    return value === "google" || value === "apple" ? value : null;
  } catch {
    return null;
  }
}

function readRetryNext(): string | null {
  try {
    return safeNextPath(sessionStorage.getItem(RETRY_NEXT_KEY));
  } catch {
    return null;
  }
}

function rememberAttempt(provider: Provider, next: string): void {
  try {
    localStorage.setItem(LAST_PROVIDER_KEY, provider);
  } catch {
    // Not remembered; the buttons just aren't highlighted next time.
  }
  try {
    if (next === "/") sessionStorage.removeItem(RETRY_NEXT_KEY);
    else sessionStorage.setItem(RETRY_NEXT_KEY, next);
  } catch {
    // A retry after an error lands on the timeline instead.
  }
}

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

// ─── Pieces ───────────────────────────────────────────────────────────────────

const PROVIDERS: Record<Provider, { name: string; Icon: () => JSX.Element; tone: string }> = {
  google: {
    name: "Google",
    Icon: GoogleIcon,
    tone: "border border-charcoal/15 bg-white text-charcoal/80 shadow-sm enabled:hover:bg-charcoal/[0.03]",
  },
  apple: {
    name: "Apple",
    Icon: AppleIcon,
    tone: "bg-charcoal text-white enabled:hover:bg-charcoal/85",
  },
};

function ProviderButton(props: {
  provider: Provider;
  lastUsed: boolean;
  pending: Provider | null;
  onSelect: (provider: Provider) => void;
}) {
  const info = () => PROVIDERS[props.provider];
  const busy = () => props.pending === props.provider;

  // The teal last-used ring is too light to carry meaning alone; the
  // "Last used" label (charcoal on teal) says it. Focus is charcoal, so a
  // focused button never looks like the last-used one.
  return (
    <button
      type="button"
      onClick={() => props.onSelect(props.provider)}
      disabled={props.pending !== null}
      aria-busy={busy()}
      class={`relative w-full min-h-12 flex items-center gap-3 rounded-xl px-4 py-3
              text-sm font-semibold transition-all enabled:active:scale-[0.98]
              focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-charcoal
              ${info().tone}
              ${props.lastUsed ? "ring-2 ring-teal ring-offset-2 ring-offset-cream" : ""}
              ${props.pending !== null && !busy() ? "opacity-50" : ""}`}
    >
      <Show when={busy()} fallback={<Dynamic component={info().Icon} />}>
        <Spinner />
      </Show>
      <span class="flex-1 text-center">
        {busy() ? `Opening ${info().name}…` : `Continue with ${info().name}`}
      </span>
      <Show when={props.lastUsed}>
        <span
          class="absolute -top-2.5 right-3 rounded-full bg-teal px-2 py-0.5
                 text-[10px] font-bold uppercase tracking-wider text-charcoal shadow-sm"
        >
          Last used
        </span>
      </Show>
    </button>
  );
}

function NoticeBox(props: { tone: Notice; title: string; children: JSX.Element }) {
  return (
    <div
      role="alert"
      class={`mb-6 flex gap-3 rounded-xl border px-4 py-3 text-left
              ${props.tone === "denied" ? "border-orange/30 bg-orange/10" : "border-charcoal/15 bg-charcoal/5"}`}
    >
      <AlertIcon class={props.tone === "denied" ? "text-orange" : "text-charcoal/50"} />
      <div class="min-w-0">
        <p class="text-sm font-black text-charcoal">{props.title}</p>
        <p class="mt-1 text-xs leading-relaxed text-charcoal/80">{props.children}</p>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function SignInPage() {
  const [params] = useSearchParams();
  // Storage-backed state starts empty so the server and first client render match.
  const [lastProvider, setLastProvider] = createSignal<Provider | null>(null);
  const [retryNext, setRetryNext] = createSignal<string | null>(null);
  const [pending, setPending] = createSignal<Provider | null>(null);
  const [failed, setFailed] = createSignal(false);

  const errorCode = () => firstParam(params.error);

  // AUTH-7: the page the guest originally asked for, else the timeline.
  const destination = () =>
    safeNextPath(firstParam(params.next)) ?? (errorCode() ? retryNext() : null) ?? "/";

  // AUTH-3: the copy never says anything about who is on the list.
  const notice = (): Notice | null => {
    if (failed()) return "snag";
    const code = errorCode();
    if (!code) return null;
    return code === "AccessDenied" ? "denied" : "snag";
  };

  onMount(() => {
    setLastProvider(readLastProvider());
    setRetryNext(readRetryNext());

    // Backing out of Google/Apple can restore this page from the bfcache with
    // the buttons still disabled.
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) setPending(null);
    };
    window.addEventListener("pageshow", onPageShow);
    onCleanup(() => window.removeEventListener("pageshow", onPageShow));
  });

  async function start(provider: Provider) {
    if (pending()) return;
    const redirectTo = destination();
    setPending(provider);
    setFailed(false);
    rememberAttempt(provider, redirectTo);
    try {
      await signIn(
        provider,
        { redirectTo },
        // Lets someone turned away with one Google account pick another.
        provider === "google" ? { prompt: "select_account" } : undefined,
      );
      // signIn() navigates away; stay pending until the page unloads.
    } catch (err) {
      console.error("[sign-in] could not start sign-in", err);
      setPending(null);
      setFailed(true);
    }
  }

  return (
    <div class="min-h-dvh flex flex-col items-center justify-center px-6 py-12">

      {/* Brand */}
      <div class="mb-10 text-center">
        <h1 class="text-5xl font-black tracking-tight text-charcoal">Bach</h1>
        <p class="mt-2 text-sm text-charcoal/75 tracking-wide">
          Private access · Invited guests only
        </p>
      </div>

      {/* Card */}
      <div class="paper-card rounded-2xl p-8 w-full max-w-sm">
        <p class="text-sm font-semibold text-charcoal/75 text-center mb-6">
          Sign in to see the trip details
        </p>

        <Switch>
          <Match when={notice() === "denied"}>
            <NoticeBox tone="denied" title="That account isn't on the guest list">
              Bach is invite-only. Sign in with the email the organiser has for you,
              or try your other Google or Apple account.
            </NoticeBox>
          </Match>
          <Match when={notice() === "snag"}>
            <NoticeBox tone="snag" title="Sign-in hit a snag">
              Give it another try.
            </NoticeBox>
          </Match>
        </Switch>

        <div class="space-y-4">
          <ProviderButton
            provider="google"
            lastUsed={lastProvider() === "google"}
            pending={pending()}
            onSelect={start}
          />
          <ProviderButton
            provider="apple"
            lastUsed={lastProvider() === "apple"}
            pending={pending()}
            onSelect={start}
          />
        </div>
      </div>

      <p class="mt-8 text-xs text-charcoal/75 text-center max-w-xs">
        Trouble getting in? Text the groom.
      </p>
    </div>
  );
}
