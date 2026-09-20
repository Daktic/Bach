import { useParams } from "@solidjs/router";

export default function ActivityDetailPage() {
  const params = useParams();
  return <main>Activity {params.id}</main>;
}
