var http = require('../../../utils/http')
var compress = require('../../../utils/compress')
var theme = require('../../../utils/theme')

Page({
  data: {
    content: '',
    photoList: [],
    posting: false
  },

  onShow() {
    this.setData({ themeClass: theme.getThemeClass() })
  },

  onInput(e) {
    this.setData({ content: e.detail.value })
  },

  choosePhoto() {
    var that = this
    var remain = 9 - this.data.photoList.length
    if (remain <= 0) {
      wx.showToast({ title: '最多上传9张图片', icon: 'none' })
      return
    }
    wx.chooseMedia({
      count: remain,
      mediaType: ['image'],
      success: function (res) {
        var list = that.data.photoList.slice()
        var startIdx = list.length
        res.tempFiles.forEach(function (f) {
          list.push({ path: '', display: f.tempFilePath, uploading: true })
        })
        that.setData({ photoList: list })
        res.tempFiles.forEach(function (f, i) {
          compress.compress(f.tempFilePath).then(function (path) {
            that.uploadPhoto(startIdx + i, path)
          })
        })
      }
    })
  },

  uploadPhoto(index, tempPath) {
    var that = this
    var token = wx.getStorageSync('token')
    var fileUrl = getApp().globalData.fileUrl
    wx.uploadFile({
      url: fileUrl + '/file/v1/ff/upload?sense=/moment_photo',
      filePath: tempPath,
      name: 'file',
      header: { 'Authorization': token },
      success: function (res) {
        var data = JSON.parse(res.data)
        var list = that.data.photoList.slice()
        if (index >= list.length) return
        if (data.code === 200) {
          list[index] = { path: data.data.filePath, display: tempPath, uploading: false }
        } else {
          list.splice(index, 1)
          // 命中违规时后端以 10001 返回具体原因(如"图片含违规内容，请重新选择")，原样透出
          wx.showToast({ title: (data && data.message) ? data.message : '图片上传失败', icon: 'none' })
        }
        that.setData({ photoList: list })
      },
      fail: function () {
        var list = that.data.photoList.slice()
        if (index < list.length) {
          list.splice(index, 1)
          that.setData({ photoList: list })
        }
        wx.showToast({ title: '图片上传失败', icon: 'none' })
      }
    })
  },

  removePhoto(e) {
    var index = e.currentTarget.dataset.index
    var list = this.data.photoList.slice()
    var item = list[index]
    list.splice(index, 1)
    this.setData({ photoList: list })
    if (item && item.path && !item.path.startsWith('wxfile://') && !item.path.startsWith('http://tmp')) {
      var token = wx.getStorageSync('token')
      var fileUrl = getApp().globalData.fileUrl
      wx.request({
        url: fileUrl + '/file/v1/ff/delete',
        method: 'POST',
        header: { 'Authorization': token, 'Content-Type': 'application/json' },
        data: { filePath: item.path }
      })
    }
  },

  previewImage(e) {
    var current = e.currentTarget.dataset.src
    var urls = this.data.photoList.map(function (p) { return p.display })
    wx.previewImage({ current: current, urls: urls })
  },

  submitPost() {
    var content = this.data.content.trim()
    if (!content) {
      wx.showToast({ title: '请输入动态内容', icon: 'none' })
      return
    }
    if (this.data.posting) return
    if (this.data.photoList.some(function (p) { return p.uploading })) {
      wx.showToast({ title: '图片上传中，请稍候', icon: 'none' })
      return
    }
    this.setData({ posting: true })
    var picture = this.data.photoList.map(function (p) { return p.path }).filter(Boolean).join(',')
    var that = this
    http.post('/web/v1/moment/create', { content: content, picture: picture }).then(function (res) {
      if (res.code === 200) {
        wx.showToast({ title: '发布成功', icon: 'success' })
        setTimeout(function () { wx.navigateBack() }, 1200)
      } else {
        // code 10001(违规等业务提示) 已由 http 层弹出 message，此处不再重复提示
        if (res.code !== 10001) {
          wx.showToast({ title: res.message || '发布失败', icon: 'none' })
        }
        that.setData({ posting: false })
      }
    }).catch(function () {
      wx.showToast({ title: '网络错误', icon: 'none' })
      that.setData({ posting: false })
    })
  }
})
