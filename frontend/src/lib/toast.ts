"use client";

// Minimal, dependency-free toast store backed by useSyncExternalStore. The server
// snapshot is a stable EMPTY reference so the <Toaster/> renders nothing on the
// server and hydrates to the same empty list → zero hydration mismatch.
export interface ToastItem {
  id: number;
  message: string;
  href?: string;
  linkLabel?: string;
}

const EMPTY: ToastItem[] = [];
let toasts: ToastItem[] = EMPTY;
let nextId = 1;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

export const toastStore = {
  subscribe(cb: () => void) {
    listeners.add(cb);
    return () => {
      listeners.delete(cb);
    };
  },
  getSnapshot() {
    return toasts;
  },
  getServerSnapshot() {
    return EMPTY;
  },
  dismiss(id: number) {
    toasts = toasts.filter((t) => t.id !== id);
    emit();
  },
  push(t: Omit<ToastItem, "id">, ttl = 6500) {
    const id = nextId++;
    toasts = [...toasts, { ...t, id }];
    emit();
    if (typeof window !== "undefined") {
      window.setTimeout(() => toastStore.dismiss(id), ttl);
    }
    return id;
  },
};

/** Fire a success toast with an optional external link (e.g. an Etherscan tx). */
export function toastSuccess(message: string, opts?: { href?: string; linkLabel?: string }) {
  return toastStore.push({ message, href: opts?.href, linkLabel: opts?.linkLabel });
}
