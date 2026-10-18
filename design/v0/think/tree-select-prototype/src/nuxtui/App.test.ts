import { describe, expect, it } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'
import { createRouter, createMemoryHistory } from 'vue-router'
import ui from '@nuxt/ui/vue-plugin'
import App from './App.vue'

async function mountApp() {
  const router = createRouter({ routes: [{ path: '/', component: { template: '<div/>' } }], history: createMemoryHistory() })
  const w = mount(App, { global: { plugins: [router, ui] }, attachTo: document.body })
  await nextTick()
  return w
}
const flush = async () => { for (let i = 0; i < 5; i++) await nextTick() }
const rows = (w: VueWrapper) => w.findAll('tbody tr').filter((r) => r.find('[data-testid^="name-"]').exists())
const has = (w: VueWrapper, id: string) => w.find(`[data-testid="name-${id}"]`).exists()

describe('Nuxt UI の Table（tree data）', () => {
  it('初期表示はカテゴリ16行だけ（子は閉じている）', async () => {
    const w = await mountApp()
    expect(rows(w)).toHaveLength(16)
    w.unmount()
  })

  it('1列目のカテゴリ名をクリックすると子が開き、もう一度で閉じる', async () => {
    const w = await mountApp()
    expect(has(w, 'pop-family/city-pop')).toBe(false)
    await w.get('[data-testid="name-pop-family"]').trigger('click'); await flush()
    expect(has(w, 'pop-family/city-pop')).toBe(true)
    expect(rows(w).length).toBeGreaterThan(16)
    await w.get('[data-testid="name-pop-family"]').trigger('click'); await flush()
    expect(has(w, 'pop-family/city-pop')).toBe(false)
    expect(rows(w)).toHaveLength(16)
    w.unmount()
  })

  it('検索（別名）で、該当カテゴリだけが自動で開いて見える', async () => {
    const w = await mountApp()
    await w.get('input[type="text"]').setValue('シティポップ'); await flush()
    expect(has(w, 'pop-family/city-pop')).toBe(true)
    expect(has(w, 'east-asian-family/city-pop')).toBe(true)
    expect(has(w, 'jazz-family')).toBe(false)
    expect(rows(w)).toHaveLength(4) // カテゴリ2 + City Pop の出現2
    w.unmount()
  })

  it('ひらがなで検索しても見つかる', async () => {
    const w = await mountApp()
    await w.get('input[type="text"]').setValue('してぃぽっぷ'); await flush()
    expect(has(w, 'pop-family/city-pop')).toBe(true)
    w.unmount()
  })

  it('カテゴリ名で検索すると、配下がすべて残る', async () => {
    const w = await mountApp()
    await w.get('input[type="text"]').setValue('ジャズ系'); await flush()
    expect(has(w, 'jazz-family')).toBe(true)
    expect(rows(w).length).toBeGreaterThan(5)
    w.unmount()
  })

  it('検索を消すと元の16行（子は閉じた状態）に戻る', async () => {
    const w = await mountApp()
    await w.get('input[type="text"]').setValue('シティポップ'); await flush()
    await w.get('input[type="text"]').setValue(''); await flush()
    expect(rows(w)).toHaveLength(16)
    w.unmount()
  })

  it('該当なしの検索は、行が0になる', async () => {
    const w = await mountApp()
    await w.get('input[type="text"]').setValue('zzzzzz'); await flush()
    expect(rows(w)).toHaveLength(0)
    w.unmount()
  })

  it('検索で開いたカテゴリを、1列目クリックで閉じて開き直せる', async () => {
    const w = await mountApp()
    await w.get('input[type="text"]').setValue('シティポップ'); await flush()
    await w.get('[data-testid="name-pop-family"]').trigger('click'); await flush()
    expect(has(w, 'pop-family/city-pop')).toBe(false)
    await w.get('[data-testid="name-pop-family"]').trigger('click'); await flush()
    expect(has(w, 'pop-family/city-pop')).toBe(true)
    w.unmount()
  })

  it('3値を切り替えると、同じ語の別カテゴリの出現にも反映される', async () => {
    const w = await mountApp()
    await w.get('input[type="text"]').setValue('シティポップ'); await flush()
    await w.get('[data-testid="state-pop-family/city-pop"]').findAll('button')[0].trigger('click'); await flush()
    const active = w.get('[data-testid="state-east-asian-family/city-pop"]').findAll('button[data-active="true"]')
    expect(active).toHaveLength(1)
    expect(active[0].text()).toBe('使用する')
    expect(w.get('[data-testid="summary"]').text()).toContain('city-pop')
    w.unmount()
  })

  it('カテゴリ内の行は itemOrder の並び（代表項目が先頭）', async () => {
    const w = await mountApp()
    await w.get('[data-testid="name-pop-family"]').trigger('click'); await flush()
    const ids = w.findAll('[data-testid^="name-pop-family/"]').map((n) => n.attributes('data-testid')!.replace('name-pop-family/', ''))
    expect(ids.slice(0, 4)).toEqual(['pop', 'dance-pop', 'synth-pop', 'electropop'])
    w.unmount()
  })

  it('「非表示の語も表示」で、カテゴリ内の語が増える', async () => {
    const w = await mountApp()
    const count = async () => {
      await w.get('[data-testid="name-latin-family"]').trigger('click'); await flush()
      const n = rows(w).length
      await w.get('[data-testid="name-latin-family"]').trigger('click'); await flush()
      return n
    }
    const before = await count()
    await w.get('button[role="checkbox"]').trigger('click'); await flush()
    const after = await count()
    expect(after).toBeGreaterThan(before)
    w.unmount()
  })

  it('展開用の空の行は、カテゴリの直後にだけあり、すべて空のセル（余白と罫線が消える）', async () => {
    const w = await mountApp()
    await w.get('input[type="text"]').setValue('シティポップ'); await flush()
    const all = w.findAll('tbody tr')
    const named = all.filter((r) => r.find('[data-testid^="name-"]').exists())
    const extra = all.filter((r) => !r.find('[data-testid^="name-"]').exists())
    expect(named).toHaveLength(4) // カテゴリ2 + City Pop の出現2
    expect(extra).toHaveLength(2) // 開いたカテゴリの分だけ。語（葉）の行の直後には作られない
    for (const r of extra) {
      // 中身は空（長さ0のテキストノードだけ）。実ブラウザでは :empty に一致し、empty:p-0 で余白が消える。
      // （jsdom の :empty は長さ0のテキストを空と見なさないので、matches(':empty') には頼らない）
      const td = r.get('td').element as HTMLElement
      expect(td.children).toHaveLength(0)
      expect(td.textContent).toBe('')
      expect(td.className).toContain('empty:p-0')
      expect(td.className).toContain('group-has-[td:not(:empty)]:border-b')
    }
    // 空の行の直前は、必ずカテゴリの行
    for (const r of extra) {
      const prev = r.element.previousElementSibling as HTMLElement
      expect(prev.querySelector('[data-testid$="-family"]')).not.toBeNull()
    }
    w.unmount()
  })

  it('カテゴリ名のセルは flex で、アイコンと名前が横に並ぶ（改行されない）', async () => {
    const w = await mountApp()
    const cell = w.get('[data-testid="name-pop-family"]')
    expect(cell.classes()).toContain('flex')
    expect(cell.classes()).toContain('items-center')
    expect(cell.find('svg, .iconify, [class*="i-lucide"]').exists() || cell.findAll('span').length > 0).toBe(true)
    w.unmount()
  })

  it('「非表示の語も表示」を切り替えても、開閉の状態は保たれる', async () => {
    const w = await mountApp()
    await w.get('[data-testid="name-pop-family"]').trigger('click'); await flush()
    expect(has(w, 'pop-family/city-pop')).toBe(true)
    await w.get('button[role="checkbox"]').trigger('click'); await flush()
    expect(has(w, 'pop-family/city-pop')).toBe(true) // 開いたまま
    expect(has(w, 'latin-family/salsa')).toBe(false) // 開いていないカテゴリは閉じたまま
    await w.get('button[role="checkbox"]').trigger('click'); await flush()
    expect(has(w, 'pop-family/city-pop')).toBe(true)
    w.unmount()
  })

  it('検索を消すと、検索前の開閉状態に戻る', async () => {
    const w = await mountApp()
    await w.get('[data-testid="name-jazz-family"]').trigger('click'); await flush()
    await w.get('input[type="text"]').setValue('シティポップ'); await flush()
    expect(has(w, 'pop-family/city-pop')).toBe(true)
    await w.get('input[type="text"]').setValue(''); await flush()
    expect(has(w, 'pop-family/city-pop')).toBe(false)
    expect(has(w, 'jazz-family/jazz')).toBe(true)
    w.unmount()
  })
})
