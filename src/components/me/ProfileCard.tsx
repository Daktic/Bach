import { createEffect, createSignal, on, onCleanup, Show } from "solid-js";
import { loadMyProfile, saveMyProfile, type MyProfile } from "~/lib/client/my-profile";
import type { Me } from "~/lib/types";
import { downscaleAvatar } from "./avatar-image";
import { CameraIcon, CheckIcon, ErrorNote, fieldCls, labelCls, primaryBtn, quietBtn } from "./ui";

const NAME_MAX = 40;
const STORAGE_ERROR = "Couldn't save on this device. Storage may be full or turned off (private browsing).";

/** ME-1/ME-2: who's signed in, plus a display name and photo saved on this device. */
export function ProfileCard(props: { me: Me }) {
  const [profile, setProfile] = createSignal<MyProfile>(loadMyProfile(props.me.id));
  const displayName = () => profile().name ?? props.me.name;
  const [nameDraft, setNameDraft] = createSignal(displayName());
  const [photoBusy, setPhotoBusy] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const [notice, setNotice] = createSignal<string | null>(null);
  // An avatar URL that failed to load (e.g. an expired OAuth photo link).
  const [brokenSrc, setBrokenSrc] = createSignal<string | null>(null);
  let fileInput: HTMLInputElement | undefined;
  let photoButton: HTMLButtonElement | undefined;
  let noticeTimer: ReturnType<typeof setTimeout> | undefined;
  onCleanup(() => clearTimeout(noticeTimer));

  // Another guest signed in on this device: show their overrides, not ours.
  createEffect(
    on(
      () => props.me.id,
      (id) => {
        const next = loadMyProfile(id);
        setProfile(next);
        setNameDraft(next.name ?? props.me.name);
      },
      { defer: true },
    ),
  );

  // Local upload, else the OAuth photo, else initials.
  const avatarSrc = () => {
    const src = profile().avatarDataUrl ?? props.me.image;
    return src && src !== brokenSrc() ? src : null;
  };

  const cleanDraft = () => nameDraft().trim().replace(/\s+/g, " ");
  // A blank name means "use my name from the guest list".
  const nameChanged = () => (cleanDraft() || props.me.name) !== displayName();

  function flash(message: string) {
    setNotice(message);
    clearTimeout(noticeTimer);
    noticeTimer = setTimeout(() => setNotice(null), 2500);
  }

  function persist(next: MyProfile, message: string): boolean {
    if (!saveMyProfile(props.me.id, next)) {
      setError(STORAGE_ERROR);
      return false;
    }
    setProfile(next);
    setError(null);
    flash(message);
    return true;
  }

  function saveName(e: SubmitEvent) {
    e.preventDefault();
    if (!nameChanged()) return;
    const clean = cleanDraft();
    const name = clean && clean !== props.me.name ? clean : undefined;
    if (persist({ ...profile(), name }, "Name saved.")) setNameDraft(name ?? props.me.name);
  }

  function removePhoto() {
    persist({ ...profile(), avatarDataUrl: undefined }, "Photo removed.");
    photoButton?.focus(); // the Remove button is gone now
  }

  async function choosePhoto(input: HTMLInputElement) {
    const file = input.files?.[0];
    input.value = ""; // so choosing the same file again still fires
    if (!file) return;
    setError(null);
    if (!file.type.startsWith("image/")) {
      setError("That file isn't an image. Choose a photo.");
      return;
    }
    setPhotoBusy(true);
    try {
      const avatarDataUrl = await downscaleAvatar(file);
      persist({ ...profile(), avatarDataUrl }, "Photo saved.");
    } catch {
      setError("Couldn't read that photo. Try a JPG or PNG.");
    } finally {
      setPhotoBusy(false);
    }
  }

  return (
    <section aria-label="Profile" class="paper-card space-y-5 rounded-xl p-5">
      {/* Announces saves; absolutely positioned, so it never adds a gap. */}
      <p class="sr-only" aria-live="polite">
        {notice() ?? ""}
      </p>
      <div class="flex flex-col items-center text-center">
        <button
          ref={photoButton}
          type="button"
          onClick={() => fileInput?.click()}
          disabled={photoBusy()}
          class="group flex flex-col items-center rounded-2xl pt-1 focus-visible:outline-2
                 focus-visible:outline-offset-2 focus-visible:outline-charcoal"
        >
          <span class="relative block h-24 w-24">
            <span
              class="paper-card flex h-full w-full items-center justify-center overflow-hidden
                     rounded-full ring-2 ring-charcoal/10 transition-all group-hover:ring-teal"
            >
              <Show
                when={avatarSrc()}
                keyed
                fallback={
                  <span class="select-none text-2xl font-black text-charcoal/75">{props.me.initials}</span>
                }
              >
                {(src) => (
                  <img
                    src={src}
                    alt=""
                    referrerpolicy="no-referrer"
                    class="h-full w-full object-cover"
                    onError={() => setBrokenSrc(src)}
                  />
                )}
              </Show>
            </span>
            <span
              class="absolute -bottom-0.5 -right-0.5 flex h-8 w-8 items-center justify-center
                     rounded-full bg-charcoal text-cream ring-2 ring-cream"
            >
              <CameraIcon class="h-4 w-4" />
            </span>
            {/* /80 scrim: cream text stays over 4.5:1 even on top of a white photo. */}
            <Show when={photoBusy()}>
              <span class="absolute inset-0 flex items-center justify-center rounded-full bg-charcoal/80 text-xs font-bold text-cream">
                Saving…
              </span>
            </Show>
          </span>
          <span
            class="inline-flex min-h-11 items-center px-3 text-sm font-semibold text-charcoal/80 decoration-teal
                   decoration-2 underline-offset-2 transition-colors group-hover:text-charcoal group-hover:underline"
          >
            Change photo
          </span>
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          tabIndex={-1}
          aria-hidden="true"
          class="sr-only"
          onChange={(e) => choosePhoto(e.currentTarget)}
        />
        <Show when={profile().avatarDataUrl}>
          <button type="button" class={`${quietBtn} -mt-2`} onClick={removePhoto}>
            {props.me.image ? "Use account photo" : "Remove photo"}
          </button>
        </Show>

        <p class="mt-1 max-w-full text-xl font-black text-charcoal break-words">{displayName()}</p>
        <Show when={props.me.email}>
          {(email) => (
            <p class="mt-0.5 max-w-full text-xs text-charcoal/75">
              Signed in as <span class="break-all font-semibold text-charcoal">{email()}</span>
            </p>
          )}
        </Show>
      </div>

      <form onSubmit={saveName} class="space-y-1.5">
        <label for="display-name" class={labelCls}>
          Display name
        </label>
        <div class="flex gap-2">
          <input
            id="display-name"
            type="text"
            value={nameDraft()}
            onInput={(e) => setNameDraft(e.currentTarget.value)}
            maxLength={NAME_MAX}
            autocomplete="nickname"
            placeholder={props.me.name}
            aria-describedby="display-name-hint"
            class={`${fieldCls} flex-1`}
          />
          <button type="submit" disabled={!nameChanged()} class={`${primaryBtn} shrink-0`}>
            Save
          </button>
        </div>
        <p id="display-name-hint" class="text-xs text-charcoal/75">
          <Show when={profile().name} fallback="How your name shows on this device.">
            Clear it to go back to “{props.me.name}”.
          </Show>
        </p>
      </form>

      <Show when={notice()}>
        {(message) => (
          <p class="flex items-center gap-1.5 text-xs font-semibold text-charcoal/80">
            {/* Charcoal check on a teal dot, like the "Arrived" badge: a teal glyph is too light on cream. */}
            <span class="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-teal text-charcoal" aria-hidden="true">
              <CheckIcon class="h-3 w-3" />
            </span>
            {message()}
          </p>
        )}
      </Show>
      <Show when={error()}>{(message) => <ErrorNote>{message()}</ErrorNote>}</Show>

      <p class="text-xs text-charcoal/75">Your name and photo are saved on this device for now.</p>
    </section>
  );
}
