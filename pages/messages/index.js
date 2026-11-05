var ws = require('../../utils/ws')
var http = require('../../utils/http')
var util = require('../../utils/util')
var theme = require('../../utils/theme')

function buildChatItem(item) {
  var talker = item.talker
  return {
    chatID: item.chatID,
    talkerID: talker ? talker.id : 0,
    nickname: talker ? (talker.username || '用户') : '用户',
    avatar: util.buildAvatarUrl(talker ? talker.avatar : ''),
    lastMessage: '',
    time: '',
    unread: 0,
    sendTime: ''
  }
}

function sortBySendTime(list) {
  return list.slice().sort(function (a, b) {
    if (!a.sendTime) return 1
    if (!b.sendTime) return -1
    return new Date(b.sendTime) - new Date(a.sendTime)
  })
}

Page({
  data: {
    chatList: []
  },

  _wsHandler: null,

  // ---- 生命周期 ----

  onShow() {
    this.setData({ themeClass: theme.getThemeClass() })
    if (!getApp().checkLogin()) return
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      var c = theme.getColors()
      this.getTabBar().setData({ selected: 2, activeGradient: 'linear-gradient(0deg, ' + c.primary + ' 0%, ' + c.primaryLight + ' 93%)' })
    }
    ws.checkReconnect()
    getApp().loadFresh()
    this.loadChatList()
    this._wsHandler = this.onWSMessage.bind(this)
    ws.on('message', this._wsHandler)
  },

  onHide() {
    if (this._wsHandler) {
      ws.off('message', this._wsHandler)
      this._wsHandler = null
    }
  },

  onPullDownRefresh() {
    this.loadChatList()
    setTimeout(function () { wx.stopPullDownRefresh() }, 1000)
  },

  // ---- 数据加载 ----

  loadChatList() {
    var that = this
    http.get('/web/v1/chat/list').then(function (res) {
      if (res.code !== 200) return
      var list = (res.data || []).map(buildChatItem)
      that.setData({ chatList: list })
      that.mergeFresh()
    })
  },

  mergeFresh() {
    var freshData = getApp().globalData.freshData
    if (!freshData) return

    var chatUnread = freshData.chat_unread || {}
    var chatLatestMessage = freshData.chat_latest_message || {}
    var list = this.data.chatList
    if (!list || list.length === 0) return

    var merged = list.map(function (item) {
      var chatID = item.chatID
      var latestMsg = chatLatestMessage[chatID]
      return {
        chatID: chatID,
        talkerID: item.talkerID,
        nickname: item.nickname,
        avatar: item.avatar,
        unread: chatUnread[chatID] || 0,
        lastMessage: latestMsg ? latestMsg.content : '',
        time: latestMsg && latestMsg.sendTime ? util.formatChatTime(latestMsg.sendTime) : item.time,
        sendTime: latestMsg ? (latestMsg.sendTime || '') : item.sendTime
      }
    })

    this.setData({ chatList: sortBySendTime(merged) })
  },

  // ---- 事件处理 ----

  onWSMessage() {
    this.mergeFresh()
  },

  goChat(e) {
    var ds = e.currentTarget.dataset
    var unread = parseInt(ds.unread) || 0
    wx.navigateTo({
      url: '/pages/messages/chat/index?chatID=' + ds.chatid + '&talkerID=' + ds.talkerid + '&unread=' + unread
    })
  }
})
