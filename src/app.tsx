import { Router, useIsRouting, useLocation } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";
import { createEffect, onCleanup, type ParentProps, Show, Suspense, untrack } from "solid-js";
import { focusPageHeading } from "~/components/nav/focus-heading";
import { NavBar } from "~/components/nav/NavBar";
import { pageTitle } from "~/components/nav/page-title";
import "./app.css";

function AppShell(props: ParentProps) {
  const location = useLocation();
  const isRouting = useIsRouting();
  // Sign-in is full-screen — no nav chrome
  const showNav = () => location.pathname !== "/sign-in";

  let page!: HTMLElement;
  let shownPath: string | undefined;
  let stopFocusing: (() => void) | undefined;
  onCleanup(() => stopFocusing?.());

  // NAV-1: title each page (the server renders the first title, see
  // entry-server.tsx), and after an in-app navigation move focus to the new
  // page's <h1> so screen readers announce it. Waits until the router has
  // settled, when the URL has changed, so the title lands on the new history
  // entry rather than the one being left.
  createEffect(() => {
    if (isRouting()) return;
    const path = location.pathname;
    if (path === shownPath) return;
    const firstLoad = shownPath === undefined;
    shownPath = path;
    document.title = pageTitle(path);

    stopFocusing?.();
    stopFocusing = undefined;
    // A fresh page load already starts at the top, and a #fragment link
    // scrolls to its own target.
    if (firstLoad || untrack(() => location.hash)) return;
    stopFocusing = focusPageHeading(page);
  });

  return (
    <>
      <Show when={showNav()}>
        <NavBar />
      </Show>
      {/* The page's one <main> landmark, on every route including /sign-in.
          NavBar's <header> stays outside it; pages render a plain <div>. */}
      <main id="main" ref={page}>
        <Suspense>{props.children}</Suspense>
      </main>
    </>
  );
}

export default function App() {
  return (
    <Router root={AppShell}>
      <FileRoutes />
    </Router>
  );
}
