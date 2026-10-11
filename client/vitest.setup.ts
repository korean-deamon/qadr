import "@testing-library/jest-dom/vitest"

// jsdom has no matchMedia / IntersectionObserver; components gate effects on them.
if (!window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList
}

class IO {
  static instances: IO[] = []
  constructor(public cb: IntersectionObserverCallback) {
    IO.instances.push(this)
  }
  observe(el: Element) {
    this.cb([{ isIntersecting: true, target: el } as IntersectionObserverEntry], this as unknown as IntersectionObserver)
  }
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return []
  }
}
if (!("IntersectionObserver" in window)) {
  Object.assign(window, { IntersectionObserver: IO })
}
