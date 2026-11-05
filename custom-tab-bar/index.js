var theme = require('../utils/theme')

Component({
  data: {
    selected: 0,
    totalUnread: 0,
    activeGradient: 'linear-gradient(0deg, #F06B6B 0%, #FF8A8A 93%)',
    list: [
      { pagePath: '/pages/discover/index', text: '发现' },
      { pagePath: '/pages/moments/index', text: '动态' },
      { pagePath: '/pages/messages/index', text: '消息' },
      { pagePath: '/pages/profile/index', text: '我的' }
    ]
  },

  pageLifetimes: {
    show() {
      var colors = theme.getColors()
      this.setData({
        activeGradient: 'linear-gradient(0deg, ' + colors.primary + ' 0%, ' + colors.primaryLight + ' 93%)'
      })
    }
  },

  methods: {
    switchTab(e) {
      const index = e.currentTarget.dataset.index
      const item = this.data.list[index]
      wx.switchTab({ url: item.pagePath })
    }
  }
})
