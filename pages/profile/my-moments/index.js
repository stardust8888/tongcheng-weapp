var http = require('../../../utils/http')
var util = require('../../../utils/util')
var theme = require('../../../utils/theme')

Page({
  data: {
    momentList: [],
    page: 1,
    pageSize: 10,
    noMore: false,
    loading: false,
    commentInput: '',
    commentMomentID: 0,
    commentReplierID: 0,
    commentReplierName: '',
    commentPlaceholder: '写评论...',
    inputFocus: false
  },

  onShow() {
    this.setData({ themeClass: theme.getThemeClass(), page: 1, noMore: false, momentList: [], commentMomentID: 0, commentInput: '', commentReplierID: 0, commentReplierName: '', commentPlaceholder: '写评论...', inputFocus: false })
    this.loadMomentList()
  },

  onPullDownRefresh() {
    this.setData({ page: 1, noMore: false, momentList: [] })
    this.loadMomentList(function () { wx.stopPullDownRefresh() })
  },

  onReachBottom() {
    if (this.data.noMore || this.data.loading) return
    this.setData({ page: this.data.page + 1 })
    this.loadMomentList()
  },

  loadMomentList(callback) {
    if (this.data.loading) return
    this.setData({ loading: true })
    var that = this
    http.get('/web/v1/moment/myList', {
      myList: 1,
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
        var u = item.user || {}
        var m = item.user_moment || {}
        var cu = item.commenters || {}
        var comments = (item.comments || []).map(function (c) {
          var commenter = cu[c.userID] || {}
          var replier = c.replierID ? (cu[c.replierID] || {}) : {}
          return {
            id: c.id || 0,
            momentID: c.momentID || 0,
            userID: c.userID || 0,
            username: commenter.username || '',
            replierName: replier.username || '',
            content: c.content || ''
          }
        })
        return {
          id: m.id || 0,
          userID: m.userID || u.id || 0,
          nickname: u.username || '用户',
          avatar: util.buildAvatarUrl(u.avatar),
          isVip: u.isVip === 1,
          content: m.content || '',
          images: [],
          _picture: m.picture || '',
          likeCount: m.likeCount || 0,
          commentCount: m.commentCount || 0,
          isLiked: item.like === 1,
          time: util.formatChatTime(m.createdAt),
          comments: comments
        }
      })
      var offset = that.data.page === 1 ? 0 : that.data.momentList.length
      if (that.data.page === 1) {
        that.setData({ momentList: list, loading: false })
      } else {
        that.setData({ momentList: that.data.momentList.concat(list), loading: false })
      }
      list.forEach(function (item, i) {
        if (!item._picture) return
        var idx = offset + i
        util.loadPictures(item._picture).then(function (urls) {
          that.setData({ ['momentList[' + idx + '].images']: urls })
        })
      })
      if (callback) callback()
    }).catch(function () {
      that.setData({ loading: false })
      if (callback) callback()
    })
  },

  goPost() {
    wx.navigateTo({ url: '/pages/moments/post/index' })
  },

  deleteMoment(e) {
    var id = e.currentTarget.dataset.id
    var that = this
    wx.showModal({
      title: '删除动态',
      content: '确定要删除这条动态吗？删除后不可恢复',
      confirmColor: theme.getColors().primary,
      success: function (res) {
        if (!res.confirm) return
        http.post('/web/v1/moment/delete', { moment_id: id }).then(function (res) {
          if (res.code !== 200) {
            // 10001 已由 http 层弹 message，避免重复提示
            if (res.code !== 10001) {
              wx.showToast({ title: res.message || '删除失败', icon: 'none' })
            }
            return
          }
          var list = that.data.momentList.filter(function (item) { return item.id !== id })
          that.setData({ momentList: list })
          wx.showToast({ title: '已删除', icon: 'success' })
        }).catch(function () {
          wx.showToast({ title: '网络错误', icon: 'none' })
        })
      }
    })
  },

  likePost(e) {
    var id = e.currentTarget.dataset.id
    var index = this.data.momentList.findIndex(function (item) { return item.id === id })
    if (index === -1) return
    var item = this.data.momentList[index]
    var isLiked = item.isLiked
    var that = this
    var url = isLiked ? '/web/v1/moment/unlike' : '/web/v1/moment/like'
    http.post(url, { momentID: id }).then(function (res) {
      if (res.code !== 200) return
      that.setData({
        ['momentList[' + index + '].isLiked']: !isLiked,
        ['momentList[' + index + '].likeCount']: isLiked ? item.likeCount - 1 : item.likeCount + 1
      })
    })
  },

  showMoreComments(e) {
    var id = e.currentTarget.dataset.id
    var index = this.data.momentList.findIndex(function (item) { return item.id === id })
    if (index === -1) return
    this.setData({ ['momentList[' + index + '].showAllComments']: true })
  },

  openComment(e) {
    this.setData({
      commentMomentID: e.currentTarget.dataset.id,
      commentReplierID: 0,
      commentReplierName: '',
      commentPlaceholder: '写评论...',
      inputFocus: true
    })
  },

  replyComment(e) {
    var ds = e.currentTarget.dataset
    this.setData({
      commentMomentID: ds.momentid,
      commentReplierID: ds.userid,
      commentReplierName: ds.username || '',
      commentPlaceholder: '回复 ' + ds.username,
      inputFocus: true
    })
  },

  onCommentInput(e) {
    this.setData({ commentInput: e.detail.value })
  },

  sendComment() {
    var content = this.data.commentInput.trim()
    if (!content || !this.data.commentMomentID) return
    var body = { momentID: this.data.commentMomentID, content: content }
    if (this.data.commentReplierID) {
      body.replierID = this.data.commentReplierID
    }
    var that = this
    var momentID = body.momentID
    http.post('/web/v1/moment/comment/create', body).then(function (res) {
      if (res.code !== 200) {
        // 10001 已由 http 层弹 message，避免重复提示
        if (res.code !== 10001) {
          wx.showToast({ title: res.message || '评论失败', icon: 'none' })
        }
        return
      }
      var replierName = that.data.commentReplierName
      that.setData({
        commentInput: '',
        commentMomentID: 0,
        commentReplierID: 0,
        commentReplierName: '',
        inputFocus: false
      })
      wx.showToast({ title: '评论成功', icon: 'success' })
      var index = that.data.momentList.findIndex(function (f) { return f.id === momentID })
      if (index >= 0) {
        var userInfo = getApp().globalData.userInfo
        var newComment = {
          id: res.data ? res.data.id : Date.now(),
          momentID: momentID,
          userID: userInfo ? userInfo.id : 0,
          username: userInfo ? userInfo.username : '我',
          replierName: replierName,
          content: content
        }
        var comments = that.data.momentList[index].comments.concat([newComment])
        that.setData({
          ['momentList[' + index + '].comments']: comments,
          ['momentList[' + index + '].commentCount']: that.data.momentList[index].commentCount + 1
        })
      }
    })
  },

  onCommentBlur() {
    var that = this
    setTimeout(function () {
      that.setData({ inputFocus: false })
    }, 200)
  },

  previewImage(e) {
    var ds = e.currentTarget.dataset
    wx.previewImage({ current: ds.current, urls: ds.urls })
  }
})
