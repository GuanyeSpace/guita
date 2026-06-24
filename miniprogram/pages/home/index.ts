import { callFunction } from '../../utils/request'
import { redirectToHostSelect, redirectToBindPhone, switchToReplayList, switchToRecipeList } from '../../utils/route'
import type { GetMyHostData, ContentListData } from '../../types/cloud'
import { formatDate, formatDuration } from '../../utils/format'
import { track } from '../../utils/track'

interface IApp {
  globalData: {
    homeNeedsRefresh: boolean
  }
}

async function resolveCover(item: Record<string, unknown>): Promise<void> {
  if (item.cover_file_id) {
    try {
      const r = await wx.cloud.getTempFileURL({ fileList: [item.cover_file_id as string] })
      if (r.fileList[0].tempFileURL) item.cover_url = r.fileList[0].tempFileURL
    } catch (_) { /* ignore */ }
  }
}

interface HomeData {
  host: Record<string, unknown> | null
  replays: Record<string, unknown>[]
  recipes: Record<string, unknown>[]
  replaysEmpty: boolean
  recipesEmpty: boolean
}

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

  /** 首次数据是否已加载完成（onLoad 后置 true） */
  _dataLoaded: false,

  /* ========== 首次加载 ========== */
  onLoad() {
    this.loadHome()
  },

  /* ========== 切回时按需静默刷新 ========== */
  onShow() {
    const app = getApp<IApp>()
    // 首次加载由 onLoad 负责，onShow 不重复触发
    if (!this._dataLoaded) return

    if (app.globalData.homeNeedsRefresh) {
      app.globalData.homeNeedsRefresh = false
      this.silentRefresh()
    }
  },

  /* ========== 下拉刷新（全量，走骨架屏） ========== */
  onPullDownRefresh() {
    this.loadHome().finally(() => {
      wx.stopPullDownRefresh()
    })
  },

  /* ========== 共享数据拉取（loadHome & silentRefresh 共用） ========== */
  async _fetchHomeData(): Promise<HomeData> {
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

    // 计算回放时长显示字段
    replays.forEach((item) => {
      const raw = item.duration_sec
      const sec = typeof raw === 'number' ? raw : Number(raw)
      item.displayDuration = (sec > 0) ? formatDuration(sec) : ''
      item._coverError = false
    })
    recipes.forEach((item) => {
      item._coverError = false
    })

    // 并行加载封面图
    await Promise.all([
      ...replays.map(resolveCover),
      ...recipes.map(resolveCover),
    ])

    return {
      host,
      replays,
      recipes,
      replaysEmpty: replays.length === 0,
      recipesEmpty: recipes.length === 0,
    }
  },

  /* ========== 全量加载（首次 / 下拉刷新，显示骨架屏） ========== */
  async loadHome() {
    this.setData({ loading: true, error: '' })

    try {
      const data = await this._fetchHomeData()

      this.setData({
        loading: false,
        ...data,
      })

      this._dataLoaded = true
      track('guita.home.view', { host_id: (data.host as Record<string, unknown>)._id as string })
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

  /* ========== 静默刷新（无骨架屏，保留现有数据直至新数据就绪） ========== */
  async silentRefresh() {
    try {
      const data = await this._fetchHomeData()
      this.setData(data)
    } catch (_) {
      // 静默刷新失败不提示，保留现有数据
    }
  },

  /* ========== 事件处理（不变） ========== */
  onCoverError(e: WechatMiniprogram.TouchEvent) {
    const id = e.currentTarget.dataset.id as string
    const type = e.currentTarget.dataset.type as string
    const listKey = type === 'replay' ? 'replays' : 'recipes'
    const list = this.data[listKey] as Record<string, unknown>[]
    const idx = list.findIndex((item: any) => item._id === id)
    if (idx >= 0) {
      this.setData({ [`${listKey}[${idx}]._coverError`]: true })
    }
  },

  onRetry() {
    this.loadHome()
  },

  onViewAllReplays() {
    switchToReplayList()
  },

  onViewAllRecipes() {
    switchToRecipeList()
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
