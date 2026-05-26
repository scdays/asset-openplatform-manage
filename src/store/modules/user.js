const user = {
  state: {
    token: '',
    username: '',
    account: '',
    _username: '',
    info: {},
    pStore: null
  },
  mutations: {
    SET_TOKEN: (state, token) => {
      state.token = token
    },
    SET_NAME: (state, { account, username, _username } = {}) => {
      state._username = _username
      state.username = username
      state.account = account
    },
    SET_INFO: (state, info) => {
      state.info = info || {}
    },
    SET_PARENTSTORE: (state, pStore) => {
      state.pStore = pStore
    }
  }
}

export default user
