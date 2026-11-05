var cacheMap = {}
var downloading = {}

function getLocal(filePath) {
  return cacheMap[filePath] || null
}

function download(filePath) {
  var token = wx.getStorageSync('token')
  var fileUrl = getApp().globalData.fileUrl
  var remoteUrl = fileUrl + '/file/v1/ff/view?filePath=' + encodeURIComponent(filePath)

  return new Promise(function (resolve, reject) {
    wx.downloadFile({
      url: remoteUrl,
      header: { 'Authorization': token },
      success: function (res) {
        if (res.statusCode === 200 && res.tempFilePath) {
          cacheMap[filePath] = res.tempFilePath
          resolve(res.tempFilePath)
        } else {
          reject(new Error('status ' + res.statusCode))
        }
      },
      fail: function (err) {
        reject(err)
      }
    })
  })
}

function loadImage(filePath) {
  if (!filePath) return Promise.resolve('')
  if (filePath.startsWith('http') || filePath.startsWith('wxfile://')) return Promise.resolve(filePath)

  var local = getLocal(filePath)
  if (local) return Promise.resolve(local)

  if (downloading[filePath]) return downloading[filePath]

  downloading[filePath] = download(filePath).then(function (localPath) {
    delete downloading[filePath]
    return localPath
  }).catch(function () {
    delete downloading[filePath]
    return ''
  })
  return downloading[filePath]
}

function clearCache() {
  cacheMap = {}
  downloading = {}
}

module.exports = { loadImage: loadImage, getLocal: getLocal, clearCache: clearCache }
