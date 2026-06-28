import { callFunction } from '../../../utils/request'
import { navigateToAuth } from '../../../utils/route'
import type { ContentListData } from '../../../types/cloud'
import { formatDate } from '../../../utils/format'
import { track } from '../../../utils/track'

async function resolveCover(item: Record<string, unknown>): Promise<void> {
  if (item.cover_file_id) {
    try {
      const r = await wx.cloud.getTempFileURL({ fileList: [item.cover_file_id as string] })
      if (r.fileList[0].tempFileURL) item.cover_url = r.fileList[0].tempFileURL
    } catch (_) { /* ignore */ }
  }
}

Page({
  data: {
    loading: true,
    loadingMore: false,
    refreshing: false,
    error: '',
    guest: false,
    list: [] as Record<string, unknown>[],
    page: 1,
    pageSize: 20,
    total: 0,
    hasMore: true,
    formatDate,
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
        payload: { content_type: 'recipe', page, page_size: this.data.pageSize },
      })

      const newList = res.data.list as Record<string, unknown>[]
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
        track('guita.content.recipe_list_view', {
          host_id: list.length > 0 ? (list[0].host_id as string) : undefined,
        })
      }
    } catch (e) {
      const msg = (e as Error).message || '刚刚网络有点慢，再试一次好么？'

      // 游客态：未登录/未绑定时不强制跳转
      if (msg.includes('暂未绑定主播') || msg.includes('请先绑定手机号') || msg.includes('用户不存在')) {
        this.setData({
          loading: false,
          refreshing: false,
          loadingMore: false,
          guest: true,
          list: [],
        })
        wx.stopPullDownRefresh()
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

  loadMore() {
    if (this.data.loadingMore || !this.data.hasMore) return
    this.setData({ loadingMore: true })
    this.doLoad(this.data.page + 1, false)
  },

  onRetry() {
    this.loadFirstPage()
  },

  onGoLogin() {
    navigateToAuth()
  },

  onTapItem(e: WechatMiniprogram.BaseEvent) {
    const id = e.currentTarget.dataset.id as string
    wx.navigateTo({ url: `/pages/recipe/detail/index?id=${id}` })
  },
})
