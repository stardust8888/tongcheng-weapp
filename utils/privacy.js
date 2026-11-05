// 微信「用户隐私保护指引」对接
// 调用敏感接口(手机号 getPhoneNumber、相册/相机 chooseMedia 等)前，确保用户已同意指引
//
// 前置条件(非代码)：需在 mp 后台「设置 - 用户隐私保护指引」填写并声明收集的个人信息类型
// (手机号、相册照片等)。未配置时 getPrivacySetting.needAuthorization 恒为 false，本封装直接放行不阻断；
// 配置后，未同意的用户会在此处弹出授权窗，同意才继续，拒绝则走 fail 回调。
function ensurePrivacy(success, fail) {
  // 旧版本基础库无隐私接口，直接放行
  if (typeof wx.getPrivacySetting !== 'function') {
    success && success()
    return
  }
  wx.getPrivacySetting({
    success: function (res) {
      if (res && res.needAuthorization) {
        wx.requirePrivacyAuthorize({
          success: function () { success && success() },
          fail: function (err) { fail && fail(err) }
        })
      } else {
        // 无需授权(已同意或未配置指引)，直接放行
        success && success()
      }
    },
    fail: function () {
      // 查询失败不阻断主流程，放行
      success && success()
    }
  })
}

module.exports = { ensurePrivacy: ensurePrivacy }
