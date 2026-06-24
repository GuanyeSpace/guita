import { callFunction } from '../../utils/request'
import { switchToHome, redirectToBindPhone } from '../../utils/route'
import type { Host } from '../../types/host'
import type { HostListData, HostBindData } from '../../types/cloud'
import { track } from '../../utils/track'

Page({
  data: {
    loading: true,
    submitting: false,
    error: '',
    hosts: [] as Host[],
  },

  onLoad() {
    this.loadHosts()
    track('guita.host.select_view')
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

    wx.showModal({
      title: '确认绑定',
      content: `你将绑定「${host.display_name}」。\n\n绑定后，小程序会展示这位老师的直播回放和食谱内容。\n当前版本暂不支持自行更换主播，请确认选择。`,
      success: (modalRes) => {
        if (modalRes.confirm) {
          this.doBind(host)
        }
      },
    })
  },

  async doBind(host: Host) {
    this.setData({ submitting: true, error: '' })

    try {
      await callFunction<HostBindData>({
        name: 'host',
        action: 'bind',
        payload: { host_id: host._id },
      })

      const app = getApp<{ globalData: { homeNeedsRefresh: boolean } }>()
      app.globalData.homeNeedsRefresh = true
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
