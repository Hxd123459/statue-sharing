// components/duration-picker/duration-picker.js
Component({
  properties: {
    show: {
      type: Boolean,
      value: false
    }
  },

  data: {
    selectedDuration: 30 // 默认30分钟
  },

  methods: {
    // 选择时长
    selectDuration(e) {
      const duration = parseInt(e.currentTarget.dataset.duration);
      this.setData({ selectedDuration: duration });
      
      // 触觉反馈
      wx.vibrateShort({ type: 'light' });
    },

    // 取消
    onCancel() {
      this.setData({ selectedDuration: 30 }); // 重置为默认值
      this.triggerEvent('cancel');
    },

    // 确认
    onConfirm() {
      this.triggerEvent('confirm', {
        duration: this.data.selectedDuration
      });
      
      // 触觉反馈
      wx.vibrateShort({ type: 'medium' });
      
      // 重置为默认值
      this.setData({ selectedDuration: 30 });
    },

    // 阻止事件冒泡
    stopPropagation() {},

    // 阻止滚动穿透
    preventMove() {}
  }
});
