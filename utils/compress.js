var SKIP_SIZE = 300 * 1024

function getFileSize(src) {
  return new Promise(function (resolve) {
    wx.getFileSystemManager().getFileInfo({
      filePath: src,
      success: function (res) { resolve(res.size) },
      fail: function () { resolve(0) }
    })
  })
}

function wxCompress(src, quality) {
  return new Promise(function (resolve) {
    wx.compressImage({
      src: src,
      quality: quality,
      compressedWidth: 1080,
      success: function (res) { resolve(res.tempFilePath) },
      fail: function () { resolve(src) }
    })
  })
}

function compress(src) {
  var originalSize = 0

  return getFileSize(src).then(function (size) {
    originalSize = size
    if (size > 0 && size <= SKIP_SIZE) return src

    var quality
    if (size > 3 * 1024 * 1024) quality = 60
    else if (size > 2 * 1024 * 1024) quality = 70
    else if (size > 1024 * 1024) quality = 80
    else quality = 90

    return wxCompress(src, quality)
  }).then(function (result) {
    if (result === src) return src
    return getFileSize(result).then(function (newSize) {
      if (originalSize > 0 && newSize >= originalSize) return src
      return result
    })
  })
}

module.exports = { compress: compress }
