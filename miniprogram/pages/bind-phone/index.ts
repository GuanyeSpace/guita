import { callFunction } from '../../utils/request'
import { redirectToHostSelect } from '../../utils/route'
import type { BindPhoneData } from '../../types/cloud'
import { track } from '../../utils/track'

Page({
  data: {
    loading: false,
    error: '',
  },

  async onGetPhoneNumber(e: WechatMiniprogram.ButtonGetPhoneNumber) {
    const detail = e.detail

    if (!detail.code) {
      const errMsg = detail.errMsg || ''
      if (errMsg.includes('fail') || errMsg.includes('deny') || errMsg.includes('cancel')) {
        this.setData({ error: '请先授权手机号，才能继续使用归她。' })
        return
      }
      this.setData({ error: '刚刚网络有点慢，再试一次好么？' })
      return
    }

    this.setData({ loading: true, error: '' })

    try {
      const res = await callFunction<BindPhoneData>({
        name: 'auth',
        action: 'bindPhone',
        payload: { code: detail.code },
      })

      if (res.data.status === 'need_host') {
        track('guita.auth.bind_phone_success')
        redirectToHostSelect()
      } else {
        this.setData({ loading: false, error: '当前账号暂不可用，如有疑问请联系工作人员。' })
      }
    } catch (e) {
      const msg = (e as Error).message || '刚刚网络有点慢，再试一次好么？'
      if (msg.includes('不可用')) {
        this.setData({ loading: false, error: '当前账号暂不可用，如有疑问请联系工作人员。' })
      } else {
        this.setData({ loading: false, error: '刚刚网络有点慢，再试一次好么？' })
      }
    }
  },
})
