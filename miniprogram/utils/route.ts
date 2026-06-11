export function redirectToAuth() {
  wx.redirectTo({ url: '/pages/auth/index' })
}

export function redirectToBindPhone() {
  wx.redirectTo({ url: '/pages/bind-phone/index' })
}

export function redirectToHostSelect() {
  wx.redirectTo({ url: '/pages/host-select/index' })
}

export function switchToHome() {
  wx.switchTab({ url: '/pages/home/index' })
}

export function switchToReplayList() {
  wx.switchTab({ url: '/pages/replay/list/index' })
}

export function switchToRecipeList() {
  wx.switchTab({ url: '/pages/recipe/list/index' })
}

export function switchToProfile() {
  wx.switchTab({ url: '/pages/profile/index' })
}
