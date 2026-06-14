import { callFunction } from '../../../utils/request'
import { redirectToHostSelect, redirectToBindPhone } from '../../../utils/route'
import type { ContentDetailData } from '../../../types/cloud'
import { formatDate, formatDuration } from '../../../utils/format'
import { track } from '../../../utils/track'

Page({
  data: {
    loading: true,
    error: '',
    inaccessible: false,
    contentId: '',
    detail: null as Record<string, unknown> | null,
    videoSrc: '',
    formatDate,
    formatDuration,
  },

  onLoad(options: Record<string, string | undefined>) {
    const id = options.id
    if (!id) {
      this.setData({ loading: false, inaccessible: true, error: '该内容暂不可访问。' })
      return
    }
    this.setData({ contentId: id })
    this.loadDetail(id)
  },

  async loadDetail(id: string) {
    this.setData({ loading: true, error: '', inaccessible: false })

    try {
      const res = await callFunction<ContentDetailData>({
        name: 'content',
        action: 'detail',
        payload: { content_id: id, content_type: 'live_replay' },
      })

      const detail = res.data.detail as Record<string, unknown>

      let videoSrc = ''
      if (detail.asset_url) {
        videoSrc = detail.asset_url as string
      } else if (detail.asset_file_id) {
        try {
          const tempRes = await wx.cloud.getTempFileURL({
            fileList: [detail.asset_file_id as string],
          })
          const file = tempRes.fileList[0]
          if (file.tempFileURL) {
            videoSrc = file.tempFileURL
          }
        } catch (_) {
          // videoSrc stays empty
        }
      }

      this.setData({ loading: false, detail, videoSrc })

      track('guita.content.replay_open', {
        host_id: detail.host_id as string,
        content_id: id,
      })
    } catch (e) {
      const msg = (e as Error).message || '刚刚网络有点慢，再试一次好么？'

      if (msg.includes('暂未绑定主播')) {
        redirectToHostSelect()
        return
      }
      if (msg.includes('请先绑定手机号')) {
        redirectToBindPhone()
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

  onGoBack() {
    wx.navigateBack()
  },
})
