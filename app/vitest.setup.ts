// jsdom に無い API の最小限のスタブ（レイアウトは検証しない）。試作（tree-select-prototype）から流用
class RO {
  observe() {}
  unobserve() {}
  disconnect() {}
}
const g = globalThis as unknown as Record<string, unknown>
g.ResizeObserver ??= RO
g.visualViewport ??= {
  addEventListener() {},
  removeEventListener() {},
  width: 1024,
  height: 768,
}
window.matchMedia ??= ((q: string) => ({
  matches: false,
  media: q,
  onchange: null,
  addListener() {},
  removeListener() {},
  addEventListener() {},
  removeEventListener() {},
  dispatchEvent: () => false,
})) as unknown as typeof window.matchMedia
Element.prototype.scrollTo ??= function () {}
