export const AVATAR_UPDATED_EVENT = "nps:avatar-updated";

export type AvatarUpdatedDetail = {
  url: string | null;
};

export function emitAvatarUpdated(url: string | null) {
  window.dispatchEvent(
    new CustomEvent<AvatarUpdatedDetail>(AVATAR_UPDATED_EVENT, {
      detail: { url },
    }),
  );
}

export function subscribeAvatarUpdated(handler: (url: string | null) => void) {
  const listener = (event: Event) => {
    const e = event as CustomEvent<AvatarUpdatedDetail>;
    handler(e.detail?.url ?? null);
  };

  window.addEventListener(AVATAR_UPDATED_EVENT, listener as EventListener);

  return () => {
    window.removeEventListener(AVATAR_UPDATED_EVENT, listener as EventListener);
  };
}