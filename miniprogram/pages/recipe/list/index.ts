import { callFunction } from '../../../utils/request'
import { redirectToHostSelect, redirectToBindPhone } from '../../../utils/route'
import type { ContentListData } from '../../../types/cloud'
import { formatDate } from '../../../utils/format'
import { track } from '../../../utils/track'

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
      const list = page === 1 ? newList : [...this.data.list, ...newList]

      this.setData({
        loading: false,
        refreshing: false,
        list,
        page,
        total: res.data.total,
        hasMore: list.length < res.data.total,
      })

      if (page === 1) {
        track('guita.content.recipe_list_view', {
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
        error: page === 1 ? '刚刚网络有点慢，再试一次好么？' : '',
      })
      if (page > 1) {
        wx.showToast({ title: '刚刚网络有点慢，再试一次好么？', icon: 'none' })
      }
    } finally {
      if (isRefresh) wx.stopPullDownRefresh()
    }
  },

  async loadMore() {
    if (this.data.loadingMore || !this.data.hasMore) return
    this.setData({ loadingMore: true })
    await this.doLoad(this.data.page + 1, false)
    this.setData({ loadingMore: false })
  },

  onRetry() {
    this.loadFirstPage()
  },

  onTapItem(e: WechatMiniprogram.BaseEvent) {
    const id = e.currentTarget.dataset.id as string
    wx.navigateTo({ url: `/pages/recipe/detail/index?id=${id}` })
  },
})
