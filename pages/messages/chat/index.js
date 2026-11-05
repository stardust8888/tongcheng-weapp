var ws = require('../../../utils/ws')
var http = require('../../../utils/http')
var util = require('../../../utils/util')
var theme = require('../../../utils/theme')

var TIME_GAP = 5 * 60 * 1000

function formatTimeLabel(timeStr) {
  if (!timeStr) return ''
  var d = new Date(timeStr.replace(/-/g, '/'))
  if (isNaN(d.getTime())) return ''
  var now = new Date()
  var today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  var target = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  var diff = today - target
  var pad = function (n) { return n < 10 ? '0' + n : '' + n }
  var time = pad(d.getHours()) + ':' + pad(d.getMinutes())

  if (diff === 0) return time
  if (diff === 86400000) return '昨天 ' + time
  return d.getFullYear() + '/' + pad(d.getMonth() + 1) + '/' + pad(d.getDate()) + ' ' + time
}

function markTimeLabels(list) {
  var lastTime = 0
  for (var i = 0; i < list.length; i++) {
    var item = list[i]
    var t = 0
    if (item.sendTime) {
      var d = new Date(item.sendTime.replace(/-/g, '/'))
      if (!isNaN(d.getTime())) t = d.getTime()
    }
    if (t && (t - lastTime > TIME_GAP || lastTime === 0)) {
      item.showTime = true
      item.timeLabel = formatTimeLabel(item.sendTime)
      lastTime = t
    } else {
      item.showTime = false
      item.timeLabel = ''
    }
  }
  return list
}

Page({
  data: {
    chatID: '',
    talkerID: 0,
    talkerName: '',
    talkerAvatar: '/assets/avatar/default.png',
    myID: 0,
    myAvatar: '/assets/avatar/default.png',
    messageList: [],
    inputValue: '',
    scrollToView: '',
    loading: false,
    page: 1,
    pageSize: 20,
    noMore: false,
    keyboardHeight: 0,
    inputFocus: false,
    unreadCount: 0,
    unreadDividerIndex: -1,
    showNewMsgTip: false,
    _: 0
  },

  _wsHandler: null,

  onShow() {
    this.setData({ themeClass: theme.getThemeClass() })
  },

  onLoad(options) {
    var userInfo = getApp().globalData.userInfo
    var myID = userInfo ? userInfo.id : 0
    var myAvatar = userInfo && userInfo.avatar ? '/assets/avatar/' + userInfo.avatar : '/assets/avatar/default.png'
    var talkerName = options.talkerName ? decodeURIComponent(options.talkerName) : ''
    var talkerAvatar = options.talkerAvatar ? '/assets/avatar/' + decodeURIComponent(options.talkerAvatar) : ''
    var unread = parseInt(options.unread) || 0
    var maxUnreadPages = 5
    var pagesToLoad = Math.min(Math.ceil(unread / this.data.pageSize), maxUnreadPages) || 1
    this.setData({
      chatID: options.chatID || '',
      talkerID: parseInt(options.talkerID) || 0,
      talkerName: talkerName,
      talkerAvatar: talkerAvatar || '/assets/avatar/default.png',
      myID: myID,
      myAvatar: myAvatar,
      unreadCount: unread
    })
    this._pagesToLoad = pagesToLoad
    if (talkerName) wx.setNavigationBarTitle({ title: talkerName })

    if (this.data.talkerID && !talkerName) this.loadTalkerInfo()
    if (this.data.chatID) this.loadInitialMessages()

    ws.checkReconnect()

    this._wsHandler = this.onWSMessage.bind(this)
    ws.on('message', this._wsHandler)
  },

  onUnload() {
    if (this._wsHandler) {
      ws.off('message', this._wsHandler)
      this._wsHandler = null
    }
  },

  loadTalkerInfo() {
    var that = this
    http.get('/web/v1/chat/list').then(function (res) {
      if (res.code !== 200) return
      var chats = res.data || []
      var chat = chats.find(function (c) { return c.chatID === that.data.chatID })
      if (chat && chat.talker) {
        var name = chat.talker.username || '用户'
        that.setData({
          talkerName: name,
          talkerAvatar: chat.talker.avatar ? '/assets/avatar/' + chat.talker.avatar : '/assets/avatar/default.png'
        })
        wx.setNavigationBarTitle({ title: name })
      }
    })
  },

  loadInitialMessages() {
    var that = this
    var pagesToLoad = this._pagesToLoad || 1
    var allMsgs = []
    var chatID = this.data.chatID
    var pageSize = this.data.pageSize

    this.setData({ loading: true })

    function loadPage(p) {
      return http.get('/web/v1/message/list', {
        chatID: chatID,
        page: p,
        pageSize: pageSize
      }).then(function (res) {
        if (res.code !== 200) return { items: [], done: true }
        var pageData = res.data || {}
        var items = pageData.items || []
        return { items: items, done: items.length < pageSize }
      })
    }

    function loadSequential(p, maxPage) {
      if (p > maxPage) return Promise.resolve()
      return loadPage(p).then(function (result) {
        allMsgs = allMsgs.concat(result.items)
        if (result.done) {
          that.setData({ noMore: true })
          return
        }
        return loadSequential(p + 1, maxPage)
      })
    }

    loadSequential(1, pagesToLoad).then(function () {
      var msgs = allMsgs.map(function (m) {
        return {
          msgID: m.msgID,
          senderID: m.senderID,
          receiverID: m.receiverID,
          contentType: m.contentType,
          content: m.content || '',
          sendTime: m.sendTime,
          seqID: m.seqID
        }
      }).reverse()

      var unread = that.data.unreadCount
      var dividerIndex = -1
      if (unread > 0 && unread < msgs.length) {
        dividerIndex = msgs.length - unread
      }

      var list = markTimeLabels(msgs)
      that.setData({
        messageList: list,
        loading: false,
        page: pagesToLoad,
        unreadDividerIndex: dividerIndex,
        showNewMsgTip: unread > 0 && dividerIndex >= 0
      })
      that.mergeFresh()
      that.sendReadReceipt()

      if (dividerIndex >= 0) {
        setTimeout(function () {
          that.setData({ scrollToView: 'unread-divider' })
        }, 150)
      } else {
        that.scrollToBottom()
      }
    }).catch(function () {
      that.setData({ loading: false })
    })
  },

  loadMessages() {
    if (this.data.loading || this.data.noMore) return
    this.setData({ loading: true })
    var that = this
    http.get('/web/v1/message/list', {
      chatID: this.data.chatID,
      page: this.data.page,
      pageSize: this.data.pageSize
    }).then(function (res) {
      if (res.code !== 200) {
        that.setData({ loading: false })
        return
      }
      var pageData = res.data || {}
      var raw = pageData.items || []
      if (raw.length < that.data.pageSize) {
        that.setData({ noMore: true })
      }
      var msgs = raw.map(function (m) {
        return {
          msgID: m.msgID,
          senderID: m.senderID,
          receiverID: m.receiverID,
          contentType: m.contentType,
          content: m.content || '',
          sendTime: m.sendTime,
          seqID: m.seqID
        }
      }).reverse()

      var list = markTimeLabels(msgs.concat(that.data.messageList))
      that.setData({ messageList: list, loading: false })
      that.mergeFresh()
    }).catch(function () {
      that.setData({ loading: false })
    })
  },

  loadMore() {
    if (this.data.noMore || this.data.loading) return
    this.setData({ page: this.data.page + 1 })
    this.loadMessages()
  },

  onWSMessage(msg) {
    if (msg.chatID !== this.data.chatID) return
    if (msg.messageType !== 1) return

    if (msg.contentType === 5 || msg.contentType === 6) {
      this.updateMessageStatus(msg.msgID, msg.contentType === 5 ? 'sent' : 'read')
      return
    }

    var item = {
      msgID: msg.msgID,
      senderID: msg.senderID,
      receiverID: msg.receiverID,
      contentType: msg.contentType,
      content: msg.content || '',
      sendTime: msg.sendTime,
      seqID: msg.seqID
    }
    var list = this.data.messageList.concat([item])
    list = markTimeLabels(list)
    this.setData({ messageList: list })
    this.scrollToBottom()

    if (msg.senderID !== this.data.myID) {
      this.sendReadReceipt()
    }
  },

  updateMessageStatus(msgID, status) {
    var list = this.data.messageList
    for (var i = list.length - 1; i >= 0; i--) {
      if (list[i].msgID === msgID) {
        this.setData({ ['messageList[' + i + '].status']: status })
        return
      }
    }
  },

  sendMessage() {
    var text = this.data.inputValue.trim()
    if (!text) return

    var msgID = util.uuid()
    var msg = {
      msgID: msgID,
      chatID: this.data.chatID,
      senderID: this.data.myID,
      receiverID: this.data.talkerID,
      messageType: 1,
      contentType: 1,
      content: text
    }

    var sent = ws.send(msg)
    if (!sent) {
      wx.showToast({ title: '发送失败，连接已断开', icon: 'none' })
      return
    }

    var item = {
      msgID: msgID,
      senderID: this.data.myID,
      receiverID: this.data.talkerID,
      contentType: 1,
      content: text
    }
    var list = this.data.messageList.concat([item])
    list = markTimeLabels(list)
    var that = this
    this.setData({ messageList: list, inputValue: '', inputFocus: false }, function () {
      that.setData({ inputFocus: true })
    })
    this.scrollToBottom()
  },

  sendReadReceipt() {
    var list = this.data.messageList
    if (!list.length) return
    var last = list[list.length - 1]
    if (!last.seqID) return
    ws.send({
      chatID: this.data.chatID,
      senderID: this.data.myID,
      receiverID: this.data.talkerID,
      messageType: 1,
      contentType: 6,
      content: '',
      seqID: last.seqID
    })
  },

  mergeFresh() {
    var freshData = getApp().globalData.freshData
    if (!freshData) return
    var chatID = this.data.chatID
    var readMax = (freshData.chat_talker_read_max_seq_id || {})[chatID] || 0
    var receiptMax = (freshData.chat_user_receipt_max_seq_id || {})[chatID] || 0
    if (!readMax && !receiptMax) return

    var list = this.data.messageList
    var updates = {}
    for (var i = 0; i < list.length; i++) {
      var msg = list[i]
      if (msg.senderID !== this.data.myID) continue
      if (!msg.seqID) continue
      var status = ''
      if (readMax && msg.seqID <= readMax) {
        status = 'read'
      } else if (receiptMax && msg.seqID <= receiptMax) {
        status = 'sent'
      }
      if (status && msg.status !== status) {
        updates['messageList[' + i + '].status'] = status
      }
    }
    if (Object.keys(updates).length > 0) {
      this.setData(updates)
    }
  },

  scrollToBottom() {
    var list = this.data.messageList
    if (!list.length) return
    var that = this
    setTimeout(function () {
      that.setData({ scrollToView: 'msg-' + list[list.length - 1].msgID })
    }, 100)
  },

  scrollToNewMsg() {
    this.setData({ showNewMsgTip: false })
    this.scrollToBottom()
  },

  onScrollMsg(e) {
    if (!this.data.showNewMsgTip) return
    var that = this
    var query = wx.createSelectorQuery()
    query.select('#unread-divider').boundingClientRect()
    query.select('.msg-scroll').boundingClientRect()
    query.exec(function (res) {
      if (!res[0] || !res[1]) return
      var dividerBottom = res[0].bottom
      var scrollBottom = res[1].bottom
      if (dividerBottom <= scrollBottom) {
        that.setData({ showNewMsgTip: false })
      }
    })
  },

  previewImage(e) {
    var url = e.currentTarget.dataset.url
    if (url) wx.previewImage({ current: url, urls: [url] })
  },

  onInput(e) {
    this.setData({ inputValue: e.detail.value })
  },

  onFocus(e) {
    this.setData({ keyboardHeight: e.detail.height || 0 })
    this.scrollToBottom()
  },

  onBlur() {
    this.setData({ keyboardHeight: 0 })
  },

  goUserDetail() {
    var userID = this.data.talkerID
    if (!userID) return
    wx.navigateTo({ url: '/pages/profile/home/index?id=' + userID })
  }
})
