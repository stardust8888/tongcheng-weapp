var http = require('../../../utils/http')
var util = require('../../../utils/util')
var theme = require('../../../utils/theme')

Page({
  data: {
    feedbackList: [],
    page: 1,
    pageSize: 10,
    noMore: false,
    loading: false,
    showInput: false,
    inputValue: '',
    submitting: false
  },

  onShow() {
    this.setData({ themeClass: theme.getThemeClass(), page: 1, noMore: false, feedbackList: [] })
    this.loadFeedbackList()
  },

  onPullDownRefresh() {
    this.setData({ page: 1, noMore: false, feedbackList: [] })
    this.loadFeedbackList(function () { wx.stopPullDownRefresh() })
  },

  onReachBottom() {
    if (this.data.noMore || this.data.loading) return
    this.setData({ page: this.data.page + 1 })
    this.loadFeedbackList()
  },

  loadFeedbackList(callback) {
    if (this.data.loading) return
    this.setData({ loading: true })
    var that = this
    http.get('/web/v1/feedback/list', {
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
        return {
          id: item.id || 0,
          content: item.content || '',
          reply: item.reply || '',
          replyAt: item.replyAt ? util.formatChatTime(item.replyAt) : '',
          replyStatus: item.replyStatus || 0,
          time: util.formatChatTime(item.createdAt)
        }
      })
      if (that.data.page === 1) {
        that.setData({ feedbackList: list, loading: false })
      } else {
        that.setData({ feedbackList: that.data.feedbackList.concat(list), loading: false })
      }
      if (callback) callback()
    }).catch(function () {
      that.setData({ loading: false })
      if (callback) callback()
    })
  },

  openInput() {
    this.setData({ showInput: true, inputValue: '' })
  },

  closeInput() {
    this.setData({ showInput: false })
  },

  onInput(e) {
    this.setData({ inputValue: e.detail.value })
  },

  submit() {
    var content = (this.data.inputValue || '').trim()
    if (!content) {
      wx.showToast({ title: '请输入反馈内容', icon: 'none' })
      return
    }
    if (this.data.submitting) return
    this.setData({ submitting: true })
    var that = this
    http.post('/web/v1/feedback/create', { content: content }).then(function (res) {
      that.setData({ submitting: false })
      if (res.code !== 200) {
        // 10001(含次数超限提示) 已由 http 层弹 message，避免重复提示
        if (res.code !== 10001) {
          wx.showToast({ title: res.message || '提交失败', icon: 'none' })
        }
        return
      }
      that.setData({ showInput: false, inputValue: '' })
      wx.showToast({ title: '提交成功', icon: 'success' })
      // 刷新列表
      that.setData({ page: 1, noMore: false, feedbackList: [] })
      that.loadFeedbackList()
    }).catch(function () {
      that.setData({ submitting: false })
      wx.showToast({ title: '网络错误', icon: 'none' })
    })
  }
})
