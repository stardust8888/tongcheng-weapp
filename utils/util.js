function buildAvatarUrl(filePath) {
  if (!filePath) return ''
  if (filePath.startsWith('/') || filePath.startsWith('http') || filePath.startsWith('wxfile://')) return filePath
  return '/assets/avatar/' + filePath
}

function loadPhoto(filePath) {
  if (!filePath) return Promise.resolve('/assets/images/no_photo.png')
  var imageCache = require('./image-cache')
  return imageCache.loadImage(filePath).then(function (url) {
    return url || '/assets/images/no_photo.png'
  })
}

function formatTime(dateStr) {
  if (!dateStr) return ''
  var date = new Date(dateStr)
  if (isNaN(date.getTime())) return ''
  var now = new Date()
  var diff = now - date
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前'
  if (diff < 86400000) return Math.floor(diff / 3600000) + '小时前'
  if (diff < 172800000) return '昨天'
  return (date.getMonth() + 1) + '/' + date.getDate()
}

function formatChatTime(sendTime) {
  if (!sendTime) return ''
  var date = new Date(sendTime.replace(/-/g, '/'))
  if (isNaN(date.getTime())) return ''
  var now = new Date()
  var pad = function (n) { return n < 10 ? '0' + n : '' + n }
  var time = pad(date.getHours()) + ':' + pad(date.getMinutes())
  var today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  var target = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  var diff = today - target
  if (diff === 0) return time
  if (diff === 86400000) return '昨天 ' + time
  return date.getFullYear() + '/' + pad(date.getMonth() + 1) + '/' + pad(date.getDate()) + ' ' + time
}


function calcBirthYear(birth) {
  if (!birth) return ''
  var year = new Date(birth).getFullYear()
  if (!year || isNaN(year)) return ''
  return String(year).slice(2) + '年'
}

function parsePictures(pictureStr) {
  if (!pictureStr) return []
  return pictureStr.split(',').filter(Boolean).map(function (p) {
    return p.trim()
  })
}

function loadPictures(pictureStr) {
  if (!pictureStr) return Promise.resolve([])
  var paths = pictureStr.split(',').filter(Boolean).map(function (p) { return p.trim() })
  return Promise.all(paths.map(function (p) { return loadPhoto(p) }))
}

function cutText(str, len = 10) {
  if (!str) return ''
  if (str.length > len) {
    return str.slice(0, len) + '...'
  } else {
    return str
  }
}

function uuid() {
  var s = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    var r = Math.random() * 16 | 0
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16)
  })
  return s
}

module.exports = {
  uuid,
  buildAvatarUrl,
  loadPhoto,
  formatTime,
  formatChatTime,
  calcBirthYear,
  parsePictures,
  loadPictures,
  cutText
}
