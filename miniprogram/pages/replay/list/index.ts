import { callFunction } from '../../../utils/request'
import { redirectToHostSelect, redirectToBindPhone } from '../../../utils/route'
import type { ContentListData } from '../../../types/cloud'
import { formatDate, formatDuration } from '../../../utils/format'
import { track } from '../../../utils/track'

async function resolveCover(item: Record<string, unknown>): Promise<void> {
  if (item.cover_file_id) {
    try {
      const r = await wx.cloud.getTempFileURL({ fileList: [item.cover_file_id as string] })
      if (r.fileList[0].tempFileURL) item.cover_url = r.fileList[0].tempFileURL
    } catch (_) { /* ignore */ }
  }
}

/** 给列表项预处理 model 字段 */
function prepareItems(items: Record<string, unknown>[]) {
  items.forEach((item) => {
    const raw = item.duration_sec
    const sec = typeof raw === 'number' ? raw : Number(raw)
    item.displayDuration = (sec > 0) ? formatDuration(sec) : ''
    item._coverError = false
  })
}

Page({
  data: {
    loading: true,
    loadingMore: false,
    refreshing: false,
    error: '',
    list: [] as Record<string, unknown>[],
    page: 1,
    pageSize: 20,
    total: 0,
    hasMore: true,
    formatDate,
    formatDuration,
  },

  onLoad() {
    this.loadFirstPage()
  },

  onPullDownRefresh() {
    this.setData({ refreshing: true })
    this.doLoad(1, true)
  },

  onReachBottom() {
    this.loadMore()
  },

  loadFirstPage() {
    this.setData({ loading: true, error: '' })
    this.doLoad(1, false)
  },

  async doLoad(page: number, isRefresh: boolean) {
    try {
      const res = await callFunction<ContentListData>({
        name: 'content',
        action: 'list',
        payload: { content_type: 'live_replay', page, page_size: this.data.pageSize },
      })

      const newList = res.data.list as Record<string, unknown>[]
      prepareItems(newList)
      await Promise.all(newList.map(resolveCover))

      const list = page === 1 ? newList : [...this.data.list, ...newList]

      this.setData({
        loading: false,
        loadingMore: false,
        refreshing: false,
        list,
        page,
        total: res.data.total,
        hasMore: list.length < res.data.total,
      })

      wx.stopPullDownRefresh()

      if (page === 1) {
        track('guita.content.replay_list_view', {
          host_id: list.length > 0 ? (list[0].host_id as string) : undefined,
        })
      }
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

      this.setData({
        loading: false,
        refreshing: false,
        loadingMore: false,
        error: '刚刚网络有点慢，再试一次好么？',
      })

      wx.stopPullDownRefresh()
    }
  },

  onCoverError(e: WechatMiniprogram.TouchEvent) {
    const id = e.currentTarget.dataset.id as string
    const idx = this.data.list.findIndex((item: any) => item._id === id)
    if (idx >= 0) {
      this.setData({ [`list[${idx}]._coverError`]: true })
    }
  },

  loadMore() {
    if (this.data.loadingMore || !this.data.hasMore) return
    this.setData({ loadingMore: true })
    this.doLoad(this.data.page + 1, false)
  },

  onRetry() {
    this.loadFirstPage()
  },

  onTapItem(e: WechatMiniprogram.BaseEvent) {
    const id = e.currentTarget.dataset.id as string
    wx.navigateTo({ url: `/pages/replay/detail/index?id=${id}` })
  },
})
