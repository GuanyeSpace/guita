import { callFunction } from '../../utils/request'
import { redirectToHostSelect, redirectToBindPhone } from '../../utils/route'
import type { GetMyHostData, ContentListData } from '../../types/cloud'
import { formatDate, formatDuration } from '../../utils/format'
import { track } from '../../utils/track'

Page({
  data: {
    loading: true,
    error: '',
    host: null as Record<string, unknown> | null,
    replays: [] as Record<string, unknown>[],
    recipes: [] as Record<string, unknown>[],
    replaysEmpty: false,
    recipesEmpty: false,
    formatDate,
    formatDuration,
  },

  onShow() {
    this.loadHome()
  },

  async loadHome() {
    this.setData({ loading: true, error: '' })

    try {
      const hostRes = await callFunction<GetMyHostData>({
        name: 'host',
        action: 'getMyHost',
      })

      const host = hostRes.data.host

      const [replayRes, recipeRes] = await Promise.all([
        callFunction<ContentListData>({
          name: 'content',
          action: 'list',
          payload: { content_type: 'live_replay', page: 1, page_size: 3 },
        }),
        callFunction<ContentListData>({
          name: 'content',
          action: 'list',
          payload: { content_type: 'recipe', page: 1, page_size: 3 },
        }),
      ])

      const replays = replayRes.data.list as Record<string, unknown>[]
      const recipes = recipeRes.data.list as Record<string, unknown>[]

      this.setData({
        loading: false,
        host,
        replays,
        recipes,
        replaysEmpty: replays.length === 0,
        recipesEmpty: recipes.length === 0,
      })

      track('guita.home.view', { host_id: (host as Record<string, unknown>)._id as string })
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

      this.setData({ loading: false, error: '刚刚网络有点慢，再试一次好么？' })
    }
  },

  onRetry() {
    this.loadHome()
  },

  onTapReplay(e: WechatMiniprogram.BaseEvent) {
    const id = e.currentTarget.dataset.id as string
    wx.navigateTo({ url: `/pages/replay/detail/index?id=${id}` })
  },

  onTapRecipe(e: WechatMiniprogram.BaseEvent) {
    const id = e.currentTarget.dataset.id as string
    wx.navigateTo({ url: `/pages/recipe/detail/index?id=${id}` })
  },
})
