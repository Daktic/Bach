import { clientOnly } from "@solidjs/start";
import { Suspense } from "solid-js";
import { ChatShell, ChatSkeleton } from "~/components/chat/ChatShell";

// clientOnly: message times show in the viewer's own time zone, and the chat
// polls for new messages while it's open. The server renders the same shell
// and skeleton the page shows while it loads.
const ChatRoom = clientOnly(() => import("~/components/chat/ChatRoom").then((m) => ({ default: m.ChatRoom })));

export default function ChatPage() {
  return (
    <Suspense>
      <ChatRoom
        fallback={
          <ChatShell>
            <ChatSkeleton />
          </ChatShell>
        }
      />
    </Suspense>
  );
}
