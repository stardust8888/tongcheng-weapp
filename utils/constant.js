var relationMap = { 1: '儿子', 2: '女儿' }
var educationMap = { 1: '高中', 2: '大专', 3: '本科', 4: '硕士', 5: '博士' }
var incomeMap = { 1: '10万以内', 2: '10-20万', 3: '20-30万', 4: '30-50万', 5: '50万以上' }
var roleMap = { 1: '父亲', 2: '母亲' }
var maritalMap = { 1: '未婚', 2: '离异', 3: '丧偶' }
var houseMap = { 1: '暂未购房', 2: '一套', 3: '两套及以上' }
var carMap = { 1: '暂未购车', 2: '一辆', 3: '两辆及以上' }
var maritalPlanMap = { 1: '尽快', 2: '一年内', 3: '两年内', 4: '时机成熟' }
var onlyChildMap = { 1: '是', 2: '否' }
var companyMap = { 1: '民营企业', 2: '国有企业', 3: '外资企业', 4: '政府机关', 5: '自由职业', 6: '其他', 7: '在校学生', 8: '待业' }
var workMap = {
  1: 'IT/互联网', 2: '金融/银行/保险', 3: '生产制造', 4: '建筑工程', 5: '教育培训', 6: '医疗护理', 7: "生物/制药", 8: '公务员', 9: "事业单位", 10: "高级管理",
  11: '销售/市场', 12: "财会/审计", 13: '法律', 14: '餐饮酒店', 15: '交通运输/物流', 16: "人事/行政", 17: "传媒/艺术", 18: "咨询顾问", 19: "个体经营", 20: '其他职业',
  21: '在校学生', 22: '待业'
}

// 兴趣爱好标签（固定30项，最多选5项；存库为逗号分隔字符串）
var interestOptions = [
  '旅游', '阅读', '美食', '电影', '音乐', '摄影', '运动', '健身', '瑜伽', '跑步',
  '游泳', '羽毛球', '篮球', '足球', '乒乓球', '网球', '骑行', '徒步', '登山', '钓鱼',
  '游戏', '动漫', '追剧', '烹饪', '烘焙', '养宠物', '书法', '绘画', '舞蹈', '茶艺'
]

function mapToOptions(map) {
  var arr = ['请选择']
  for (var k in map) arr.push(map[k])
  return arr
}

var roleOptions = mapToOptions(roleMap)
var relationOptions = mapToOptions(relationMap)
var educationOptions = mapToOptions(educationMap)
var incomeOptions = mapToOptions(incomeMap)
var maritalOptions = mapToOptions(maritalMap)
var houseOptions = mapToOptions(houseMap)
var carOptions = mapToOptions(carMap)
var maritalPlanOptions = mapToOptions(maritalPlanMap)
var onlyChildOptions = mapToOptions(onlyChildMap)
var companyOptions = mapToOptions(companyMap)
var workOptions = mapToOptions(workMap)

var heightOptions = ['请选择']
for (var _h = 140; _h <= 220; _h++) heightOptions.push(_h + 'cm')
var weightOptions = ['请选择']
for (var _w = 35; _w <= 150; _w++) weightOptions.push(_w + 'kg')

module.exports = {
  relationMap,
  educationMap,
  incomeMap,
  roleMap,
  maritalMap,
  houseMap,
  carMap,
  maritalPlanMap,
  onlyChildMap,
  companyMap,
  workMap,
  roleOptions,
  relationOptions,
  educationOptions,
  incomeOptions,
  maritalOptions,
  houseOptions,
  carOptions,
  maritalPlanOptions,
  onlyChildOptions,
  companyOptions,
  workOptions,
  interestOptions,
  heightOptions,
  weightOptions
}
