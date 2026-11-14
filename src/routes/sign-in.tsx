import { SignInPage } from "~/components/auth/SignInPage";

// Server-rendered so the buttons and any error message show before JS loads.
// SignInPage only touches browser storage in onMount and calls signIn() on tap,
// and Solid replays taps made before hydration.
export default function SignInRoute() {
  return <SignInPage />;
}
