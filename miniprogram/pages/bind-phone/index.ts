import { callFunction } from '../../utils/request'
import { redirectToHostSelect } from '../../utils/route'
import type { BindPhoneData } from '../../types/cloud'
import { track } from '../../utils/track'

Page({
  data: {
    loading: false,
    error: '',
    /** 是否已勾选同意协议 */
    agreed: false,
    /** 勾选框高亮抖动 */
    shakeAgreement: false,
  },

  /** 切换协议勾选状态 */
  onToggleAgreement() {
    this.setData({ agreed: !this.data.agreed, shakeAgreement: false })
  },

  /** 点击协议链接：用户服务协议 */
  onOpenUserAgreement() {
    wx.navigateTo({ url: '/pages/agreement/user/index' })
  },

  /** 点击协议链接：隐私政策 */
  onOpenPrivacyPolicy() {
    wx.navigateTo({ url: '/pages/agreement/privacy/index' })
  },

  /** 触发隐私授权弹窗 */
  _requirePrivacy(): Promise<{ buttonId?: string; event: string }> {
    return new Promise((resolve) => {
      // 低版本基础库兼容
      if (typeof wx.requirePrivacyAuthorize !== 'function') {
        resolve({ event: 'agree' })
        return
      }

      // 先检查是否已经同意过
      if (typeof wx.getPrivacySetting === 'function') {
        wx.getPrivacySetting({
          success: (res) => {
            if (res.needAuthorization) {
              // 需要授权，调用 requirePrivacyAuthorize 触发弹窗
              wx.requirePrivacyAuthorize({
                success: () => {
                  resolve({ event: 'agree' })
                },
                fail: () => {
                  resolve({ event: 'disagree' })
                },
              })
            } else {
              // 已同意过
              resolve({ event: 'agree' })
            }
          },
          fail: () => {
            resolve({ event: 'agree' })
          },
        })
      } else {
        resolve({ event: 'agree' })
      }
    })
  },

  async onGetPhoneNumber(e: WechatMiniprogram.ButtonGetPhoneNumber) {
    const detail = e.detail

    // 校验协议勾选
    if (!this.data.agreed) {
      this.setData({ shakeAgreement: true })
      wx.showToast({ title: '请先阅读并同意协议', icon: 'none', duration: 2000 })
      setTimeout(() => {
        this.setData({ shakeAgreement: false })
      }, 600)
      return
    }

    if (!detail.code) {
      const errMsg = detail.errMsg || ''
      if (errMsg.includes('fail') || errMsg.includes('deny') || errMsg.includes('cancel')) {
        this.setData({ error: '获取手机号失败。绑定手机号后才能使用归她。' })
        return
      }
      this.setData({ error: '刚刚网络有点慢，再试一次好么？' })
      return
    }

    // 隐私授权确认
    const privacyResult = await this._requirePrivacy()
    if (privacyResult.event === 'disagree') {
      wx.showToast({ title: '需同意隐私政策才能绑定手机号', icon: 'none', duration: 2000 })
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
