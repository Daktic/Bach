// NAV-1: after an in-app navigation, focus goes to the new page's <h1> so a
// screen reader announces the page. Without this, a link tapped in the drawer
// leaves focus on the menu button, and a link tapped inside a page is removed
// with the old page, dropping focus to <body>. Browser only.

/** Detail pages render their <h1> once their data loads; wait this long for it. */
const HEADING_WAIT_MS = 10_000;

/**
 * Moves focus to the first <h1> inside `page`, waiting for it to render if
 * the page is still loading. Only focus that navigation left behind is moved:
 * on <body>, or outside the page and outside any dialog (the menu button the
 * drawer hands it to). If the guest has moved focus into the page, or into an
 * open dialog such as the drawer, it is left there.
 *
 * Returns a function that stops waiting.
 */
export function focusPageHeading(page: HTMLElement): () => void {
  let heading: HTMLElement | null = null;

  const focusIsFree = () => {
    const active = document.activeElement;
    if (!active || active === document.body) return true;
    return !page.contains(active) && !active.closest("dialog, [role=dialog]");
  };

  const attempt = () => {
    // Done, unless the heading was swapped out after it took focus (a
    // client-only component replacing its placeholder), which drops focus
    // to <body> again.
    if (heading?.isConnected) return;
    if (!focusIsFree()) return stop();
    heading = page.querySelector<HTMLElement>("h1");
    if (!heading) return;
    // Focusable from script only; it stays out of the Tab order.
    if (!heading.hasAttribute("tabindex")) heading.tabIndex = -1;
    heading.focus({ preventScroll: true });
  };

  const observer = new MutationObserver(attempt);
  const timer = window.setTimeout(stop, HEADING_WAIT_MS);
  function stop() {
    observer.disconnect();
    window.clearTimeout(timer);
  }

  observer.observe(page, { childList: true, subtree: true });
  attempt();
  return stop;
}
