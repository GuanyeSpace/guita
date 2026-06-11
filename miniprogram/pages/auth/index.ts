import { callFunction } from '../../utils/request'
import { redirectToBindPhone, redirectToHostSelect, switchToHome } from '../../utils/route'
import type { LoginData } from '../../types/cloud'

Page({
  data: {
    loading: true,
    error: '',
    accountBlocked: false,
  },

  onLoad() {
    this.doLogin()
  },

  async doLogin() {
    this.setData({ loading: true, error: '', accountBlocked: false })

    try {
      const res = await callFunction<LoginData>({
        name: 'auth',
        action: 'login',
      })

      const { status } = res.data

      switch (status) {
        case 'need_phone':
          redirectToBindPhone()
          break
        case 'need_host':
          redirectToHostSelect()
          break
        case 'ready':
          switchToHome()
          break
        case 'inactive':
        case 'banned':
          this.setData({ loading: false, accountBlocked: true })
          break
        default:
          this.setData({ loading: false, error: '刚刚网络有点慢，再试一次好么？' })
      }
    } catch (e) {
      const msg = (e as Error).message || '刚刚网络有点慢，再试一次好么？'
      this.setData({ loading: false, error: msg })
    }
  },

  onRetry() {
    this.doLogin()
  },
})
