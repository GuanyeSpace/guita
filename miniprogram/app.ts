import { callFunction } from './utils/request'

App({
  globalData: {
    /** 首页是否需要刷新：切换主播/记录观看等操作后置 true，首页 onShow 消费后置 false */
    homeNeedsRefresh: false,
    /** 用户登录状态（静默获取后缓存） */
    userStatus: '' as string,
  },

  onLaunch() {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
      return;
    }
    wx.cloud.init({
      env: 'cloud1-d2gplb1ikea96e2c8',
      traceUser: true,
    });

    // 监听隐私授权需要（配合 __usePrivacyCheck__: true）
    this._setupPrivacyListener()

    // 静默登录：创建/确认用户记录，不跳转、不弹窗
    this.silentLogin()
  },

  /** 注册隐私授权监听，低版本基础库容错 */
  _setupPrivacyListener() {
    // __usePrivacyCheck__: true 已配置，框架会自动弹出隐私弹窗
    // onNeedPrivacyAuthorization 用于监听隐私接口调用时机
    if (typeof wx.onNeedPrivacyAuthorization !== 'function') return

    wx.onNeedPrivacyAuthorization((resolve) => {
      // 框架已弹出官方隐私协议弹窗，用户操作后回调 resolve
      // resolve 应在用户点击同意/拒绝按钮后被调用
      // 这里提供兜底：若因异常未回调，10s 后自动按拒绝处理
      const timeout = setTimeout(() => {
        resolve({ event: 'disagree' })
      }, 10000)

      // 将 resolve 挂到全局供可能需要的自定义处理使用
      const app = this as unknown as Record<string, unknown>
      app._privacyResolve = (result: { event: string; buttonId?: string }) => {
        clearTimeout(timeout)
        resolve(result)
      }
    })
  },

  /** 静默登录：仅确保云端用户记录存在，不进行任何页面跳转 */
  async silentLogin() {
    try {
      const res = await callFunction<{ status: string }>({
        name: 'auth',
        action: 'login',
      })
      this.globalData.userStatus = res.data.status
    } catch (_) {
      // 静默失败，不阻塞用户浏览
    }
  },
});
