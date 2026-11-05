var http = require('../../utils/http')
var theme = require('../../utils/theme')
var privacy = require('../../utils/privacy')

Page({
  data: {
    step: 'login',
    loading: false,
    agreedUser: false,
    agreedPrivacy: false,
    openID: '',
    nickname: '',
    phone: '',
    showRegister: false
  },

  onShow() {
    this.setData({ themeClass: theme.getThemeClass() })
  },

  onFastLogin() {
    if (!this.data.agreedUser || !this.data.agreedPrivacy) {
      wx.showToast({ title: '请先勾选并同意协议', icon: 'none' })
      return
    }

    this.setData({ loading: true })
    var that = this

    wx.login({
      success: function (res) {
        if (res.code) {
          that.requestFastLogin(res.code)
        } else {
          that.setData({ loading: false })
          wx.showToast({ title: '微信登录失败', icon: 'none' })
        }
      },
      fail: function () {
        that.setData({ loading: false })
        wx.showToast({ title: '微信登录失败', icon: 'none' })
      }
    })
  },

  requestFastLogin(code) {
    var that = this
    http.post('/web/v1/fast/login', { code: code }).then(function (res) {
      if (res.code === 200) {
        wx.setStorageSync('token', res.data.token)
        wx.setStorageSync('userInfo', res.data.user)
        wx.setStorageSync('childInfo', res.data.child)
        getApp().globalData.userInfo = res.data.user
        getApp().globalData.childInfo = res.data.child
        getApp().connectWS()
        getApp().startFreshPolling()
        wx.showToast({ title: '登录成功', icon: 'success' })
        setTimeout(function () {
          wx.navigateBack({
            fail: function () {
              wx.switchTab({ url: '/pages/discover/index' })
            }
          })
        }, 1000)
      } else if (res.code === 20001) {
        var user = res.data && res.data.user
        that.setData({
          loading: false,
          openID: user ? user.wxOpenID : '',
          nickname: user ? user.username : '',
          showRegister: true
        })
      } else if (res.code === 20004) {
        that.setData({ loading: false })
        wx.showToast({ title: '账号已被禁用', icon: 'none' })
      } else {
        that.setData({ loading: false })
        wx.showToast({ title: res.message || '登录失败', icon: 'none' })
      }
    }).catch(function () {
      that.setData({ loading: false })
      wx.showToast({ title: '网络错误，请重试', icon: 'none' })
    })
  },

  closeRegisterSheet() {
    this.setData({ showRegister: false })
  },

  onGetPhoneNumber(e) {
    if (e.detail.errMsg !== 'getPhoneNumber:ok') {
      wx.showToast({ title: '需要授权手机号才能使用', icon: 'none' })
      return
    }

    var that = this
    // 手机号属隐私信息：取号前确保已同意《用户隐私保护指引》
    privacy.ensurePrivacy(function () {
      that.setData({ loading: true, showRegister: false })
      var phoneCode = e.detail.code

      http.get('/web/v1/user/phone', {
        openID: that.data.openID,
        code: phoneCode
      }).then(function (res) {
        if (res.code === 200) {
          var phone = res.data && res.data.phone ? res.data.phone : ''
          var masked = phone.length >= 7
            ? phone.substring(0, 3) + '****' + phone.substring(phone.length - 4)
            : phone
          that.setData({ step: 'verified', loading: false, phone: masked })
          setTimeout(function () { that.retryFastLogin() }, 1500)
        } else {
          that.setData({ loading: false })
          // 10001 已由 http 层弹 message，避免重复提示
          if (res.code !== 10001) {
            wx.showToast({ title: res.message || '授权失败', icon: 'none' })
          }
        }
      }).catch(function () {
        that.setData({ loading: false })
        wx.showToast({ title: '网络错误，请重试', icon: 'none' })
      })
    }, function () {
      wx.showToast({ title: '需同意《用户隐私保护指引》', icon: 'none' })
    })
  },

  retryFastLogin() {
    var that = this
    wx.login({
      success: function (res) {
        if (res.code) {
          that.requestFastLogin(res.code)
        } else {
          that.setData({ loading: false })
          wx.showToast({ title: '登录失败', icon: 'none' })
        }
      },
      fail: function () {
        that.setData({ loading: false })
        wx.showToast({ title: '登录失败', icon: 'none' })
      }
    })
  },

  onSkip() {
    wx.switchTab({ url: '/pages/profile/index' })
  },

  toggleUserAgreement() {
    this.setData({ agreedUser: !this.data.agreedUser })
  },

  togglePrivacy() {
    this.setData({ agreedPrivacy: !this.data.agreedPrivacy })
  },

  showUserAgreement() {
    wx.navigateTo({ url: '/pages/login/agreement?type=user' })
  },

  showPrivacy() {
    wx.navigateTo({ url: '/pages/login/agreement?type=privacy' })
  }
})
