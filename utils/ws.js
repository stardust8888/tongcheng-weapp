let socketTask = null
let isConnected = false
let reconnectTimer = null
let reconnectCount = 0
let heartbeatTimer = null
const HEARTBEAT_TIMEOUT = 45000
const listeners = {}

function connect(token) {
  if (socketTask) close(true)
  if (!token) return

  const url = getApp().globalData.wsUrl + '/ws/v1/handshake?token=' + token
  socketTask = wx.connectSocket({ url, success() { }, fail() { } })

  socketTask.onOpen(function () {
    console.log('[WS] connected')
    isConnected = true
    reconnectCount = 0
    resetHeartbeat()
  })

  socketTask.onMessage(function (res) {
    if (res.data === 'ping') {
      if (socketTask && isConnected) {
        socketTask.send({ data: 'pong' })
      }
      resetHeartbeat()
      return
    }
    if (res.data === 'connect success') {
      return
    }

    let msg
    try { msg = JSON.parse(res.data) } catch (e) { return }

    resetHeartbeat()

    if (msg.messageType === 0) return
    if (msg.messageType === 4) {
      console.log('[WS] tip:', msg.content)
      return
    }

    emit('message', msg)
  })

  socketTask.onClose(function () {
    console.log('[WS] closed')
    cleanup()
    scheduleReconnect()
  })

  socketTask.onError(function (err) {
    console.log('[WS] error', err)
    cleanup()
    scheduleReconnect()
  })
}

function cleanup() {
  isConnected = false
  socketTask = null
  if (heartbeatTimer) {
    clearTimeout(heartbeatTimer)
    heartbeatTimer = null
  }
}

function resetHeartbeat() {
  if (heartbeatTimer) clearTimeout(heartbeatTimer)
  heartbeatTimer = setTimeout(function () {
    console.log('[WS] heartbeat timeout, reconnecting')
    if (socketTask) {
      try { socketTask.close() } catch (e) { }
    }
    cleanup()
    scheduleReconnect()
  }, HEARTBEAT_TIMEOUT)
}

function scheduleReconnect() {
  if (reconnectTimer) return
  var delay = Math.min(3000 * Math.pow(2, reconnectCount), 30000)
  reconnectCount++
  console.log('[WS] reconnect in', delay, 'ms, attempt', reconnectCount)
  reconnectTimer = setTimeout(function () {
    reconnectTimer = null
    var token = wx.getStorageSync('token')
    if (token) connect(token)
  }, delay)
}

function checkReconnect() {
  if (isConnected) return
  if (reconnectTimer) return
  var token = wx.getStorageSync('token')
  if (!token) return
  reconnectCount = 0
  connect(token)
}

function send(data) {
  if (!socketTask || !isConnected) return false
  if (!data.msgID) data.msgID = require('./util').uuid()
  socketTask.send({ data: JSON.stringify(data) })
  return true
}

function close(internal) {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }
  if (heartbeatTimer) {
    clearTimeout(heartbeatTimer)
    heartbeatTimer = null
  }
  if (!internal) reconnectCount = 0
  if (socketTask) {
    try { socketTask.close() } catch (e) { }
    socketTask = null
  }
  isConnected = false
}

function on(event, callback) {
  if (!listeners[event]) listeners[event] = []
  listeners[event].push(callback)
}

function off(event, callback) {
  if (!listeners[event]) return
  listeners[event] = listeners[event].filter(function (fn) { return fn !== callback })
}

function emit(event, data) {
  if (!listeners[event]) return
  listeners[event].forEach(function (fn) { fn(data) })
}

function getConnected() {
  return isConnected
}

module.exports = { connect, send, close, on, off, getConnected, checkReconnect }
