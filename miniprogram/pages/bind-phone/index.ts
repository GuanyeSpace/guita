// pages/bind-phone/index.ts
import { bindPhone } from '../../services/auth';

Page({
  data: {
    loading: false,
    error: '',
    devMode: false,
    devPhone: '',
    devLoading: false,
  },

  onLoad() {
    // 三击标题区域进入开发模式（模拟器测试用）
    let tapCount = 0;
    let tapTimer: any = null;
    // @ts-ignore
    this._devTapHandler = () => {
      tapCount++;
      if (tapCount === 1) {
        tapTimer = setTimeout(() => { tapCount = 0; }, 800);
      } else if (tapCount === 3) {
        clearTimeout(tapTimer);
        tapCount = 0;
        this.setData({ devMode: !this.data.devMode });
        if (!this.data.devMode) {
          this.setData({ devPhone: '' });
        }
      }
    };
  },

  // 一键绑定手机号
  async onBindPhone(e: any) {
    const { code, errMsg } = e.detail;
    if (errMsg !== 'getPhoneNumber:ok' || !code) {
      wx.showToast({ title: '需要授权手机号才能继续', icon: 'none' });
      return;
    }

    this.setData({ loading: true, error: '' });

    try {
      const res = await bindPhone(code);
      if (res.code === 0) {
        wx.showToast({ title: '绑定成功', icon: 'success', duration: 1500 });
        setTimeout(() => {
          wx.redirectTo({ url: '/pages/host-select/index' });
        }, 1500);
      } else {
        // 模拟器失败时提示开启开发模式
        const isDevFail = res.message && (res.message.includes('获取失败') || res.message.includes('未获取到'));
        const msg = isDevFail 
          ? res.message + '\n模拟器环境下可连续点击上方图标3次进入开发模式手动输入' 
          : res.message;
        this.setData({ error: msg });
      }
    } catch (err) {
      console.error('bindPhone error:', err);
      this.setData({ error: '刚刚网络有点慢，再试一次好么？\n模拟器环境可三击图标开启开发模式' });
    } finally {
      this.setData({ loading: false });
    }
  },

  // 开发模式：手动输入手机号
  onDevPhoneInput(e: any) {
    this.setData({ devPhone: e.detail.value });
  },

  async onDevBindPhone() {
    const phone = (this.data.devPhone || '').replace(/\s+/g, '');
    if (phone.length !== 11 || !/^1[3-9]\d{9}$/.test(phone)) {
      wx.showToast({ title: '请输入正确的11位手机号', icon: 'none' });
      return;
    }

    this.setData({ devLoading: true, error: '' });
    try {
      // 通过 auth 云函数的 devBindPhone 写入手机号
      const res = await wx.cloud.callFunction({
        name: 'auth',
        data: { action: 'devBindPhone', payload: { phone } },
      });
      const result = res.result as any;
      if (result.code === 0) {
        wx.showToast({ title: '绑定成功（开发模式）', icon: 'success', duration: 1500 });
        setTimeout(() => {
          wx.redirectTo({ url: '/pages/host-select/index' });
        }, 1500);
      } else {
        this.setData({ error: result.message || '绑定失败' });
      }
    } catch (err) {
      console.error('devBindPhone error:', err);
      this.setData({ error: '绑定失败，请重试' });
    } finally {
      this.setData({ devLoading: false });
    }
  },

  // 查看用户协议
  onViewUserAgreement() {
    wx.navigateTo({ url: '/pages/agreement/user-agreement' });
  },

  // 查看隐私政策
  onViewPrivacyPolicy() {
    wx.navigateTo({ url: '/pages/agreement/privacy-policy' });
  },
});
