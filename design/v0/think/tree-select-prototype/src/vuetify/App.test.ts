import { describe, expect, it } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'
import { vuetify } from './plugin'
import App from './App.vue'

async function mountApp() {
  const w = mount(App, { global: { plugins: [vuetify] }, attachTo: document.body })
  await nextTick()
  return w
}
const flush = async () => { for (let i = 0; i < 4; i++) await nextTick() }

const groupCount = (w: VueWrapper) => w.findAll('td.group-cell').length
const itemRowCount = (w: VueWrapper) => w.findAll('[data-testid^="name-"]').length

describe('Vuetify の DataTable（グループ化）', () => {
  it('初期表示はグループ16行だけで、語の行は出ない（閉じている）', async () => {
    const w = await mountApp()
    expect(groupCount(w)).toBe(16)
    expect(itemRowCount(w)).toBe(0)
    w.unmount()
  })

  it('グループ見出しのクリックで開閉できる', async () => {
    const w = await mountApp()
    await w.get('[data-testid="group-0010|pop-family"]').trigger('click'); await flush()
    expect(w.find('[data-testid="name-pop-family/city-pop"]').exists()).toBe(true)
    expect(itemRowCount(w)).toBeGreaterThan(0)
    await w.get('[data-testid="group-0010|pop-family"]').trigger('click'); await flush()
    expect(itemRowCount(w)).toBe(0)
    w.unmount()
  })

  it('グループの並びはカテゴリの order 順', async () => {
    const w = await mountApp()
    const ids = w.findAll('td.group-cell').map((g) => g.attributes('data-testid')!)
    expect(ids).toEqual([...ids].sort())
    expect(ids[0]).toContain('pop-family')
    w.unmount()
  })

  it('検索（別名）で、該当グループだけが自動で開いて見える', async () => {
    const w = await mountApp()
    await w.get('input[type="text"]').setValue('シティポップ'); await flush()
    expect(groupCount(w)).toBe(2)
    expect(w.find('[data-testid="name-pop-family/city-pop"]').exists()).toBe(true)
    expect(w.find('[data-testid="name-east-asian-family/city-pop"]').exists()).toBe(true)
    expect(itemRowCount(w)).toBe(2)
    w.unmount()
  })

  it('検索を消すと元の16グループ（閉じた状態）に戻る', async () => {
    const w = await mountApp()
    await w.get('input[type="text"]').setValue('シティポップ'); await flush()
    await w.get('input[type="text"]').setValue(''); await flush()
    expect(groupCount(w)).toBe(16)
    expect(itemRowCount(w)).toBe(0)
    w.unmount()
  })

  it('3値を切り替えると、同じ語の別グループの出現にも反映される', async () => {
    const w = await mountApp()
    await w.get('input[type="text"]').setValue('シティポップ'); await flush()
    const first = w.get('[data-testid="state-pop-family/city-pop"]')
    await first.findAll('button')[0].trigger('click'); await flush()
    const other = w.get('[data-testid="state-east-asian-family/city-pop"]')
    const active = other.findAll('button.v-btn--active')
    expect(active).toHaveLength(1)
    expect(active[0].text()).toBe('使用する')
    expect(w.get('[data-testid="summary"]').text()).toContain('city-pop')
    w.unmount()
  })

  it('「非表示の語も表示」で、グループ内の語が増える', async () => {
    const w = await mountApp()
    const count = async () => {
      await w.get('[data-testid="group-0110|latin-family"]').trigger('click'); await flush()
      const n = itemRowCount(w)
      await w.get('[data-testid="group-0110|latin-family"]').trigger('click'); await flush()
      return n
    }
    const before = await count()
    await w.get('input[type="checkbox"]').setValue(true); await flush()
    const after = await count()
    expect(after).toBeGreaterThan(before)
    w.unmount()
  })

  it('グループ内の行は itemOrder の並び（代表項目が先頭）', async () => {
    const w = await mountApp()
    await w.get('[data-testid="group-0010|pop-family"]').trigger('click'); await flush()
    const keys = w.findAll('[data-testid^="name-"]').map((n) => n.attributes('data-testid')!.replace('name-pop-family/', ''))
    expect(keys.slice(0, 4)).toEqual(['pop', 'dance-pop', 'synth-pop', 'electropop'])
    w.unmount()
  })

  it('該当なしの検索は、グループが0になる', async () => {
    const w = await mountApp()
    await w.get('input[type="text"]').setValue('zzzzzz'); await flush()
    expect(groupCount(w)).toBe(0)
    w.unmount()
  })

  it('「非表示の語も表示」を切り替えても、開閉の状態は保たれる', async () => {
    const w = await mountApp()
    await w.get('[data-testid="group-0010|pop-family"]').trigger('click'); await flush()
    expect(w.find('[data-testid="name-pop-family/city-pop"]').exists()).toBe(true)
    await w.get('input[type="checkbox"]').setValue(true); await flush()
    expect(w.find('[data-testid="name-pop-family/city-pop"]').exists()).toBe(true) // 開いたまま
    expect(w.find('[data-testid="name-latin-family/salsa"]').exists()).toBe(false) // 開いていないグループは閉じたまま
    await w.get('input[type="checkbox"]').setValue(false); await flush()
    expect(w.find('[data-testid="name-pop-family/city-pop"]').exists()).toBe(true)
    w.unmount()
  })

  it('検索を消すと、検索前の開閉状態に戻る', async () => {
    const w = await mountApp()
    await w.get('[data-testid="group-0070|jazz-family"]').trigger('click'); await flush()
    await w.get('input[type="text"]').setValue('シティポップ'); await flush()
    expect(w.find('[data-testid="name-pop-family/city-pop"]').exists()).toBe(true)
    await w.get('input[type="text"]').setValue(''); await flush()
    expect(w.find('[data-testid="name-pop-family/city-pop"]').exists()).toBe(false)
    expect(w.find('[data-testid="name-jazz-family/jazz"]').exists()).toBe(true)
    w.unmount()
  })
})
