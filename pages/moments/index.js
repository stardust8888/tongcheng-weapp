var http = require('../../utils/http')
var util = require('../../utils/util')
var theme = require('../../utils/theme')

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
    inputFocus: false,
    fabHidden: false,
    _: 0
  },

  onShow() {
    // tabbar 页常驻：清掉上次未发送就离开时残留的评论栏状态，
    // 否则重新进入会出现“没点评论却显示评论框/弹键盘”。
    this.setData({
      themeClass: theme.getThemeClass(),
      commentMomentID: 0,
      commentInput: '',
      commentReplierID: 0,
      commentReplierName: '',
      commentPlaceholder: '写评论...',
      inputFocus: false
    })
    if (!getApp().checkLogin()) return
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      var c = theme.getColors()
      this.getTabBar().setData({ selected: 1, activeGradient: 'linear-gradient(0deg, ' + c.primary + ' 0%, ' + c.primaryLight + ' 93%)' })
      getApp().updateTabBar(this)
    }
    var userInfo = getApp().globalData.userInfo
    this.setData({ myID: userInfo ? userInfo.id : 0, page: 1, noMore: false, momentList: [] })
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

  onPageScroll() {
    // 滚动时收起悬浮“发动态”按钮，避免它挡住动态卡片的点赞/评论；
    // 停止滚动后稍作延迟再恢复，期间 pointer-events:none 保证可点到下方按钮。
    var that = this
    if (!that.data.fabHidden) {
      that.setData({ fabHidden: true })
    }
    clearTimeout(that._fabTimer)
    that._fabTimer = setTimeout(function () {
      that.setData({ fabHidden: false })
    }, 700)
  },

  loadMomentList(callback) {
    if (this.data.loading) return
    this.setData({ loading: true })
    var that = this
    http.get('/web/v1/moment/list/withComment', {
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
          isWatched: item.watch === 1,
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

  goPost() {
    wx.navigateTo({ url: '/pages/moments/post/index' })
  },

  toggleFollow(e) {
    var userID = e.currentTarget.dataset.userid
    var id = e.currentTarget.dataset.id
    if (!userID) return
    var that = this
    var index = this.data.momentList.findIndex(function (item) { return item.id === id })
    if (index < 0) return
    var item = this.data.momentList[index]
    var key = 'momentList[' + index + '].isWatched'

    if (item.isWatched) {
      http.post('/web/v1/user/watch/cancel', { userID: userID }).then(function (res) {
        if (res.code === 200) {
          that.setData({ [key]: false })
        }
      })
    } else {
      http.post('/web/v1/user/watch', { userID: userID }).then(function (res) {
        if (res.code === 200) {
          that.setData({ [key]: true })
          wx.showToast({ title: '已关注', icon: 'success' })
        }
      })
    }
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
  },

  goUserDetail(e) {
    var userID = e.currentTarget.dataset.userid
    if (!userID) return
    wx.navigateTo({ url: '/pages/profile/home/index?id=' + userID })
  }
})
