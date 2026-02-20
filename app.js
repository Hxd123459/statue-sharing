// app.js
App({
  globalData: {
    theme: 'light', // light | dark
    userInfo: null,
    openId: null,
    envId: 'cloud1-0g7t1v9lab94a58b' // 与云开发控制台环境 ID 一致，callFunction 会用到
  },

  onLaunch() {
    // 初始化云开发
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
    } else {
      wx.cloud.init({
        env: this.globalData.envId,
        traceUser: true,
      });
    }

    // 初始化主题
    this.initTheme();

    // 每分钟检查一次主题（用于自动切换白天/黑夜）
    setInterval(() => {
      this.checkAndUpdateTheme();
    }, 60000);
  },

  // 初始化主题
  initTheme() {
    const hour = new Date().getHours();
    const theme = (hour >= 7 && hour < 19) ? 'light' : 'dark';
    this.globalData.theme = theme;
  },

  // 检查并更新主题
  checkAndUpdateTheme() {
    const hour = new Date().getHours();
    const newTheme = (hour >= 7 && hour < 19) ? 'light' : 'dark';
    
    if (newTheme !== this.globalData.theme) {
      this.globalData.theme = newTheme;
      // 发送主题变更事件
      const pages = getCurrentPages();
      if (pages.length > 0) {
        const currentPage = pages[pages.length - 1];
        if (currentPage.onThemeChange) {
          currentPage.onThemeChange(newTheme);
        }
      }
    }
  },

  // 获取当前主题
  getTheme() {
    return this.globalData.theme;
  }
});
