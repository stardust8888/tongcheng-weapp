var http = require('../../../utils/http')
var util = require('../../../utils/util')
var theme = require('../../../utils/theme')

Page({
  data: {
    list: [],
    page: 1,
    pageSize: 10,
    total: 0,
    loading: false,
    loaded: false
  },

  onShow() {
    this.setData({ themeClass: theme.getThemeClass() })
  },

  onLoad: function () {
    this.loadList()
  },

  onPullDownRefresh: function () {
    this.setData({ page: 1 })
    var that = this
    this.loadList(function () { wx.stopPullDownRefresh() })
  },

  onReachBottom: function () {
    if (this.data.list.length >= this.data.total) return
    this.setData({ page: this.data.page + 1 })
    this.loadList()
  },

  loadList: function (callback) {
    if (this.data.loading) return
    this.setData({ loading: true })
    var that = this
    var isFirstPage = this.data.page === 1

    http.get('/web/v1/user/black/list', { page: this.data.page, pageSize: this.data.pageSize }).then(function (res) {
      if (res.code !== 200) {
        that.setData({ loading: false, loaded: true })
        if (callback) callback()
        return
      }
      var raw = res.data.items || []
      var items = raw.map(function (item) {
        var u = item.user || {}
        return {
          blackUserID: u.id || 0,
          username: u.username || '用户',
          avatar: util.buildAvatarUrl(u.avatar)
        }
      })

      var newList = isFirstPage ? items : that.data.list.concat(items)
      that.setData({
        list: newList,
        total: res.data.total || 0,
        loading: false,
        loaded: true
      })
      if (callback) callback()
    }).catch(function () {
      that.setData({ loading: false, loaded: true })
      if (callback) callback()
    })
  },

  removeBlack: function (e) {
    var blackUserID = e.currentTarget.dataset.userid
    var that = this
    wx.showModal({
      title: '提示',
      content: '确定将该用户移出黑名单？',
      success: function (res) {
        if (!res.confirm) return
        http.post('/web/v1/user/black/remove', { blackUserID: blackUserID }).then(function (res) {
          if (res.code === 200) {
            var newList = that.data.list.filter(function (item) { return item.blackUserID !== blackUserID })
            that.setData({ list: newList, total: that.data.total - 1 })
            wx.showToast({ title: '已移除', icon: 'success' })
          }
        })
      }
    })
  },

  goDetail: function (e) {
    var userID = e.currentTarget.dataset.userid
    if (!userID) return
    wx.navigateTo({ url: '/pages/profile/home/index?id=' + userID })
  }
})
