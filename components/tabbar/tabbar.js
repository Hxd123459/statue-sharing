// components/tabbar/tabbar.js
Component({
  properties: {
    current: {
      type: Number,
      value: 0
    }
  },

  data: {},

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
