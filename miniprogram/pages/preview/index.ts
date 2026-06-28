Page({
  data: {
    loading: true,
    error: '',
    url: '',
    type: '' as 'image' | 'pdf' | 'other',
  },

  onLoad(options: Record<string, string | undefined>) {
    const url = decodeURIComponent(options.url || '')
    const type = (options.type as string) || 'other'

    if (!url) {
      this.setData({ loading: false, error: '文件地址无效' })
      return
    }

    const lower = url.toLowerCase()
    let fileType: 'image' | 'pdf' | 'other' = 'other'
    if (/\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(lower)) {
      fileType = 'image'
    } else if (/\.pdf(\?|$)/i.test(lower)) {
      fileType = 'pdf'
    }

    this.setData({ loading: false, url, type: fileType })

    if (fileType === 'pdf' || fileType === 'other') {
      this.openFile(url)
    }
  },

  openFile(fileUrl: string) {
    wx.downloadFile({
      url: fileUrl,
      success: (res) => {
        if (res.statusCode === 200 && res.tempFilePath) {
          wx.openDocument({
            filePath: res.tempFilePath,
            showMenu: true,
            fail: () => {
              this.setData({ error: '暂时无法打开该文件' })
            },
          })
        } else {
          this.setData({ error: '暂时无法打开该文件' })
        }
      },
      fail: () => {
        this.setData({ error: '暂时无法打开该文件' })
      },
    })
  },

  onPreviewImage() {
    const url = this.data.url
    if (!url) return
    wx.previewImage({
      urls: [url],
      current: url,
      fail: () => {
        this.setData({ error: '暂时无法打开该图片' })
      },
    })
  },

  onRetry() {
    const { url, type } = this.data
    if (type === 'pdf' || type === 'other') {
      this.openFile(url)
    }
  },

  onGoBack() {
    wx.navigateBack()
  },
})
