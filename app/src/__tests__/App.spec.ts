import { describe, it, expect } from 'vitest'

import { mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import ui from '@nuxt/ui/vue-plugin'
import App from '../App.vue'

describe('App', () => {
  it('Nuxt UI の上で、読み込んだ仕様の件数を表示する', async () => {
    const router = createRouter({ history: createMemoryHistory(), routes: [] })
    const wrapper = mount(App, { global: { plugins: [router, ui] } })
    expect(wrapper.get('[data-testid="song-fields"]').text()).toContain('29')
    expect(wrapper.get('[data-testid="output-fields"]').text()).toContain('10')
    expect(wrapper.get('[data-testid="vocabularies"]').text()).toContain('19')
    expect(wrapper.get('[data-testid="tool-profiles"]').text()).toContain('1')
    // UButton が Nuxt UI の部品として描画されている（未解決の <ubutton> のままではない）
    expect(wrapper.find('button').exists()).toBe(true)
    wrapper.unmount()
  })
})
