// app.js
App({
  globalData: {
    //状态栏高度 信号 + 电量
    statusBarHeight: 0,
    //屏幕高度
    screenHeight: 0,
    //顶部导航高度
    topNavigationheight: 0,
    //胶囊体离顶部高度
    buttonBoundingTop: 0,
    //胶囊体高度
    buttonBoundingHeigth: 0,
    //底部导航高度
    bottomNavigationHeight: 0,
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
    this.getBarInfo();
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
    console.log("++++++++++++++++++" + hour)
    const theme = (hour >= 7 && hour < 16) ? 'light' : 'dark';
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
  },

  getBarInfo: function() {
    try {
        const accountInfo = wx.getAccountInfoSync();
        if (accountInfo && accountInfo.miniProgram && accountInfo.miniProgram.version) {
            this.globalData.appVersion = accountInfo.miniProgram.version;
        }
    } catch (e) {
        console.warn('获取版本号失败，使用默认版本号:', e);
    }

    const windowInfo = wx.getWindowInfo()
    this.globalData.screenHeight = windowInfo.screenHeight;
    //获取状态栏的高度
    this.globalData.statusBarHeight = windowInfo.statusBarHeight;
    this.globalData.topNavigationheight = windowInfo.statusBarHeight + 40;
    //获取胶囊体位置
    var buttonBoundingInfo = wx.getMenuButtonBoundingClientRect();
    this.globalData.buttonBoundingTop = buttonBoundingInfo.top;
    this.globalData.buttonBoundingHeigth = buttonBoundingInfo.height;
    this.globalData.buttonBoundingWidth = buttonBoundingInfo.width;
    //获取底部导航高度
    const systemInfo = wx.getSystemInfoSync();
  
    // 获取安全区域信息
    let safeAreaInsetsBottom = 0;
    if (systemInfo.safeAreaInsets && systemInfo.safeAreaInsets.bottom) {
        safeAreaInsetsBottom = systemInfo.safeAreaInsets.bottom;
    } else if (windowInfo.safeArea) {
        safeAreaInsetsBottom = windowInfo.screenHeight - windowInfo.safeArea.bottom;
    }
    // 设备适配配置
    const TABBAR_CONFIG = {
        ios: {
            // iPhone设备基础高度
            base: 50,
            // 安全区域最大高度限制
            safeAreaMax: 34,
            // 特定设备型号适配
            models: {
                'iPhone6': 49,
                'iPhone6s': 49,
                'iPhone7': 49,
                'iPhone8': 49,
                'iPhoneSE': 49,
                'iPhoneX': 50,
                'iPhone11': 50,
                'iPhone12': 50,
                'iPhone13': 50,
                'iPhone14': 50,
                'iPhone15': 50,
                'iPad': 56
            }
        },
        android: {
            base: 56,
            safeAreaMax: 24,
            // Android厂商适配
            vendors: {
                'HUAWEI': { base: 56, safeAreaMax: 28 },
                'HONOR': { base: 56, safeAreaMax: 28 },
                'XIAOMI': { base: 56, safeAreaMax: 26 },
                'REDMI': { base: 56, safeAreaMax: 26 },
                'OPPO': { base: 56, safeAreaMax: 24 },
                'VIVO': { base: 56, safeAreaMax: 24 },
                'SAMSUNG': { base: 60, safeAreaMax: 30 },
                'ONEPLUS': { base: 56, safeAreaMax: 26 },
                'REALME': { base: 56, safeAreaMax: 24 },
                'MEIZU': { base: 56, safeAreaMax: 24 }
            }
        },
        devtools: {
            base: 56
        }
  };
  
  // 设备检测和适配函数
  const getTabBarHeight = () => {
      const platform = systemInfo.platform;
      const model = systemInfo.model || '';
      const brand = systemInfo.brand || '';
      
      if (platform === 'ios') {
          // iOS设备适配
          let config = TABBAR_CONFIG.ios;
          let baseHeight = config.base;
          
          // 检查是否为iPad
          if (model.toLowerCase().includes('ipad')) {
              baseHeight = config.models.iPad || config.base;
          } else {
              // 检查iPhone型号
              for (let modelKey in config.models) {
                  if (model.includes(modelKey)) {
                      baseHeight = config.models[modelKey];
                      break;
                  }
              }
          }
          
          // 计算最终高度
          if (safeAreaInsetsBottom > 0) {
              // 有Home Indicator的设备
              const safeAreaHeight = Math.min(safeAreaInsetsBottom, config.safeAreaMax);
              return baseHeight + safeAreaHeight;
          } else {
              // 有物理Home键的设备
              return baseHeight;
          }
          
      } else if (platform === 'android') {
          // Android设备适配
          let config = TABBAR_CONFIG.android;
          let vendorConfig = null;
          
          // 检查厂商配置
          const brandUpper = brand.toUpperCase();
          const modelUpper = model.toUpperCase();
          
          for (let vendor in config.vendors) {
              if (brandUpper.includes(vendor) || modelUpper.includes(vendor)) {
                  vendorConfig = config.vendors[vendor];
                  break;
              }
          }
          
          const baseHeight = vendorConfig ? vendorConfig.base : config.base;
          const maxSafeArea = vendorConfig ? vendorConfig.safeAreaMax : config.safeAreaMax;
          
          // 检查是否为全面屏设备
          const screenRatio = windowInfo.screenHeight / windowInfo.screenWidth;
          const isFullScreen = screenRatio >= 2.0;
          const isNotchScreen = screenRatio >= 2.1; // 刘海屏
          
          if ((isFullScreen || isNotchScreen) && safeAreaInsetsBottom > 0) {
              // 全面屏/刘海屏Android设备
              const safeAreaHeight = Math.min(safeAreaInsetsBottom, maxSafeArea);
              return baseHeight + safeAreaHeight;
          } else {
              // 传统Android设备
              return baseHeight;
          }
          
      } else if (platform === 'devtools') {
          // 开发者工具
          return TABBAR_CONFIG.devtools.base;
      } else {
          // 其他平台
          return 56;
      }
  };
  
  // 计算底部导航高度
  this.globalData.bottomNavigationHeight = getTabBarHeight();

  console.log("设备信息:", {
      platform: systemInfo.platform,
      model: systemInfo.model,
      brand: systemInfo.brand,
      screenHeight: windowInfo.screenHeight,
      screenWidth: windowInfo.screenWidth,
      screenRatio: (windowInfo.screenHeight / windowInfo.screenWidth).toFixed(2),
      safeArea: windowInfo.safeArea,
      safeAreaInsets: systemInfo.safeAreaInsets,
      safeAreaInsetsBottom: safeAreaInsetsBottom,
      bottomNavigationHeight: this.globalData.bottomNavigationHeight
  });
  },
   // 获取底部导航栏高度的工具函数
  getBottomNavHeight: function() {
    return this.globalData.bottomNavigationHeight || 56;
  },

    // 检查是否为全面屏设备
  isFullScreenDevice: function() {
    const windowInfo = wx.getWindowInfo();
    const screenRatio = windowInfo.screenHeight / windowInfo.screenWidth;
    return screenRatio >= 2.0;
  },

  // 检查是否为刘海屏设备
  isNotchDevice: function() {
    const windowInfo = wx.getWindowInfo();
    const screenRatio = windowInfo.screenHeight / windowInfo.screenWidth;
    return screenRatio >= 2.1;
  },
});
