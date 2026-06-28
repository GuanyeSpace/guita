import { callFunction } from '../../utils/request'
import { redirectToBindPhone, redirectToHostSelect, switchToHome } from '../../utils/route'
import type { LoginData, HostBindData } from '../../types/cloud'
import { track } from '../../utils/track'

interface IApp {
  globalData: {
    homeNeedsRefresh: boolean
    userStatus: string
    selectedHostId: string
    selectedHost: Record<string, unknown> | null
  }
}

Page({
  data: {
    loading: true,
    error: '',
    accountBlocked: false,
  },

  onLoad() {
    this.doLogin()
  },

  async doLogin() {
    this.setData({ loading: true, error: '', accountBlocked: false })

    try {
      const res = await callFunction<LoginData>({
        name: 'auth',
        action: 'login',
      })

      const { status } = res.data
      const app = getApp<IApp>()

      switch (status) {
        case 'need_phone':
          redirectToBindPhone()
          break
        case 'need_host': {
          // 游客之前已选主播 → 弹确认直接绑定
          const pendingHostId = app.globalData.selectedHostId
          const pendingHost = app.globalData.selectedHost
          if (pendingHostId && pendingHost) {
            this._tryAutoBind(pendingHostId, pendingHost.display_name as string)
          } else {
            redirectToHostSelect()
          }
          break
        }
        case 'ready':
          // 登录后清除游客临时选择
          app.globalData.selectedHostId = ''
          app.globalData.selectedHost = null
          switchToHome()
          break
        case 'inactive':
        case 'banned':
          this.setData({ loading: false, accountBlocked: true })
          return
        default:
          this.setData({ loading: false, error: '刚刚网络有点慢，再试一次好么？' })
          return
      }

      track('guita.auth.login_success')
    } catch (e) {
      const msg = (e as Error).message || '刚刚网络有点慢，再试一次好么？'
      this.setData({ loading: false, error: msg })
    }
  },

  /** 自动绑定游客之前选的主播 */
  _tryAutoBind(hostId: string, hostName: string) {
    wx.showModal({
      title: '确认绑定主播',
      content: `检测到你正在浏览「${hostName}」的内容。\n\n是否将其绑定为你的专属老师？\n绑定后可完整观看回放和下载食谱。`,
      confirmText: '确认绑定',
      cancelText: '稍后再说',
      success: async (modalRes) => {
        if (modalRes.confirm) {
          try {
            this.setData({ loading: true })
            await callFunction<HostBindData>({
              name: 'host',
              action: 'bind',
              payload: { host_id: hostId },
            })
            const app = getApp<IApp>()
            app.globalData.selectedHostId = ''
            app.globalData.selectedHost = null
            app.globalData.homeNeedsRefresh = true
            switchToHome()
          } catch (e) {
            const msg = (e as Error).message || ''
            if (msg.includes('请先绑定手机号')) {
              redirectToBindPhone()
            } else {
              this.setData({ loading: false, error: msg || '绑定失败，请稍后再试' })
            }
          }
        } else {
          // 用户取消绑定，去普通选主播页
          redirectToHostSelect()
        }
      },
      fail: () => {
        redirectToHostSelect()
      },
    })
  },

  onRetry() {
    this.doLogin()
  },
})
