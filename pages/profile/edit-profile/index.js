var http = require('../../../utils/http')
var util = require('../../../utils/util')
var constant = require('../../../utils/constant')
var theme = require('../../../utils/theme')

var roleOptions = constant.roleOptions

Page({
  data: {
    saving: false,
    username: '',
    avatar: '',
    avatarDisplay: '/assets/avatar/default.png',
    avatarList: [
      'avatar_00.png', 'avatar_01.png', 'avatar_02.png', 'avatar_03.png', 'avatar_04.png',
      'avatar_05.png', 'avatar_06.png', 'avatar_07.png', 'avatar_08.png', 'avatar_09.png',
    ],
    avatarPickerVisible: false,
    wxAccount: '',
    role: 0,
    roleOptions: roleOptions,

    pickerVisible: false,
    pickerTitle: '',
    pickerField: '',
    pickerDisplayOptions: [],
    pickerViewValue: [0]
  },

  onShow() {
    this.setData({ themeClass: theme.getThemeClass() })
  },

  onLoad() {
    this.loadProfile()
  },

  loadProfile() {
    var that = this
    http.get('/web/v1/user/profile').then(function (res) {
      if (res.code !== 200) return
      var user = res.data.user
      that.setData({
        username: user.username || '',
        avatar: user.avatar || '',
        avatarDisplay: user.avatar ? '/assets/avatar/' + user.avatar : '/assets/avatar/default.png',
        wxAccount: user.wx || '',
        role: user.role || 0
      })
    })
  },

  onInput(e) {
    var field = e.currentTarget.dataset.field
    this.setData({ [field]: e.detail.value })
  },

  openAvatarPicker() {
    this.setData({ avatarPickerVisible: true })
  },

  closeAvatarPicker() {
    this.setData({ avatarPickerVisible: false })
  },

  selectAvatar(e) {
    var name = e.currentTarget.dataset.name
    this.setData({
      avatar: name,
      avatarDisplay: '/assets/avatar/' + name,
      avatarPickerVisible: false
    })
  },

  openRolePicker() {
    var currentVal = this.data.role
    var viewIndex = currentVal > 0 ? currentVal - 1 : 0
    this.setData({
      pickerVisible: true,
      pickerTitle: '我的身份',
      pickerField: 'role',
      pickerDisplayOptions: roleOptions.slice(1),
      pickerViewValue: [viewIndex]
    })
  },

  onPickerViewChange(e) {
    this.setData({ pickerViewValue: e.detail.value })
  },

  confirmPicker() {
    var idx = this.data.pickerViewValue[0] + 1
    this.setData({
      [this.data.pickerField]: idx,
      pickerVisible: false
    })
  },

  closePicker() {
    this.setData({ pickerVisible: false })
  },

  noop() { },

  onSave() {
    if (this.data.saving) return

    if (!this.data.username.trim()) {
      wx.showToast({ title: '请填写昵称', icon: 'none' })
      return
    }

    this.setData({ saving: true })
    var that = this

    http.post('/web/v1/user/profile/update', {
      username: this.data.username,
      avatar: this.data.avatar,
      wx: this.data.wxAccount,
      role: this.data.role
    }).then(function (res) {
      if (res.code !== 200) {
        wx.showToast({ title: res.message || '保存失败', icon: 'none' })
        return
      }
      var userInfo = getApp().globalData.userInfo || {}
      userInfo.username = that.data.username
      userInfo.avatar = that.data.avatar
      getApp().globalData.userInfo = userInfo
      wx.setStorageSync('userInfo', userInfo)
      wx.showToast({ title: '保存成功', icon: 'success' })
      setTimeout(function () { wx.navigateBack() }, 1200)
    }).catch(function () {
      wx.showToast({ title: '保存失败', icon: 'none' })
    }).finally(function () {
      that.setData({ saving: false })
    })
  }
})
