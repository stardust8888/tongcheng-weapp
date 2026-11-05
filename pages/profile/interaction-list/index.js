var http = require('../../../utils/http')
var util = require('../../../utils/util')
var theme = require('../../../utils/theme')

function formatDateTime(dateStr) {
  if (!dateStr) return ''
  var d = new Date(dateStr.replace(/-/g, '/'))
  if (isNaN(d.getTime())) return ''
  var pad = function (n) { return n < 10 ? '0' + n : '' + n }
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds())
}

var typeConfig = {
  view: { title: '查看我', api: '/web/v1/user/view/me', emptyIcon: '👀', emptyText: '还没有人查看过你' },
  watch: { title: '关注我', api: '/web/v1/user/watch/me', emptyIcon: '💝', emptyText: '还没有人关注你' },
  like: { title: '点赞我', api: '/web/v1/user/like/me', emptyIcon: '👍', emptyText: '还没有人点赞你' },
  comment: { title: '评论我', api: '/web/v1/user/comment/me', emptyIcon: '💬', emptyText: '还没有人评论你' }
}

Page({
  data: {
    type: '',
    list: [],
    page: 1,
    pageSize: 10,
    total: 0,
    loading: false,
    loaded: false,
    emptyIcon: '',
    emptyText: '',
    _: 0
  },

  onShow() {
    this.setData({ themeClass: theme.getThemeClass() })
  },

  onLoad: function (options) {
    var type = options.type || 'view'
    var config = typeConfig[type] || typeConfig.view
    wx.setNavigationBarTitle({ title: config.title })
    this.setData({
      type: type,
      emptyIcon: config.emptyIcon,
      emptyText: config.emptyText
    })
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
    var config = typeConfig[this.data.type] || typeConfig.view
    var isFirstPage = this.data.page === 1

    http.get(config.api, { page: this.data.page, pageSize: this.data.pageSize }).then(function (res) {
      if (res.code !== 200) {
        that.setData({ loading: false, loaded: true })
        if (callback) callback()
        return
      }
      var raw = res.data.items || []
      var items = raw.map(function (item) {
        var u = item.user || {}
        var record = item.record || {}
        var result = {
          userID: u.id || 0,
          username: u.username || '用户',
          avatar: util.buildAvatarUrl(u.avatar),
          time: formatDateTime(record.createdAt)
        }
        if (that.data.type === 'comment') {
          result.commentContent = record.content || ''
        }
        return result
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

  goDetail: function (e) {
    var userID = e.currentTarget.dataset.userid
    if (!userID) return
    wx.navigateTo({ url: '/pages/profile/home/index?id=' + userID })
  }
})
