import { Router, useLocation } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";
import { type ParentProps, Show, Suspense } from "solid-js";
import { NavBar } from "~/components/nav/NavBar";
import "./app.css";

function AppShell(props: ParentProps) {
  const location = useLocation();
  // Sign-in is full-screen — no nav chrome
  const showNav = () => location.pathname !== "/sign-in";

  return (
    <>
      <Show when={showNav()}>
        <NavBar />
      </Show>
      <Suspense>{props.children}</Suspense>
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
