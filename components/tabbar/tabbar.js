// components/tabbar/tabbar.js
const app = getApp();
Component({
  properties: {
    current: {
      type: Number,
      value: 0
    }
  },

  data: {
    currentTab:0,
    theme:'light'
  },

  lifetimes: {
    attached() {
      // 设置主题
      this.setData({ theme: app.getTheme() });
    }
  },

  methods: {
    onTabClick(e) {
      const index = e.currentTarget.dataset.index;
      
      // 触觉反馈
      wx.vibrateShort({ type: 'light' });
      // 触发change事件
      this.triggerEvent('change', {
        current: index
      });
    }
  }
});
