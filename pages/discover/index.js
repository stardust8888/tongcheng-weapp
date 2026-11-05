var http = require('../../utils/http')
var util = require('../../utils/util')
var constant = require('../../utils/constant')
var theme = require('../../utils/theme')

Page({
  data: {
    countdown: '00:00:00',
    discoverList: [],
    page: 1,
    pageSize: 10,
    noMore: false,
    loading: false
  },

  onLoad() {
    this.startCountdown()
  },

  onShow() {
    this.setData({ themeClass: theme.getThemeClass() })
    if (!getApp().checkLogin()) return
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      var c = theme.getColors()
      this.getTabBar().setData({ selected: 0, activeGradient: 'linear-gradient(0deg, ' + c.primary + ' 0%, ' + c.primaryLight + ' 93%)' })
      getApp().updateTabBar(this)
    }
    this.setData({ page: 1, noMore: false, discoverList: [] })
    this.loadDiscoverList()
  },

  onPullDownRefresh() {
    this.setData({ page: 1, noMore: false, discoverList: [] })
    this.loadDiscoverList(function () { wx.stopPullDownRefresh() })
  },

  onReachBottom() {
    if (this.data.noMore || this.data.loading) return
    this.setData({ page: this.data.page + 1 })
    this.loadDiscoverList()
  },

  loadDiscoverList(callback) {
    if (this.data.loading) return
    this.setData({ loading: true })
    var that = this
    var childInfo = getApp().globalData.childInfo
    var paramRelation = 0
    var childRelation = childInfo ? childInfo.relation : 0
    // 自己是儿子(男)→看女儿；自己是女儿(女)→看儿子
    if (childRelation === 1) {
      paramRelation = 2
    }
    if (childRelation === 2) {
      paramRelation = 1
    }
    http.get('/web/v1/discover/list', {
      relation: paramRelation,
      page: this.data.page,
      pageSize: this.data.pageSize
    }).then(function (res) {
      if (res.code !== 200) {
        that.setData({ loading: false })
        if (callback) callback()
        return
      }
      var pageData = res.data || {}
      var raw = pageData.items || []
      if (raw.length < that.data.pageSize) {
        that.setData({ noMore: true })
      }
      var list = raw.map(function (item) {
        var c = item.child || {}
        var u = item.user || {}
        var location = [c.city, c.district].filter(Boolean).join(' ')
        var summary = [util.calcBirthYear(c.birth), c.height ? c.height + 'cm' : '', constant.educationMap[c.education] || ''].filter(Boolean).join('/')
        return {
          id: c.id || 0,
          userID: c.userID || 0,
          photo: '/assets/images/no_photo.png',
          _photoPath: c.photo ? c.photo.split(',')[0] : '',
          relationLabel: c.relation === 1 ? '儿子' : c.relation === 2 ? '女儿' : '',
          summary: summary,
          income: constant.incomeMap[c.yearIncome] || '未填写',
          location: location || '未填写',
          company: constant.companyMap[c.company] || '未填写',
          work: constant.workMap[c.work] || '未填写',
          description: util.cutText(c.description || '', 15),
          talkerName: u.username || '',
          talkerAvatar: u.avatar || ''
        }
      })
      var offset = that.data.page === 1 ? 0 : that.data.discoverList.length
      if (that.data.page === 1) {
        that.setData({ discoverList: list, loading: false })
      } else {
        that.setData({ discoverList: that.data.discoverList.concat(list), loading: false })
      }
      list.forEach(function (item, i) {
        if (!item._photoPath) return
        var idx = offset + i
        util.loadPhoto(item._photoPath).then(function (url) {
          that.setData({ ['discoverList[' + idx + '].photo']: url })
        })
      })
      if (callback) callback()
    }).catch(function () {
      that.setData({ loading: false })
      if (callback) callback()
    })
  },

  startCountdown() {
    var now = new Date()
    var tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
    var diff = tomorrow - now
    var h = Math.floor(diff / 3600000)
    var m = Math.floor((diff % 3600000) / 60000)
    var s = Math.floor((diff % 60000) / 1000)
    this.setData({
      countdown: String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0')
    })
    this._timer = setTimeout(this.startCountdown.bind(this), 1000)
  },

  onUnload() {
    clearTimeout(this._timer)
  },

  viewDetail(e) {
    var id = e.currentTarget.dataset.id
    wx.navigateTo({ url: '/pages/profile/home/index?id=' + id })
  },
  
  sayHello(e) {
    var id = e.currentTarget.dataset.id
    var item = this.data.discoverList.find(function (r) { return r.id === id })
    if (!item || !item.userID) {
      wx.showToast({ title: '操作失败', icon: 'none' })
      return
    }
    http.post('/web/v1/chat/create', { talkerID: item.userID }).then(function (res) {
      if (res.code !== 200) {
        // 10001 已由 http 层弹 message，避免重复提示
        if (res.code !== 10001) {
          wx.showToast({ title: res.message || '没联系上对方', icon: 'none' })
        }
        return
      }
      var chatData = res.data || {}
      var chatID = chatData.chat ? chatData.chat.chatID : ''
      if (chatID) {
        var url = '/pages/messages/chat/index?chatID=' + chatID + '&talkerID=' + item.userID
        if (item.talkerName) url += '&talkerName=' + encodeURIComponent(item.talkerName)
        if (item.talkerAvatar) url += '&talkerAvatar=' + encodeURIComponent(item.talkerAvatar)
        wx.navigateTo({ url: url })
      } else {
        wx.showToast({ title: '已发送招呼', icon: 'success' })
      }
    }).catch(function () {
      wx.showToast({ title: '网络错误', icon: 'none' })
    })
  }
})
