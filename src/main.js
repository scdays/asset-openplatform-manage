import './public-path'
import Vue from 'vue'
import VueRouter from 'vue-router'
import App from './App.vue'
import routes from './router'
import store from './store/'
import themePluginConfig from '../config/themePluginConfig'
import Initializer from './core/bootstrap'
import './core/lazy_use'
import './utils/filter'
import './global.less'
import storage from 'store'
import { ACCESS_TOKEN } from '@/store/mutation-types'

Vue.config.productionTip = false
Vue.use(VueRouter)

window.umi_plugin_ant_themeVar = themePluginConfig.theme

let router = null
let instance = null

function render (props = {}) {
  if (props.store) {
    let tk = props.store.getters.token
    tk = 'JWT ' + tk.replace(/JWT /g, '')
    storage.set(ACCESS_TOKEN, tk)
    store.commit('SET_TOKEN', tk)
    store.commit('SET_NAME', { '_username': props.store.getters._username })
    store.commit('SET_INFO', props.store.getters.userInfo)
    store.commit('SET_PARENTSTORE', props.store)
    Vue.prototype.$parentStore = props.store
  }

  const { container } = props
  const mountTarget = container
    ? container.querySelector('#child_openPlatform_container')
    : document.querySelector('#child_openPlatform_container')
  router = new VueRouter({
    base: window.__POWERED_BY_QIANKUN__ ? '/openPlatform' : '/',
    mode: 'history',
    routes
  })

  instance = new Vue({
    router,
    store,
    data () {
      return {
        parentStore: props.store,
        parentRoute: props.router
      }
    },
    created: Initializer,
    render: h => h(App)
  }).$mount(mountTarget || '#child_openPlatform_container')
}

if (!window.__POWERED_BY_QIANKUN__) {
  render()
}

export async function bootstrap () {
  // qiankun lifecycle
}

export async function mount (props) {
  render(Object.assign({}, props.data || {}, { container: props && props.container }))
}

export async function unmount () {
  instance.$destroy()
  instance = null
  router = null
}
