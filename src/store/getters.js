const getters = {
  token: state => state.user.token,
  userInfo: state => state.user.info,
  _username: state => state.user._username
}

export default getters
