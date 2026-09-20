import { clientOnly } from "@solidjs/start";
import { Suspense } from "solid-js";

// clientOnly — signIn() from @auth/solid-start/client needs the browser
const SignInPage = clientOnly(() =>
  import("~/components/auth/SignInPage").then(m => ({ default: m.SignInPage }))
);

export default function SignInRoute() {
  return (
    <Suspense>
      <SignInPage />
    </Suspense>
  );
}
