import { clientOnly } from "@solidjs/start";
import { Suspense } from "solid-js";

// clientOnly — profile uses localStorage, file input, and URL.createObjectURL
const ProfilePage = clientOnly(() =>
  import("~/components/me/ProfilePage").then(m => ({ default: m.ProfilePage }))
);

export default function MePage() {
  return (
    <Suspense>
      <ProfilePage />
    </Suspense>
  );
}
