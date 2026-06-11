// pages/preview/index.ts
Page({
  data: {
    fileId: '',
    fileUrl: '',
    title: '',
    fileType: '' as 'image' | 'pdf' | 'unknown',
    loading: true,
    error: '',
  },

  onLoad(options: any) {
    const fileId = decodeURIComponent(options.fileId || '');
    const fileUrl = decodeURIComponent(options.fileUrl || '');
    const title = decodeURIComponent(options.title || '文件预览');

    wx.setNavigationBarTitle({ title });

    this.setData({ fileId, fileUrl, title });

    // 判断文件类型
    if (fileUrl) {
      const ext = fileUrl.split('.').pop()?.toLowerCase() || '';
      if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(ext)) {
        this.setData({ fileType: 'image' });
      } else if (ext === 'pdf') {
        this.setData({ fileType: 'pdf' });
      }
    } else if (fileId) {
      // 云存储文件，从文件 ID 判断
      if (fileId.includes('.pdf')) {
        this.setData({ fileType: 'pdf' });
      } else {
        this.setData({ fileType: 'image' });
      }
    }

    this.loadFile();
  },

  async loadFile() {
    this.setData({ loading: true, error: '' });

    try {
      let finalUrl = this.data.fileUrl;

      // 如果有 fileId（云存储），获取临时链接
      if (!finalUrl && this.data.fileId) {
        const res = await wx.cloud.getTempFileURL({
          fileList: [this.data.fileId],
        });
        if (res.fileList[0]?.tempFileURL) {
          finalUrl = res.fileList[0].tempFileURL;
          this.setData({ fileUrl: finalUrl });
        } else {
          this.setData({ error: '文件读取失败' });
          return;
        }
      }

      if (!finalUrl) {
        this.setData({ error: '暂无文件资源' });
        return;
      }

      // 如果是 PDF，下载到本地再打开
      if (this.data.fileType === 'pdf') {
        wx.showLoading({ title: '加载文件中...' });
        const downloadRes = await wx.cloud.downloadFile({
          fileID: this.data.fileId || finalUrl,
        });
        wx.hideLoading();
        if (downloadRes.tempFilePath) {
          wx.openDocument({
            filePath: downloadRes.tempFilePath,
            showMenu: true,
            fail: () => {
              this.setData({ error: '打开文件失败，请重试' });
            },
          });
        }
      }
    } catch (err) {
      console.error('loadFile error:', err);
      this.setData({ error: '刚刚网络有点慢，再试一次好么？' });
    } finally {
      this.setData({ loading: false });
    }
  },

  onImageError() {
    this.setData({ error: '图片加载失败' });
  },

  onRetry() {
    this.loadFile();
  },
});
