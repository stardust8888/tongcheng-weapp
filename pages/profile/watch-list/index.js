var http = require('../../../utils/http')
var util = require('../../../utils/util')
var constant = require('../../../utils/constant')
var theme = require('../../../utils/theme')

Page({
  data: {
    watchList: [],
    loading: false,
    loaded: false,
    _: 0
  },

  onShow() {
    this.setData({ themeClass: theme.getThemeClass() })
    this.loadWatchList()
  },

  onPullDownRefresh() {
    this.loadWatchList(function () { wx.stopPullDownRefresh() })
  },

  loadWatchList(callback) {
    if (this.data.loading) return
    this.setData({ loading: true })
    var that = this
    http.get('/web/v1/user/watch/List').then(function (res) {
      if (res.code !== 200) {
        that.setData({ loading: false, loaded: true })
        if (callback) callback()
        return
      }
      var raw = res.data || []
      var list = raw.map(function (item) {
        var u = item.user || {}
        var c = item.child || {}
        var location = [c.province, c.city].filter(Boolean).join(' ')
        var summary = [util.calcBirthYear(c.birth), c.height ? c.height + 'cm' : '', constant.educationMap[c.education] || ''].filter(Boolean).join('/')
        return {
          userID: u.id || 0,
          username: u.username || '用户',
          avatar: util.buildAvatarUrl(u.avatar),
          photo: '/assets/images/no_photo.png',
          _photoPath: c.photo ? c.photo.split(',')[0] : '',
          relationLabel: c.relation === 1 ? '儿子' : c.relation === 2 ? '女儿' : '',
          summary: summary,
          income: constant.incomeMap[c.yearIncome] || '',
          company: constant.companyMap[c.company] || '',
          work: constant.workMap[c.work] || '',
          location: location || '未填写',
          description: c.description || '',
          watched: true
        }
      })
      that.setData({ watchList: list, loading: false, loaded: true })
      list.forEach(function (item, i) {
        if (!item._photoPath) return
        util.loadPhoto(item._photoPath).then(function (url) {
          that.setData({ ['watchList[' + i + '].photo']: url })
        })
      })
      if (callback) callback()
    }).catch(function () {
      that.setData({ loading: false, loaded: true })
      if (callback) callback()
    })
  },

  toggleWatch(e) {
    var userID = e.currentTarget.dataset.userid
    var that = this
    var list = this.data.watchList
    var idx = list.findIndex(function (item) { return item.userID === userID })
    if (idx < 0) return
    var item = list[idx]

    if (item.watched) {
      wx.showModal({
        title: '提示',
        content: '确定取消关注吗？',
        success: function (res) {
          if (!res.confirm) return
          http.post('/web/v1/user/watch/cancel', { userID: userID }).then(function (res) {
            if (res.code === 200) {
              var newList = that.data.watchList.filter(function (i) { return i.userID !== userID })
              that.setData({ watchList: newList })
              wx.showToast({ title: '已取消关注', icon: 'success' })
            }
          })
        }
      })
    }
  },

  sayHello(e) {
    var userID = e.currentTarget.dataset.userid
    http.post('/web/v1/chat/create', { talkerID: userID }).then(function (res) {
      if (res.code !== 200) {
        // 10001 已由 http 层弹 message，避免重复提示
        if (res.code !== 10001) {
          wx.showToast({ title: res.message || '操作失败', icon: 'none' })
        }
        return
      }
      var chatData = res.data || {}
      var chatID = chatData.chat ? chatData.chat.chatID : ''
      if (chatID) {
        wx.navigateTo({ url: '/pages/messages/chat/index?chatID=' + chatID + '&talkerID=' + userID })
      } else {
        wx.showToast({ title: '已发送招呼', icon: 'success' })
      }
    }).catch(function () {
      wx.showToast({ title: '网络错误', icon: 'none' })
    })
  },

  goUserDetail(e) {
    var userID = e.currentTarget.dataset.userid
    if (!userID) return
    wx.navigateTo({ url: '/pages/profile/home/index?id=' + userID })
  }
})
