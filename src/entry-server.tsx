// @refresh reload
import { createHandler, StartServer } from "@solidjs/start/server";
import { getRequestEvent } from "solid-js/web";
import { pageTitle, SITE_NAME } from "~/components/nav/page-title";

/**
 * NAV-1: the requested page's title, so the tab and history entry are right
 * before any script runs. AppShell keeps document.title up to date after
 * client-side navigation.
 */
function requestTitle(): string {
  const event = getRequestEvent();
  return event ? pageTitle(new URL(event.request.url).pathname) : SITE_NAME;
}

export default createHandler(() => (
  <StartServer
    document={({ assets, children, scripts }) => (
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>{requestTitle()}</title>
          <meta name="description" content="Private trip site for invited guests." />
          {/* Invite-only site: keep it out of search engines (see also robots.txt). */}
          <meta name="robots" content="noindex, nofollow" />
          <meta name="theme-color" content="#f9f7db" />
          <link rel="icon" href="/favicon.ico" />
          {/* NAV-3: installable PWA. The manifest and icons are public in middleware.ts. */}
          <link rel="manifest" href="/manifest.webmanifest" />
          <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
          <meta name="mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-title" content="Bach" />
          <meta name="apple-mobile-web-app-status-bar-style" content="default" />
          {assets}
        </head>
        <body>
          <div id="app">{children}</div>
          {scripts}
        </body>
      </html>
    )}
  />
));
