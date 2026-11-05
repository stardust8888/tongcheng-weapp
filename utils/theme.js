var colors = {
  coral: {
    primary: '#F06B6B',
    primaryLight: '#FF8A8A',
    gradient: 'linear-gradient(0deg, #F06B6B 0%, #FF8A8A 93%)'
  },
  purple: {
    primary: '#8841F3',
    primaryLight: '#A855F7',
    gradient: 'linear-gradient(0deg, #8841F3 0%, #A855F7 93%)'
  }
}

function getThemeName() {
  return wx.getStorageSync('theme') || 'coral'
}

function getThemeClass() {
  return getThemeName() === 'purple' ? 'theme-purple' : ''
}

function setTheme(name) {
  wx.setStorageSync('theme', name)
}

function getColors() {
  return colors[getThemeName()]
}

module.exports = { getThemeClass, getThemeName, setTheme, getColors }
