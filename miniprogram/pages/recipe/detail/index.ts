import { callFunction } from '../../../utils/request'
import { navigateToAuth } from '../../../utils/route'
import type { ContentDetailData } from '../../../types/cloud'
import { formatDate } from '../../../utils/format'
import { track } from '../../../utils/track'
import { recordContent } from '../../../utils/record'

interface IApp {
  globalData: {
    selectedHostId: string
    homeNeedsRefresh: boolean
  }
}

Page({
  data: {
    loading: true,
    error: '',
    inaccessible: false,
    guest: false,
    contentId: '',
    detail: null as Record<string, unknown> | null,
    fileUrl: '',
    hasFile: false,
    formatDate,
  },

  _hostId: '',

  onLoad(options: Record<string, string | undefined>) {
    const id = options.id
    if (!id) {
      this.setData({ loading: false, inaccessible: true })
      return
    }
    const app = getApp<IApp>()
    this._hostId = app.globalData.selectedHostId
    this.setData({ contentId: id })
    this.loadDetail(id)
  },

  async loadDetail(id: string) {
    this.setData({ loading: true, error: '', inaccessible: false, guest: false })

    const app = getApp<IApp>()
    this._hostId = app.globalData.selectedHostId
    const isGuest = !!this._hostId

    const payload: Record<string, unknown> = { content_id: id, content_type: 'recipe' }
    if (isGuest) payload.host_id = this._hostId

    try {
      const res = await callFunction<ContentDetailData>({
        name: 'content',
        action: 'detail',
        payload,
      })

      const detail = res.data.detail as Record<string, unknown>

      // 游客模式：不加载文件（需登录后才可查看/下载），不记录
      let fileUrl = ''
      if (!isGuest) {
        if (detail.asset_url) {
          fileUrl = detail.asset_url as string
        } else if (detail.asset_file_id) {
          try {
            const tempRes = await wx.cloud.getTempFileURL({
              fileList: [detail.asset_file_id as string],
            })
            const file = tempRes.fileList[0]
            if (file.tempFileURL) fileUrl = file.tempFileURL
          } catch (_) { /* skip */ }
        }
      }

      this.setData({ loading: false, detail, fileUrl, hasFile: !!fileUrl, guest: isGuest })

      track('guita.content.recipe_open', {
        host_id: detail.host_id as string,
        content_id: id,
        guest: isGuest,
      })

      if (!isGuest) {
        recordContent(id, 'view', { progressSec: 0 })
        app.globalData.homeNeedsRefresh = true
      }
    } catch (e) {
      const msg = (e as Error).message || '刚刚网络有点慢，再试一次好么？'

      if (msg.includes('暂未绑定主播') || msg.includes('请先绑定手机号') || msg.includes('用户不存在')) {
        this.setData({ loading: false, inaccessible: true })
        return
      }
      if (msg.includes('内容不存在') || msg.includes('暂不可访问') || msg.includes('类型不正确')) {
        this.setData({ loading: false, inaccessible: true })
        return
      }

      this.setData({ loading: false, error: '刚刚网络有点慢，再试一次好么？' })
    }
  },

  onRetry() {
    if (this.data.contentId) {
      this.loadDetail(this.data.contentId)
    }
  },

  onGoLogin() {
    navigateToAuth()
  },

  onOpenFile() {
    // 游客模式：引导登录
    if (this.data.guest) {
      navigateToAuth()
      return
    }

    const url = this.data.fileUrl
    if (!url) {
      wx.showToast({ title: '暂无可预览文件', icon: 'none' })
      return
    }

    const lower = url.toLowerCase()
    const isImage = /\.(jpg|jpeg|png|webp)(\?|$)/.test(lower)

    wx.navigateTo({
      url: `/pages/preview/index?url=${encodeURIComponent(url)}&type=${isImage ? 'image' : 'other'}`,
      fail: () => {
        wx.showToast({ title: '暂时无法打开该文件', icon: 'none' })
      },
    })
  },

  onGoBack() {
    wx.navigateBack()
  },
})
