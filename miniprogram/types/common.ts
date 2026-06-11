export interface IAppOption {
  globalData: {
    userInfo?: WechatMiniprogram.UserInfo
    userReady: boolean
    hostSelected: boolean
  }
  userInfoReadyCallback?: WechatMiniprogram.GetUserInfoSuccessCallback
}
