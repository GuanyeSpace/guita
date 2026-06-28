import { callFunction } from '../../utils/request'
import { switchToHome, redirectToBindPhone } from '../../utils/route'
import type { Host } from '../../types/host'
import type { HostListData, HostBindData } from '../../types/cloud'
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
    submitting: false,
    error: '',
    hosts: [] as Host[],
    /** 是否为游客选主播模式（非登录绑定） */
    isGuest: false,
  },

  onLoad() {
    const app = getApp<IApp>()
    // 登录后需要绑定主播的状态 → 走绑定流程；否则为游客临时选主播
    const isGuest = app.globalData.userStatus !== 'need_host'
    this.setData({ isGuest })

    // 登录后且有待绑定主播 → 直接弹确认绑定
    if (!isGuest && app.globalData.selectedHostId && app.globalData.selectedHost) {
      this._autoBindPendingHost(
        app.globalData.selectedHostId,
        app.globalData.selectedHost.display_name as string,
      )
      return
    }

    this.loadHosts()
    track('guita.host.select_view')
  },

  /** 登录后自动绑定游客之前选的主播 */
  async _autoBindPendingHost(hostId: string, hostName: string) {
    this.setData({ loading: true })
    // 先加载列表以便后续可能的手动选主播
    await this.loadHostsSilent()

    wx.showModal({
      title: '确认绑定主播',
      content: `检测到你正在浏览「${hostName}」的内容。\n\n是否将其绑定为你的专属老师？\n绑定后可完整观看回放和下载食谱。`,
      confirmText: '确认绑定',
      cancelText: '手动选择',
      success: async (modalRes) => {
        if (modalRes.confirm) {
          try {
            this.setData({ submitting: true })
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
          } catch (e: any) {
            const msg = (e as Error).message || ''
            if (msg.includes('请先绑定手机号')) {
              redirectToBindPhone()
            } else {
              this.setData({ loading: false, submitting: false, error: msg || '绑定失败，请稍后再试' })
            }
          }
        } else {
          // 用户选择手动选主播
          this.setData({ loading: false })
          this.loadHosts()
          track('guita.host.select_view')
        }
      },
      fail: () => {
        this.setData({ loading: false })
        this.loadHosts()
        track('guita.host.select_view')
      },
    })
  },

  /** 静默加载主播列表（不显示 loading） */
  async loadHostsSilent() {
    try {
      const res = await callFunction<HostListData>({
        name: 'host',
        action: 'listActive',
      })
      this.setData({ hosts: res.data.list as unknown as Host[] })
    } catch (_) { /* ignore */ }
  },

  async loadHosts() {
    this.setData({ loading: true, error: '' })

    try {
      const res = await callFunction<HostListData>({
        name: 'host',
        action: 'listActive',
      })
      this.setData({ loading: false, hosts: res.data.list as unknown as Host[] })
    } catch (e) {
      const msg = (e as Error).message || '刚刚网络有点慢，再试一次好么？'
      this.setData({ loading: false, error: msg })
    }
  },

  onRetry() {
    this.loadHosts()
  },

  onSelectHost(e: WechatMiniprogram.BaseEvent) {
    if (this.data.submitting) return
    const host = e.currentTarget.dataset.host as Host

    if (this.data.isGuest) {
      // 游客模式：直接本地记录，不调云端绑定接口
      this._guestSelectHost(host)
    } else {
      // 登录绑定模式：弹确认后调用云端绑定
      wx.showModal({
        title: '确认绑定',
        content: `你将绑定「${host.display_name}」。\n\n绑定后，小程序会展示这位老师的直播回放和食谱内容。\n当前版本暂不支持自行更换主播，请确认选择。`,
        success: (modalRes) => {
          if (modalRes.confirm) {
            this.doBind(host)
          }
        },
      })
    }
  },

  /** 游客本地选主播：存全局 + 回首页 */
  _guestSelectHost(host: Host) {
    const app = getApp<IApp>()
    app.globalData.selectedHostId = host._id
    app.globalData.selectedHost = host as unknown as Record<string, unknown>
    app.globalData.homeNeedsRefresh = true
    track('guita.host.guest_select', { host_id: host._id })
    switchToHome()
  },

  async doBind(host: Host) {
    this.setData({ submitting: true, error: '' })

    try {
      await callFunction<HostBindData>({
        name: 'host',
        action: 'bind',
        payload: { host_id: host._id },
      })

      const app = getApp<IApp>()
      app.globalData.homeNeedsRefresh = true
      // 绑定成功后清除游客临时选择
      app.globalData.selectedHostId = ''
      app.globalData.selectedHost = null
      switchToHome()
    } catch (e) {
      const msg = (e as Error).message || '刚刚网络有点慢，再试一次好么？'
      this.setData({ submitting: false, error: msg })

      if (msg.includes('请先绑定手机号')) {
        redirectToBindPhone()
      }
    }
  },
})
