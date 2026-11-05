var imageCache = require('../../../utils/image-cache')
var ws = require('../../../utils/ws')
var http = require('../../../utils/http')
var theme = require('../../../utils/theme')

Page({
  data: {
    cacheSize: '0 KB',
    deleteApplied: false,
    deleteExpectAt: ''
  },

  onShow() {
    this.setData({ themeClass: theme.getThemeClass(), currentTheme: theme.getThemeName() })
    this.calcCacheSize()
    this.loadDeleteApply()
  },

  loadDeleteApply() {
    var that = this
    http.get('/web/v1/user/delete/apply').then(function (res) {
      if (res.code === 200 && res.data) {
        that.setData({
          deleteApplied: !!res.data.applied,
          deleteExpectAt: res.data.expectAt || ''
        })
      }
    }).catch(function () {})
  },

  calcCacheSize() {
    var that = this
    try {
      var res = wx.getStorageInfoSync()
      var used = res.currentSize || 0
      that.setData({ cacheSize: used > 1024 ? (used / 1024).toFixed(1) + ' MB' : used + ' KB' })
    } catch (e) {
      that.setData({ cacheSize: '未知' })
    }
  },

  switchTheme(e) {
    var name = e.currentTarget.dataset.theme
    if (name === theme.getThemeName()) return
    theme.setTheme(name)
    this.setData({ themeClass: theme.getThemeClass(), currentTheme: name })
  },
  
  goFeedback() {
    wx.navigateTo({ url: '/pages/profile/feedback/index' })
  },

  goBlackList() {
    wx.navigateTo({ url: '/pages/profile/black-list/index' })
  },

  clearCache() {
    var that = this
    wx.showModal({
      title: '清理缓存',
      content: '将清除本地缓存的图片，是否继续？',
      success: function (res) {
        if (!res.confirm) return
        imageCache.clearCache()
        that.calcCacheSize()
        wx.showToast({ title: '清理完成', icon: 'success' })
      }
    })
  },

  logout() {
    wx.showModal({
      title: '退出登录',
      content: '确定退出当前账号？',
      success: function (res) {
        if (!res.confirm) return
        http.post('/web/v1/loginOut').catch(function () {})
        ws.close()
        var app = getApp()
        app.stopFreshPolling()
        app.globalData.userInfo = null
        app.globalData.totalUnread = 0
        app.globalData.freshData = null
        imageCache.clearCache()
        wx.clearStorageSync()
        wx.reLaunch({ url: '/pages/login/index' })
      }
    })
  },

  applyDelete() {
    var that = this
    wx.showModal({
      title: '注销账号',
      content: '提交注销申请后，将在15天后正式删除您的账号及全部资料。冷静期内可随时取消，是否继续？',
      confirmColor: '#C94545',
      success: function (res) {
        if (!res.confirm) return
        http.post('/web/v1/user/delete/apply').then(function (res) {
          if (res.code === 200) {
            that.setData({
              deleteApplied: true,
              deleteExpectAt: (res.data && res.data.expectAt) || ''
            })
            wx.showToast({ title: '注销申请已提交', icon: 'success' })
          } else {
            // 10001 已由 http 层弹 message，避免重复提示
            if (res.code !== 10001) {
              wx.showToast({ title: res.message || '提交失败', icon: 'none' })
            }
          }
        }).catch(function () {
          wx.showToast({ title: '网络错误', icon: 'none' })
        })
      }
    })
  },

  cancelDelete() {
    var that = this
    wx.showModal({
      title: '取消注销',
      content: '取消后您的账号将继续正常使用，注销申请将被撤回，是否继续？',
      success: function (res) {
        if (!res.confirm) return
        http.post('/web/v1/user/delete/cancel').then(function (res) {
          if (res.code === 200) {
            that.setData({ deleteApplied: false, deleteExpectAt: '' })
            wx.showToast({ title: '已取消注销', icon: 'success' })
          } else {
            // 10001 已由 http 层弹 message，避免重复提示
            if (res.code !== 10001) {
              wx.showToast({ title: res.message || '取消失败', icon: 'none' })
            }
          }
        }).catch(function () {
          wx.showToast({ title: '网络错误', icon: 'none' })
        })
      }
    })
  }
})
