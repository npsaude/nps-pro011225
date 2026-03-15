export const QUOTA_CHANGED_EVENT = "nps:quota-changed";

export function emitQuotaChanged() {
  window.dispatchEvent(new CustomEvent(QUOTA_CHANGED_EVENT));
}

export function subscribeQuotaChanged(handler: () => void) {
  window.addEventListener(QUOTA_CHANGED_EVENT, handler);
  return () => {
    window.removeEventListener(QUOTA_CHANGED_EVENT, handler);
  };
}
