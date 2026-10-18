import './main.css'
import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import ui from '@nuxt/ui/vue-plugin'
import App from './App.vue'

const router = createRouter({ routes: [], history: createWebHistory() })
createApp(App).use(router).use(ui).mount('#app')
