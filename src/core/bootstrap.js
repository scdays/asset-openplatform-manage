import store from '@/store'
import storage from 'store'
import { ACCESS_TOKEN } from '@/store/mutation-types'

export default function Initializer () {
  store.commit('SET_TOKEN', storage.get(ACCESS_TOKEN))
}
