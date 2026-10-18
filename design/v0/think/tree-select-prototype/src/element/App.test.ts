import { describe, expect, it } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'
import ElementPlus from 'element-plus'
import App from './App.vue'

async function mountApp() {
  const w = mount(App, { global: { plugins: [ElementPlus] }, attachTo: document.body })
  await nextTick()
  return w
}
const flush = async () => { await nextTick(); await nextTick() }

/** Element Plus は閉じた子行も DOM に置き、display:none で隠す。見えている行だけを数える */
const visibleRows = (w: VueWrapper) =>
  w.findAll('tr.el-table__row').filter((r) => (r.element as HTMLElement).style.display !== 'none')
const visible = (w: VueWrapper, testid: string) => {
  const el = w.find(`[data-testid="${testid}"]`)
  if (!el.exists()) return false
  const tr = el.element.closest('tr') as HTMLElement | null
  return !!tr && tr.style.display !== 'none'
}

describe('Element Plus の階層テーブル', () => {
  it('初期表示は見えている行がカテゴリ16行だけ（子は閉じている）', async () => {
    const w = await mountApp()
    expect(visibleRows(w)).toHaveLength(16)
    w.unmount()
  })

  it('1列目のカテゴリ名をクリックすると子が開き、もう一度で閉じる', async () => {
    const w = await mountApp()
    expect(visible(w, 'name-pop-family/city-pop')).toBe(false)
    await w.get('[data-testid="name-pop-family"]').trigger('click'); await flush()
    expect(visible(w, 'name-pop-family/city-pop')).toBe(true)
    expect(visibleRows(w).length).toBeGreaterThan(16)
    await w.get('[data-testid="name-pop-family"]').trigger('click'); await flush()
    expect(visible(w, 'name-pop-family/city-pop')).toBe(false)
    expect(visibleRows(w)).toHaveLength(16)
    w.unmount()
  })

  it('検索（別名）で、該当カテゴリだけが自動で開いて見える', async () => {
    const w = await mountApp()
    await w.get('input[type="text"]').setValue('シティポップ'); await flush()
    expect(visible(w, 'name-pop-family/city-pop')).toBe(true)
    expect(visible(w, 'name-east-asian-family/city-pop')).toBe(true)
    expect(visible(w, 'name-jazz-family')).toBe(false) // 該当しないカテゴリは消える（DOM にも無い）
    expect(visibleRows(w)).toHaveLength(4) // カテゴリ2 + City Pop の出現2
    w.unmount()
  })

  it('検索を消すと元の16行（子は閉じた状態）に戻る', async () => {
    const w = await mountApp()
    await w.get('input[type="text"]').setValue('シティポップ'); await flush()
    await w.get('input[type="text"]').setValue(''); await flush()
    expect(visibleRows(w)).toHaveLength(16)
    w.unmount()
  })

  it('3値を切り替えると、同じ語の別カテゴリの出現にも反映される', async () => {
    const w = await mountApp()
    await w.get('input[type="text"]').setValue('シティポップ'); await flush()
    const first = w.get('[data-testid="state-pop-family/city-pop"]')
    await first.findAll('label.el-radio-button')[0].find('input').setValue(true); await flush()
    const active = w.get('[data-testid="state-east-asian-family/city-pop"]').findAll('label.el-radio-button.is-active')
    expect(active).toHaveLength(1)
    expect(active[0].text()).toBe('使用する')
    expect(w.get('[data-testid="summary"]').text()).toContain('city-pop')
    w.unmount()
  })

  it('検索して閉じたカテゴリを、1列目クリックでもう一度開閉できる', async () => {
    const w = await mountApp()
    await w.get('input[type="text"]').setValue('シティポップ'); await flush()
    await w.get('[data-testid="name-pop-family"]').trigger('click'); await flush() // 検索で開いた状態から閉じる
    expect(visible(w, 'name-pop-family/city-pop')).toBe(false)
    await w.get('[data-testid="name-pop-family"]').trigger('click'); await flush()
    expect(visible(w, 'name-pop-family/city-pop')).toBe(true)
    w.unmount()
  })

  it('「非表示の語も表示」で、カテゴリ内の語が増える', async () => {
    const w = await mountApp()
    const count = async () => {
      await w.get('[data-testid="name-latin-family"]').trigger('click'); await flush()
      const n = visibleRows(w).length
      await w.get('[data-testid="name-latin-family"]').trigger('click'); await flush()
      return n
    }
    const before = await count()
    await w.get('input[type="checkbox"]').setValue(true); await flush()
    const after = await count()
    expect(after).toBeGreaterThan(before)
    w.unmount()
  })

  it('カテゴリ内の行は itemOrder の並び（代表項目が先頭）', async () => {
    const w = await mountApp()
    await w.get('[data-testid="name-pop-family"]').trigger('click'); await flush()
    const keys = w.findAll('[data-testid^="name-pop-family/"]').map((n) => n.attributes('data-testid')!.replace('name-pop-family/', ''))
    expect(keys.slice(0, 4)).toEqual(['pop', 'dance-pop', 'synth-pop', 'electropop'])
    w.unmount()
  })

  it('該当なしの検索は、行が0になる', async () => {
    const w = await mountApp()
    await w.get('input[type="text"]').setValue('zzzzzz'); await flush()
    expect(visibleRows(w)).toHaveLength(0)
    w.unmount()
  })

  it('「非表示の語も表示」を切り替えても、開閉の状態は保たれる', async () => {
    const w = await mountApp()
    await w.get('[data-testid="name-pop-family"]').trigger('click'); await flush()
    expect(visible(w, 'name-pop-family/city-pop')).toBe(true)
    await w.get('input[type="checkbox"]').setValue(true); await flush()
    expect(visible(w, 'name-pop-family/city-pop')).toBe(true) // 開いたまま
    expect(visible(w, 'name-latin-family/salsa')).toBe(false) // 開いていないカテゴリは閉じたまま
    await w.get('input[type="checkbox"]').setValue(false); await flush()
    expect(visible(w, 'name-pop-family/city-pop')).toBe(true)
    w.unmount()
  })

  it('検索を消すと、検索前の開閉状態に戻る', async () => {
    const w = await mountApp()
    await w.get('[data-testid="name-jazz-family"]').trigger('click'); await flush() // 検索前に開いたもの
    await w.get('input[type="text"]').setValue('シティポップ'); await flush()
    expect(visible(w, 'name-pop-family/city-pop')).toBe(true)
    await w.get('input[type="text"]').setValue(''); await flush()
    expect(visible(w, 'name-pop-family/city-pop')).toBe(false) // 検索で開いたものは閉じる
    expect(visible(w, 'name-jazz-family/jazz')).toBe(true) // 検索前に開いていたものは開いたまま
    w.unmount()
  })

  it('組み込みの矢印で開いた場合も、検索前の開閉状態に戻る', async () => {
    const w = await mountApp()
    const jazzRow = w.get('[data-testid="name-jazz-family"]').element.closest('tr')!
    ;(jazzRow.querySelector('.el-table__expand-icon') as HTMLElement).click(); await flush()
    expect(visible(w, 'name-jazz-family/jazz')).toBe(true)
    await w.get('input[type="text"]').setValue('シティポップ'); await flush()
    await w.get('input[type="text"]').setValue(''); await flush()
    expect(visible(w, 'name-jazz-family/jazz')).toBe(true)
    expect(visible(w, 'name-pop-family/city-pop')).toBe(false)
    w.unmount()
  })
})
