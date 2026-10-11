type Toast = typeof import("sonner").toast

/** Fire a toast without putting sonner in the initial bundle (it loads on first use). */
export function notify(...args: Parameters<Toast>) {
  void import("sonner").then(({ toast }) => toast(...args))
}
