import { createSignal, Show } from "solid-js";

export interface ChatPerson {
  id: string;
  name: string;
  initials: string;
  /** Uploaded profile photo (a data URL), when set. */
  image?: string;
}

/** A guest's photo, or their initials, beside their bubbles. Decorative: the name is always given in text. */
export function ChatAvatar(props: { person: ChatPerson }) {
  const [broken, setBroken] = createSignal(false);

  return (
    <span
      aria-hidden="true"
      class="paper-card flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full text-[10px]"
    >
      <Show
        when={props.person.image && !broken()}
        fallback={<span class="select-none font-bold text-charcoal/75">{props.person.initials}</span>}
      >
        <img
          src={props.person.image!}
          alt=""
          referrerpolicy="no-referrer"
          onError={() => setBroken(true)}
          class="h-full w-full object-cover"
        />
      </Show>
    </span>
  );
}
