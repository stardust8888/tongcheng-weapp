var theme = require('../../utils/theme')

Page({
  data: {
    type: 'user'
  },

  onShow() {
    this.setData({ themeClass: theme.getThemeClass() })
  },

  onLoad(options) {
    const type = options.type || 'user'
    this.setData({ type })
    wx.setNavigationBarTitle({
      title: type === 'user' ? '用户协议' : '隐私政策'
    })
  }
})
