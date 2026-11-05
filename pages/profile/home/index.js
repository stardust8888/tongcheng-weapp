var http = require('../../../utils/http')
var util = require('../../../utils/util')
var constant = require('../../../utils/constant')
var theme = require('../../../utils/theme')

var roleMap = constant.roleMap
var maritalMap = constant.maritalMap
var houseMap = constant.houseMap
var carMap = constant.carMap
var companyMap = constant.companyMap
var workMap = constant.workMap

Page({
  data: {
    userID: 0,
    nickname: '',
    avatar: '',
    role: '',
    isSelf: false,
    isWatched: false,
    hasChild: false,
    child: {},
    momentList: [],
    loading: false,
    commentInput: '',
    commentMomentID: 0,
    commentReplierID: 0,
    commentReplierName: '',
    commentPlaceholder: '写评论...',
    inputFocus: false
  },

  onShow() {
    // 从子页（如聊天）返回时，清掉可能残留的评论栏状态，避免重新出现评论框/弹键盘
    this.setData({
      themeClass: theme.getThemeClass(),
      commentMomentID: 0,
      commentInput: '',
      commentReplierID: 0,
      commentReplierName: '',
      commentPlaceholder: '写评论...',
      inputFocus: false
    })
  },

  onLoad: function (options) {
    var userID = parseInt(options.id) || 0
    var userInfo = getApp().globalData.userInfo
    var myID = userInfo ? userInfo.id : 0
    this.setData({ userID: userID, isSelf: userID === myID })
    if (!userID) return
    this.loadHome()
  },

  loadHome: function () {
    if (this.data.loading) return
    this.setData({ loading: true })
    var that = this
    http.get('/web/v1/user/home', {
      user_id: this.data.userID
    }).then(function (res) {
      if (res.code !== 200) {
        that.setData({ loading: false })
        return
      }
      var data = res.data || {}

      var u = data.user || {}
      var c = data.child || {}
      that.setData({
        nickname: u.username || '用户',
        avatar: util.buildAvatarUrl(u.avatar),
        role: roleMap[u.role] || '',
        isWatched: data.watch === 1
      })
      wx.setNavigationBarTitle({ title: u.username || '个人主页' })

      if (c && c.id) {
        var location = [c.city, c.district].filter(Boolean).join(' ')
        var summary = [util.calcBirthYear(c.birth), c.height ? c.height + 'cm' : '', constant.educationMap[c.education] || ''].filter(Boolean).join(' / ')
        var photos = c.photo ? c.photo.split(',').filter(Boolean) : []
        that.setData({
          hasChild: true,
          child: {
            photos: photos.length ? photos.map(function () { return '/assets/images/no_photo.png' }) : ['/assets/images/no_photo.png'],
            relation: constant.relationMap[c.relation] || '',
            summary: summary,
            income: constant.incomeMap[c.yearIncome] || '未填写',
            company: companyMap[c.company] || '未填写',
            work: workMap[c.work] || '未填写',
            location: location || '未填写',
            marital: maritalMap[c.maritalStatus] || '未填写',
            house: houseMap[c.house] || '未填写',
            car: carMap[c.car] || '未填写',
            interest: (c.interest || '').split(',').filter(Boolean).join('、') || '未填写',
            description: c.description || ''
          }
        })
        photos.forEach(function (p, i) {
          util.loadPhoto(p).then(function (url) {
            that.setData({ ['child.photos[' + i + ']']: url })
          })
        })
      }

      var raw = data.moments || []
      var list = raw.map(function (item) {
        var m = item.user_moment || {}
        return {
          id: m.id || 0,
          content: m.content || '',
          images: [],
          _picture: m.picture || '',
          likeCount: m.likeCount || 0,
          commentCount: m.commentCount || 0,
          isLiked: item.like === 1,
          time: util.formatChatTime(m.createdAt),
          comments: []
        }
      })
      that.setData({ momentList: list, loading: false })
      list.forEach(function (item, i) {
        if (!item._picture) return
        util.loadPictures(item._picture).then(function (urls) {
          that.setData({ ['momentList[' + i + '].images']: urls })
        })
      })
    }).catch(function () {
      that.setData({ loading: false })
    })
  },

  toggleWatch: function () {
    var that = this
    var userID = this.data.userID
    if (this.data.isWatched) {
      http.post('/web/v1/user/watch/cancel', { userID: userID }).then(function (res) {
        if (res.code === 200) {
          that.setData({ isWatched: false })
        }
      })
    } else {
      http.post('/web/v1/user/watch', { userID: userID }).then(function (res) {
        if (res.code === 200) {
          that.setData({ isWatched: true })
          wx.showToast({ title: '已关注', icon: 'success' })
        }
      })
    }
  },

  sayHello: function () {
    var that = this
    http.post('/web/v1/chat/create', { talkerID: this.data.userID }).then(function (res) {
      if (res.code !== 200) {
        // 10001 已由 http 层弹 message，避免重复提示
        if (res.code !== 10001) {
          wx.showToast({ title: res.message || '操作失败', icon: 'none' })
        }
        return
      }
      var chatData = res.data || {}
      var chatID = chatData.chat ? chatData.chat.chatID : ''
      if (chatID) {
        wx.navigateTo({
          url: '/pages/messages/chat/index?chatID=' + chatID + '&talkerID=' + that.data.userID +
            '&talkerName=' + encodeURIComponent(that.data.nickname) +
            '&talkerAvatar=' + encodeURIComponent(that.data.avatar)
        })
      }
    })
  },

  likePost: function (e) {
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

  showMoreComments: function (e) {
    var id = e.currentTarget.dataset.id
    var index = this.data.momentList.findIndex(function (item) { return item.id === id })
    if (index === -1) return
    this.setData({ ['momentList[' + index + '].showAllComments']: true })
  },

  openComment: function (e) {
    this.setData({
      commentMomentID: e.currentTarget.dataset.id,
      commentReplierID: 0,
      commentReplierName: '',
      commentPlaceholder: '写评论...',
      inputFocus: true
    })
  },

  replyComment: function (e) {
    var ds = e.currentTarget.dataset
    this.setData({
      commentMomentID: ds.momentid,
      commentReplierID: ds.userid,
      commentReplierName: ds.username || '',
      commentPlaceholder: '回复 ' + ds.username,
      inputFocus: true
    })
  },

  onCommentInput: function (e) {
    this.setData({ commentInput: e.detail.value })
  },

  sendComment: function () {
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

  onCommentBlur: function () {
    var that = this
    setTimeout(function () {
      that.setData({ inputFocus: false })
    }, 200)
  },

  previewChildPhoto: function (e) {
    var index = e.currentTarget.dataset.index
    var photos = this.data.child.photos || []
    if (!photos.length) return
    wx.previewImage({ current: photos[index], urls: photos })
  },

  previewImage: function (e) {
    var ds = e.currentTarget.dataset
    wx.previewImage({ current: ds.current, urls: ds.urls })
  },

  showMoreMenu: function () {
    var that = this
    wx.showActionSheet({
      itemList: ['加入黑名单'],
      success: function (res) {
        if (res.tapIndex === 0) {
          wx.showModal({
            title: '提示',
            content: '确定将该用户加入黑名单吗？',
            success: function (modalRes) {
              if (modalRes.confirm) {
                http.post('/web/v1/user/black/add', { blackUserID: that.data.userID }).then(function (res) {
                  if (res.code === 200) {
                    wx.showToast({ title: '已加入黑名单', icon: 'success' })
                  }
                })
              }
            }
          })
        }
      }
    })
  }
})
