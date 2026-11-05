function request({ url, method = 'GET', data, header = {} }) {
  const token = wx.getStorageSync('token')
  const baseUrl = getApp().globalData.baseUrl
  const fullUrl = url.startsWith('http') ? url : baseUrl + url

  if (token) {
    header['Authorization'] = token
  }
  if (method === 'POST' && !header['Content-Type']) {
    header['Content-Type'] = 'application/json'
  }

  return new Promise((resolve, reject) => {
    wx.request({
      url: fullUrl,
      method,
      data,
      header,
      success: (res) => {
        var d = res.data
        if (d && d.code === 10001) {
          var tip = d.message || ''
          if (tip) wx.showToast({ title: tip, icon: 'none', duration: 2000 })
        }
        resolve(d)
      },
      fail: (err) => reject(err)
    })
  })
}

function get(url, data) {
  return request({ url, method: 'GET', data })
}

function post(url, data) {
  return request({ url, method: 'POST', data })
}

module.exports = { request, get, post }
