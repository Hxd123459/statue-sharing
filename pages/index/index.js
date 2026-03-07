// pages/index/index.js
const app = getApp();
const { STATUS_LIST, STATUS_MAP } = require('../../utils/constants.js');
const { debounce } = require('../../utils/util.js');

Page({
  data: {
    topNavigationheight: app.globalData.topNavigationheight,
    //胶囊体离顶部高度
    buttonBoundingTop: app.globalData.buttonBoundingTop,
    //胶囊体高度
    buttonBoundingHeigth: app.globalData.buttonBoundingHeigth,
    theme: 'light',
    current: 0,
    statusList: [],
    topThree: [],
    restList: [],
    totalCount: 0,
    myCurrentStatus: null,
    selectedStatusId: null,
    loading: true,
    currentStatusInfo:{},
  },

  watcher: null,

  onLoad() {
    // 设置主题
    this.setData({ theme: app.getTheme() });
  },

  // 主题变更回调
  onThemeChange(newTheme) {
    this.setData({ theme: newTheme });
  },

  // Tab切换
  onTabChange(e) {
    const current = e.detail.current;
    this.setData({
      current: current
    });
  },
});
