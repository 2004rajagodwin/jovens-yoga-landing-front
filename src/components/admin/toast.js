// Minimal global toast store — no context provider needed, just a subscriber list.
// ToastHost (mounted once in AdminLayout) subscribes and renders; any page can call
// showToast(...) directly.

let toasts = [];
let listeners = [];
let nextId = 1;

function notify() {
  listeners.forEach((fn) => fn(toasts));
}

export function subscribeToasts(fn) {
  listeners.push(fn);
  fn(toasts);
  return () => {
    listeners = listeners.filter((l) => l !== fn);
  };
}

export function showToast(message, type = "info", durationMs = 3500) {
  const id = nextId++;
  toasts = [...toasts, { id, message, type }];
  notify();
  setTimeout(() => dismissToast(id), durationMs);
}

export function dismissToast(id) {
  toasts = toasts.filter((t) => t.id !== id);
  notify();
}
