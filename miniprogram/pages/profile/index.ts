import { callFunction } from '../../utils/request'
import { redirectToBindPhone, redirectToHostSelect } from '../../utils/route'
import type { LoginData, GetMyHostData } from '../../types/cloud'
import { maskPhone } from '../../utils/format'
import { track } from '../../utils/track'

interface IApp {
  globalData: {
    homeNeedsRefresh: boolean
  }
}

interface ProfileData {
  user: Record<string, unknown>
  status: string
  maskedPhone: string
  host: Record<string, unknown> | null
  binding: Record<string, unknown> | null
}

Page({
  data: {
    loading: true,
    error: '',
    user: null as Record<string, unknown> | null,
    host: null as Record<string, unknown> | null,
    binding: null as Record<string, unknown> | null,
    maskedPhone: '',
    blocked: false,
  },

  /** 首次数据是否已完成（onLoad 后置 true） */
  _dataLoaded: false,

  /* ========== 首次加载 ========== */
  onLoad() {
    this.loadProfile()
  },

  /* ========== 切回时按需静默刷新 ========== */
  onShow() {
    const app = getApp<IApp>()
    if (!this._dataLoaded) return

    if (app.globalData.homeNeedsRefresh) {
      app.globalData.homeNeedsRefresh = false
      this.silentRefresh()
    }
  },

  /* ========== 共享数据拉取 ========== */
  async _fetchProfileData(): Promise<ProfileData> {
    const loginRes = await callFunction<LoginData>({
      name: 'auth',
      action: 'login',
    })

    const user = loginRes.data.user as Record<string, unknown>
    const status = loginRes.data.status
    const maskedPhone = maskPhone((user.phone as string) || '')

    let host: Record<string, unknown> | null = null
    let binding: Record<string, unknown> | null = null

    if (status === 'ready') {
      try {
        const hostRes = await callFunction<GetMyHostData>({
          name: 'host',
          action: 'getMyHost',
        })
        host = hostRes.data.host as Record<string, unknown>
        binding = hostRes.data.binding as Record<string, unknown>
      } catch (e) {
        const msg = (e as Error).message || ''
        if (!msg.includes('暂未绑定')) throw e
      }
    }

    return { user, status, maskedPhone, host, binding }
  },

  /* ========== 全量加载（首次，显示加载态） ========== */
  async loadProfile() {
    this.setData({ loading: true, error: '', blocked: false, host: null, binding: null })

    try {
      const data = await this._fetchProfileData()

      if (data.status === 'need_phone') {
        redirectToBindPhone()
        return
      }

      if (data.status === 'inactive' || data.status === 'banned') {
        this.setData({ loading: false, user: data.user, maskedPhone: data.maskedPhone, blocked: true })
        return
      }

      if (data.status === 'need_host') {
        this.setData({ loading: false, user: data.user, maskedPhone: data.maskedPhone })
        this._dataLoaded = true
        return
      }

      // status === 'ready'
      this.setData({
        loading: false,
        user: data.user,
        maskedPhone: data.maskedPhone,
        host: data.host,
        binding: data.binding,
      })

      this._dataLoaded = true
      track('guita.profile.view', {
        host_id: data.host ? (data.host._id as string) : undefined,
      })
    } catch (e) {
      const msg = (e as Error).message || '刚刚网络有点慢，再试一次好么？'
      if (msg.includes('请先绑定手机号')) {
        redirectToBindPhone()
        return
      }
      this.setData({ loading: false, error: '刚刚网络有点慢，再试一次好么？' })
    }
  },

  /* ========== 静默刷新（无加载态，保留现有数据） ========== */
  async silentRefresh() {
    try {
      const data = await this._fetchProfileData()

      // 静默刷新不下发降级（不把 ready → need_host / blocked）
      if (data.status !== 'ready') return

      this.setData({
        user: data.user,
        maskedPhone: data.maskedPhone,
        host: data.host,
        binding: data.binding,
      })
    } catch (_) {
      // 静默刷新失败不提示，保留现有数据
    }
  },

  /* ========== 事件处理（不变） ========== */
  onRetry() {
    this.loadProfile()
  },

  onGoHostSelect() {
    redirectToHostSelect()
  },

  onCopyGuitaId() {
    const guitaId = this.data.user?.guita_id as string | undefined
    if (!guitaId) {
      wx.showToast({ title: '暂无可复制的归她 ID', icon: 'none' })
      return
    }
    wx.setClipboardData({
      data: guitaId,
      success: () => {
        wx.showToast({ title: '已复制', icon: 'success' })
      },
    })
  },
})
