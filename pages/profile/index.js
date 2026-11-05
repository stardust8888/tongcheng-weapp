var http = require('../../utils/http')
var util = require('../../utils/util')
var constant = require('../../utils/constant')
var theme = require('../../utils/theme')

var roleMap = constant.roleMap

Page({
  data: {
    nickname: '家长',
    userAvatar: '',
    userRole: '',
    statView: 0,
    statFollow: 0,
    statLike: 0,
    statComment: 0,
    hasChild: false,
    childProfile: {
      photo: '/assets/images/no_photo.png',
      birthYear: '',
      location: '',
      height: '',
      education: '',
      job: '',
      income: ''
    }
  },

  onShow() {
    this.setData({ themeClass: theme.getThemeClass() })
    if (!getApp().checkLogin()) return
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      var c = theme.getColors()
      this.getTabBar().setData({ selected: 3, activeGradient: 'linear-gradient(0deg, ' + c.primary + ' 0%, ' + c.primaryLight + ' 93%)' })
      getApp().updateTabBar(this)
    }
    this.loadProfile()
    this.loadInteractionStat()
  },

  loadProfile() {
    var that = this
    http.get('/web/v1/user/profile').then(function (res) {
      if (res.code !== 200) return
      var user = res.data.user
      var child = res.data.child
      that.setData({
        nickname: user.username || '家长',
        userAvatar: util.buildAvatarUrl(user.avatar),
        userRole: roleMap[user.role] || ''
      })
      if (child && child.id) {
        var location = [child.city, child.district].filter(Boolean).join('')
        var summary = [util.calcBirthYear(child.birth), child.height ? child.height + 'cm' : '', constant.educationMap[child.education] || ''].filter(Boolean).join('/')
        var profile = {
          photo: '/assets/images/no_photo.png',
          relationLabel: child.relation === 1 ? '宝贝儿子' : child.relation === 2 ? '宝贝女儿' : '',
          summary: summary,
          location: location || '未填写',
          income: constant.incomeMap[child.yearIncome] || '未填写',
          company: constant.companyMap[child.company] || '未填写',
          job: constant.workMap[child.work] || '未填写',
          reviewStatus: child.reviewStatus || 0
        }
        that.setData({ hasChild: true, childProfile: profile })
        util.loadPhoto(child.photo ? child.photo.split(',')[0] : '').then(function (url) {
          that.setData({ 'childProfile.photo': url })
        })
      }
    })
  },

  editChildProfile() {
    wx.navigateTo({ url: '/pages/profile/edit-child/index' })
  },

  goEditProfile() {
    wx.navigateTo({ url: '/pages/profile/edit-profile/index' })
  },

  goWatchList() {
    wx.navigateTo({ url: '/pages/profile/watch-list/index' })
  },

  goMyMoments() {
    wx.navigateTo({ url: '/pages/profile/my-moments/index' })
  },

  goSettings() {
    wx.navigateTo({ url: '/pages/profile/settings/index' })
  },

  goInteraction(e) {
    var type = e.currentTarget.dataset.type
    wx.navigateTo({ url: '/pages/profile/interaction-list/index?type=' + type })
  },

  loadInteractionStat() {
    var that = this
    http.get('/web/v1/user/interaction/stat').then(function (res) {
      if (res.code !== 200) return
      var d = res.data || {}
      that.setData({
        statView: d.view || 0,
        statFollow: d.watch || 0,
        statLike: d.like || 0,
        statComment: d.comment || 0
      })
    })
  },

  goMyHome() {
    var userInfo = getApp().globalData.userInfo
    var userID = userInfo ? userInfo.id : 0
    if (!userID) return
    wx.navigateTo({ url: '/pages/profile/home/index?id=' + userID })
  }
})
