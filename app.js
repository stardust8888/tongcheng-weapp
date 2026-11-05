var ws = require('./utils/ws')
var http = require('./utils/http')

App({
  globalData: {
    userInfo: null,
    childInfo: null,
    totalUnread: 0,
    freshData: null,
    baseUrl: 'http://127.0.0.1:12001',
    fileUrl: 'http://127.0.0.1:12004',
    wsUrl: 'ws://127.0.0.1:12003'
  },

  _freshTimer: null,

  // ---- 生命周期 ----

  onLaunch() {
    this._initLogs()
    this.globalData.userInfo = wx.getStorageSync('userInfo') || null
    this.globalData.childInfo = wx.getStorageSync('childInfo') || null
    if (this._hasToken()) {
      this.connectWS()
      this.startFreshPolling()
    }
  },

  onShow() {
    ws.checkReconnect()
    if (this._hasToken()) {
      this.startFreshPolling()
    }
  },

  onHide() {
    this.stopFreshPolling()
  },

  // ---- 认证 ----

  _hasToken() {
    return !!wx.getStorageSync('token')
  },

  checkLogin() {
    if (!this._hasToken()) {
      wx.navigateTo({ url: '/pages/login/index' })
      return false
    }
    return true
  },

  connectWS() {
    var token = wx.getStorageSync('token')
    if (token) ws.connect(token)
  },

  // ---- 消息轮询 ----

  startFreshPolling() {
    this.stopFreshPolling()
    this.loadFresh()
    this._freshTimer = setInterval(this.loadFresh.bind(this), 5000)
  },

  stopFreshPolling() {
    if (this._freshTimer) {
      clearInterval(this._freshTimer)
      this._freshTimer = null
    }
  },

  loadFresh() {
    var that = this
    http.get('/web/v1/chat/fresh').then(function (res) {
      if (res.code !== 200) return
      var data = res.data || {}
      that.globalData.totalUnread = data.total_unread || 0
      that.globalData.freshData = data
      that._notifyCurrentPage()
    })
  },

  // ---- TabBar & 页面通知 ----

  updateTabBar(page) {
    if (typeof page.getTabBar === 'function' && page.getTabBar()) {
      page.getTabBar().setData({ totalUnread: this.globalData.totalUnread })
    }
  },

  _notifyCurrentPage() {
    var pages = getCurrentPages()
    if (pages.length === 0) return
    var page = pages[pages.length - 1]
    this.updateTabBar(page)
    if (typeof page.mergeFresh === 'function') {
      page.mergeFresh()
    }
  },

  // ---- 内部 ----

  _initLogs() {
    var logs = wx.getStorageSync('logs') || []
    logs.unshift(Date.now())
    wx.setStorageSync('logs', logs)
  }
})
