// jsdom に無い API の最小限のスタブ（レイアウトは検証しない）
class RO {
  observe() {}
  unobserve() {}
  disconnect() {}
}
;(globalThis as any).ResizeObserver ??= RO
;(globalThis as any).visualViewport ??= { addEventListener() {}, removeEventListener() {}, width: 1024, height: 768 }
window.matchMedia ??= ((q: string) => ({
  matches: false, media: q, onchange: null,
  addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent: () => false,
})) as any
Element.prototype.scrollTo ??= function () {} as any
