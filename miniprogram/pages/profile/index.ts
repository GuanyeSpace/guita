import { callFunction } from '../../utils/request'
import { redirectToBindPhone, redirectToHostSelect } from '../../utils/route'
import type { LoginData, GetMyHostData } from '../../types/cloud'
import { maskPhone } from '../../utils/format'
import { track } from '../../utils/track'

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

  onShow() {
    this.loadProfile()
  },

  async loadProfile() {
    this.setData({
      loading: true,
      error: '',
      blocked: false,
      host: null,
      binding: null,
    })

    try {
      const loginRes = await callFunction<LoginData>({
        name: 'auth',
        action: 'login',
      })

      const user = loginRes.data.user as Record<string, unknown>
      const status = loginRes.data.status

      const maskedPhone = maskPhone((user.phone as string) || '')
      this.setData({ user, maskedPhone })

      if (status === 'need_phone') {
        redirectToBindPhone()
        return
      }

      if (status === 'inactive' || status === 'banned') {
        this.setData({ loading: false, blocked: true })
        return
      }

      if (status === 'need_host') {
        this.setData({ loading: false })
        return
      }

      if (status === 'ready') {
        try {
          const hostRes = await callFunction<GetMyHostData>({
            name: 'host',
            action: 'getMyHost',
          })
          this.setData({
            host: hostRes.data.host as Record<string, unknown>,
            binding: hostRes.data.binding as Record<string, unknown>,
          })
        } catch (e) {
          const msg = (e as Error).message || ''
          if (msg.includes('暂未绑定')) {
            this.setData({ loading: false })
          } else {
            this.setData({ loading: false, error: '刚刚网络有点慢，再试一次好么？' })
          }
          return
        }
      }

      this.setData({ loading: false })

      track('guita.profile.view', {
        host_id: this.data.host ? (this.data.host._id as string) : undefined,
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
