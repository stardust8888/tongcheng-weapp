var regionData = require('../../../utils/region-data')
var http = require('../../../utils/http')
var util = require('../../../utils/util')
var compress = require('../../../utils/compress')
var constant = require('../../../utils/constant')
var theme = require('../../../utils/theme')
var privacy = require('../../../utils/privacy')

var relationOptions = constant.relationOptions
var educationOptions = constant.educationOptions
var maritalOptions = constant.maritalOptions
var maritalPlanOptions = constant.maritalPlanOptions
var onlyChildOptions = constant.onlyChildOptions
var houseOptions = constant.houseOptions
var carOptions = constant.carOptions
var incomeOptions = constant.incomeOptions
var heightOptions = constant.heightOptions
var weightOptions = constant.weightOptions
var companyOptions = constant.companyOptions
var workOptions = constant.workOptions
var interestOptions = constant.interestOptions

// 由生日(YYYY-MM-DD)计算周岁；空或格式异常返回 -1
function calcAge(birth) {
  if (!birth) return -1
  var parts = birth.split('-')
  if (parts.length < 3) return -1
  var by = parseInt(parts[0])
  var bm = parseInt(parts[1])
  var bd = parseInt(parts[2])
  if (!by || !bm || !bd) return -1
  var now = new Date()
  var age = now.getFullYear() - by
  var cm = now.getMonth() + 1
  var cd = now.getDate()
  if (cm < bm || (cm === bm && cd < bd)) age--
  return age
}

// 婚恋资料主体须为成年人；如需更严的婚龄(男22/女20)可调高此值
var MIN_AGE = 18

var pickerConfig = {
  relation: { title: '与您关系', options: relationOptions },
  education: { title: '学历', options: educationOptions },
  maritalStatus: { title: '婚姻状况', options: maritalOptions },
  maritalPlan: { title: '结婚计划', options: maritalPlanOptions },
  isOnlyChild: { title: '独生子女', options: onlyChildOptions },
  house: { title: '房产', options: houseOptions },
  car: { title: '车辆', options: carOptions },
  yearIncome: { title: '年薪', options: incomeOptions },
  height: { title: '身高', options: heightOptions },
  weight: { title: '体重', options: weightOptions },
  company: { title: '公司性质', options: companyOptions },
  work: { title: '职业', options: workOptions }
}

Page({
  data: {
    isEdit: false,
    childId: 0,
    saving: false,

    relationOptions: relationOptions,
    educationOptions: educationOptions,
    maritalOptions: maritalOptions,
    maritalPlanOptions: maritalPlanOptions,
    onlyChildOptions: onlyChildOptions,
    houseOptions: houseOptions,
    carOptions: carOptions,
    incomeOptions: incomeOptions,
    heightOptions: heightOptions,
    weightOptions: weightOptions,
    companyOptions: companyOptions,
    workOptions: workOptions,

    relation: 0,
    birth: '',
    height: 0,
    weight: 0,
    education: 0,
    maritalStatus: 0,
    maritalPlan: 0,
    isOnlyChild: 0,
    house: 0,
    car: 0,
    company: 0,
    work: 0,
    yearIncome: 0,
    province: '',
    city: '',
    district: '',
    regionText: '',
    photoList: [],
    pickerVisible: false,
    pickerTitle: '',
    pickerField: '',
    pickerOptions: [],
    pickerValue: 0,
    pickerDisplayOptions: [],
    pickerViewValue: [0],
    interest: [],
    tagList: interestOptions.map(function (n) { return { name: n, selected: false } }),
    description: '',

    regionPickerVisible: false,
    regionProvinces: [],
    regionCities: [],
    regionDistricts: [],
    regionPickerValue: [0, 0, 0],

    datePickerVisible: false,
    years: [],
    months: [],
    days: [],
    datePickerValue: [0, 0, 0]
  },

  onShow() {
    this.setData({ themeClass: theme.getThemeClass() })
  },

  onLoad() {
    this.initDatePicker()
    this.loadProfileData()
  },

  initDatePicker() {
    var years = []
    // 婚恋资料主体须成年：出生年份上限 = 当前年 - 18，配合保存前的精确周岁校验
    var maxYear = new Date().getFullYear() - MIN_AGE
    for (var y = 1960; y <= maxYear; y++) years.push(y)
    var months = []
    for (var m = 1; m <= 12; m++) months.push(m)
    var days = []
    for (var d = 1; d <= 31; d++) days.push(d)
    this.setData({ years: years, months: months, days: days })
  },

  getDaysInMonth(year, month) {
    return new Date(year, month, 0).getDate()
  },

  openDatePicker() {
    var birth = this.data.birth
    var years = this.data.years
    var yi = 35, mi = 0, di = 0
    if (birth) {
      var parts = birth.split('-')
      yi = parseInt(parts[0]) - 1960
      mi = parseInt(parts[1]) - 1
      di = parseInt(parts[2]) - 1
    }
    // 历史数据可能存在超上限年份：夹到有效范围，避免选择器越界
    if (yi < 0) yi = 0
    if (yi > years.length - 1) yi = years.length - 1
    var year = years[yi] || 1990
    var month = mi + 1
    var maxDay = this.getDaysInMonth(year, month)
    var days = []
    for (var d = 1; d <= maxDay; d++) days.push(d)
    this.setData({
      datePickerVisible: true,
      datePickerValue: [yi, mi, di],
      days: days
    })
  },

  onDatePickerChange(e) {
    var val = e.detail.value
    var years = this.data.years
    var year = years[val[0]]
    var month = val[1] + 1
    var maxDay = this.getDaysInMonth(year, month)
    var days = []
    for (var d = 1; d <= maxDay; d++) days.push(d)
    var di = val[2]
    if (di >= maxDay) di = maxDay - 1
    this.setData({ datePickerValue: [val[0], val[1], di], days: days })
  },

  confirmDatePicker() {
    var dpv = this.data.datePickerValue
    var y = this.data.years[dpv[0]]
    var m = this.data.months[dpv[1]]
    var d = this.data.days[dpv[2]] || 1
    var birth = y + '-' + String(m).padStart(2, '0') + '-' + String(d).padStart(2, '0')
    this.setData({ birth: birth, datePickerVisible: false })
  },

  closeDatePicker() {
    this.setData({ datePickerVisible: false })
  },

  loadProfileData() {
    var that = this
    http.get('/web/v1/user/profile').then(function (res) {
      if (res.code !== 200) return
      var child = res.data.child
      if (child && child.id) {
        var region = [child.province, child.city, child.district].filter(Boolean)
        var interestArr = child.interest ? child.interest.split(',').filter(function (t) {
          return interestOptions.indexOf(t) > -1
        }) : []
        var tagList = interestOptions.map(function (name) {
          return { name: name, selected: interestArr.indexOf(name) > -1 }
        })
        that.setData({
          isEdit: true,
          childId: child.id,
          relation: child.relation || 0,
          birth: child.birth || '',
          height: child.height >= 140 && child.height <= 220 ? child.height - 139 : 0,
          weight: child.weight >= 35 && child.weight <= 150 ? child.weight - 34 : 0,
          education: child.education || 0,
          maritalStatus: child.maritalStatus || 0,
          maritalPlan: child.maritalPlan || 0,
          isOnlyChild: child.isOnlyChild || 0,
          house: child.house || 0,
          car: child.car || 0,
          company: child.company || 0,
          work: child.work || 0,
          yearIncome: child.yearIncome || 0,
          province: child.province || '',
          city: child.city || '',
          district: child.district || '',
          regionText: region.length ? region.join(' ') : '',
          photoList: child.photo ? child.photo.split(',').filter(Boolean).map(function (p) {
            return { path: p, display: '/assets/images/no_photo.png', uploading: false }
          }) : [],
          interest: interestArr,
          tagList: tagList,
          description: child.description || ''
        })
        var photos = child.photo ? child.photo.split(',').filter(Boolean) : []
        photos.forEach(function (p, i) {
          util.loadPhoto(p).then(function (url) {
            that.setData({ ['photoList[' + i + '].display']: url })
          })
        })
      }
    })
  },

  openPicker(e) {
    var field = e.currentTarget.dataset.field
    var config = pickerConfig[field]
    if (!config) return
    var displayOptions = config.options.slice(1)
    var currentVal = this.data[field]
    // 身高/体重默认值随"与您的关系"变化（仅在未选时作为选择器初始位）：女儿165/55、儿子175/75、未填170/65
    var relation = this.data.relation
    var heightDef, weightDef
    if (relation === 2) { heightDef = 25; weightDef = 20 }        // 女儿 165cm / 55kg
    else if (relation === 1) { heightDef = 35; weightDef = 40 }   // 儿子 175cm / 75kg
    else { heightDef = 30; weightDef = 30 }                       // 未填 170cm / 65kg
    var defaultIndex = { height: heightDef, weight: weightDef, education: 2, house: 1, car: 1, yearIncome: 1 }
    var viewIndex = currentVal > 0 ? currentVal - 1 : (defaultIndex[field] || 0)
    var that = this
    this.setData({
      pickerVisible: true,
      pickerTitle: config.title,
      pickerField: field,
      pickerOptions: config.options,
      pickerDisplayOptions: displayOptions,
      pickerViewValue: [viewIndex]
    }, function () {
      that.setData({ pickerViewValue: [viewIndex] })
    })
  },

  onPickerViewChange(e) {
    this.setData({ pickerViewValue: e.detail.value })
  },

  confirmPicker() {
    var field = this.data.pickerField
    var idx = this.data.pickerViewValue[0] + 1
    var data = { [field]: idx, pickerVisible: false }
    if (field === 'company') {
      // 公司→职业 默认联动：政府机关→公务员、在校学生→在校学生、待业→待业
      var workLink = { 4: 8, 7: 21, 8: 22 }
      var linkedWork = workLink[idx]
      if (linkedWork) {
        data.work = linkedWork
      } else if (this.data.work === 8 || this.data.work === 21 || this.data.work === 22) {
        // 改回无联动公司性质时，清掉此前自动带入的联动职业
        data.work = 0
      }
    }
    this.setData(data)
  },

  closePicker() {
    this.setData({ pickerVisible: false })
  },

  noop() { },

  openRegionPicker() {
    var provinces = regionData.map(function (p) { return p.name })
    var prov = this.data.province || '湖北省'
    var cty = this.data.city || '武汉市'
    var dist = this.data.district || '江岸区'
    var pi = Math.max(provinces.indexOf(prov), 0)
    var cities = regionData[pi].cities.map(function (c) { return c.name })
    var ci = Math.max(cities.indexOf(cty), 0)
    var districts = regionData[pi].cities[ci].districts
    var di = Math.max(districts.indexOf(dist), 0)
    var rpv = [pi, ci, di]
    var that = this
    this.setData({
      regionPickerVisible: true,
      regionProvinces: provinces,
      regionCities: cities,
      regionDistricts: districts,
      regionPickerValue: rpv
    }, function () {
      that.setData({ regionPickerValue: rpv })
    })
  },

  onRegionPickerChange(e) {
    var val = e.detail.value
    var old = this.data.regionPickerValue
    var pi = val[0], ci = val[1], di = val[2]
    if (pi !== old[0]) {
      var cities = regionData[pi].cities.map(function (c) { return c.name })
      var districts = regionData[pi].cities[0].districts
      this.setData({
        regionCities: cities,
        regionDistricts: districts,
        regionPickerValue: [pi, 0, 0]
      })
    } else if (ci !== old[1]) {
      var dists = regionData[pi].cities[ci].districts
      this.setData({
        regionDistricts: dists,
        regionPickerValue: [pi, ci, 0]
      })
    } else {
      this.setData({ regionPickerValue: [pi, ci, di] })
    }
  },

  confirmRegionPicker() {
    var pv = this.data.regionPickerValue
    var province = regionData[pv[0]].name
    var city = regionData[pv[0]].cities[pv[1]].name
    var district = regionData[pv[0]].cities[pv[1]].districts[pv[2]] || ''
    this.setData({
      province: province,
      city: city,
      district: district,
      regionText: [province, city, district].filter(Boolean).join(' '),
      regionPickerVisible: false
    })
  },

  closeRegionPicker() {
    this.setData({ regionPickerVisible: false })
  },

  onInput(e) {
    var field = e.currentTarget.dataset.field
    this.setData({ [field]: e.detail.value })
  },

  toggleInterest(e) {
    var tag = e.currentTarget.dataset.tag
    var i = interestOptions.indexOf(tag)
    if (i < 0) return
    var interest = this.data.interest.slice()
    var idx = interest.indexOf(tag)
    var select
    if (idx > -1) {
      interest.splice(idx, 1)
      select = false
    } else {
      if (interest.length >= 5) {
        wx.showToast({ title: '最多选择5项', icon: 'none' })
        return
      }
      interest.push(tag)
      select = true
    }
    // 仅更新被点击项的 selected，避免整表重建引发长页面重绘卡顿（底部按钮不重绘）
    this.setData({
      interest: interest,
      ['tagList[' + i + '].selected']: select
    })
  },

  choosePhoto() {
    var that = this
    var remain = 6 - this.data.photoList.length
    if (remain <= 0) {
      wx.showToast({ title: '最多上传6张照片', icon: 'none' })
      return
    }
    // 相册/相机属隐私接口：选图前确保已同意《用户隐私保护指引》
    privacy.ensurePrivacy(function () {
      wx.chooseMedia({
        count: remain,
        mediaType: ['image'],
        success: function (res) {
          var list = that.data.photoList.slice()
          var startIdx = list.length
          res.tempFiles.forEach(function (f) {
            list.push({ path: '', display: f.tempFilePath, uploading: true })
          })
          that.setData({ photoList: list })
          res.tempFiles.forEach(function (f, i) {
            compress.compress(f.tempFilePath).then(function (path) {
              that.uploadPhoto(startIdx + i, path)
            })
          })
        },
        fail: function () {
          // 用户取消选图或授权失败，静默返回
        }
      })
    }, function () {
      wx.showToast({ title: '需同意《用户隐私保护指引》', icon: 'none' })
    })
  },

  uploadPhoto(index, tempPath) {
    var that = this
    var token = wx.getStorageSync('token')
    var fileUrl = getApp().globalData.fileUrl
    wx.uploadFile({
      url: fileUrl + '/file/v1/ff/upload?sense=/child_photo',
      filePath: tempPath,
      name: 'file',
      header: { 'Authorization': token },
      success: function (res) {
        var data = JSON.parse(res.data)
        var list = that.data.photoList.slice()
        if (index >= list.length) return
        if (data.code === 200) {
          list[index] = { path: data.data.filePath, display: tempPath, uploading: false }
        } else {
          list.splice(index, 1)
          wx.showToast({ title: '图片上传失败', icon: 'none' })
        }
        that.setData({ photoList: list })
        that.syncPhoto()
      },
      fail: function () {
        var list = that.data.photoList.slice()
        if (index < list.length) {
          list.splice(index, 1)
          that.setData({ photoList: list })
        }
        wx.showToast({ title: '图片上传失败', icon: 'none' })
      }
    })
  },

  removePhoto(e) {
    var index = e.currentTarget.dataset.index
    var list = this.data.photoList.slice()
    var item = list[index]
    list.splice(index, 1)
    this.setData({ photoList: list })
    this.syncPhoto()
    if (item && item.path && !item.path.startsWith('wxfile://') && !item.path.startsWith('http://tmp')) {
      var token = wx.getStorageSync('token')
      var fileUrl = getApp().globalData.fileUrl
      wx.request({
        url: fileUrl + '/file/v1/ff/delete',
        method: 'POST',
        header: { 'Authorization': token, 'Content-Type': 'application/json' },
        data: { filePath: item.path }
      })
    }
  },

  buildChildBody() {
    var body = {
      relation: this.data.relation,
      birth: this.data.birth,
      height: this.data.height > 0 ? this.data.height + 139 : 0,
      weight: this.data.weight > 0 ? this.data.weight + 34 : 0,
      education: this.data.education,
      maritalStatus: this.data.maritalStatus,
      maritalPlan: this.data.maritalPlan,
      isOnlyChild: this.data.isOnlyChild,
      house: this.data.house,
      car: this.data.car,
      company: this.data.company,
      work: this.data.work,
      yearIncome: this.data.yearIncome,
      province: this.data.province,
      city: this.data.city,
      district: this.data.district,
      photo: this.data.photoList.map(function (p) { return p.path }).filter(Boolean).join(','),
      interest: this.data.interest.join(','),
      description: this.data.description
    }
    if (this.data.isEdit) body.id = this.data.childId
    return body
  },

  syncPhoto() {
    if (!this.data.isEdit) return
    // 传全量字段：服务端按"与库内差异"更新，只传 photo 会把未传字段当 0 清空
    http.post('/web/v1/user/child/update', this.buildChildBody())
  },

  saveChild() {
    var body = this.buildChildBody()

    var url = this.data.isEdit
      ? '/web/v1/user/child/update'
      : '/web/v1/user/child/create'

    return http.post(url, body).then(function (res) {
      if (res.code !== 200) {
        // 10001(违规/业务提示) 已由 http 层弹 message，抛出静默标记避免 catch 重复弹
        if (res.code === 10001) throw { silent: true }
        throw res.message || '保存子女信息失败'
      }
      var childInfo = getApp().globalData.childInfo || {}
      for (var k in body) childInfo[k] = body[k]
      getApp().globalData.childInfo = childInfo
      wx.setStorageSync('childInfo', childInfo)
    })
  },

  onSave() {
    if (this.data.saving) return

    if (this.data.photoList.some(function (p) { return p.uploading })) {
      wx.showToast({ title: '图片上传中，请稍候', icon: 'none' })
      return
    }

    if (!this.data.relation) {
      wx.showToast({ title: '请选择与您的关系', icon: 'none' })
      return
    }

    // 婚恋资料主体须成年：须填写生日且满 MIN_AGE 周岁，拦截未成年人
    var age = calcAge(this.data.birth)
    if (age < 0) {
      wx.showToast({ title: '请选择生日', icon: 'none' })
      return
    }
    if (age < MIN_AGE) {
      wx.showToast({ title: '资料主体须年满' + MIN_AGE + '周岁', icon: 'none' })
      return
    }

    this.setData({ saving: true })
    var that = this

    this.saveChild()
      .then(function () {
        wx.showToast({ title: '保存成功', icon: 'success' })
        setTimeout(function () { wx.navigateBack() }, 1200)
      })
      .catch(function (msg) {
        // 10001 已由 http 层弹 message(silent 标记)，此处跳过避免重复提示
        if (msg && msg.silent) return
        wx.showToast({ title: msg || '保存失败', icon: 'none' })
      })
      .finally(function () {
        that.setData({ saving: false })
      })
  }
})
