// pages/index/index.js
const app = getApp();
const { STATUS_LIST, STATUS_MAP } = require('../../utils/constants.js');
const { debounce } = require('../../utils/util.js');

Page({
  data: {
    theme: 'light',
    statusList: [],
    topThree: [],
    restList: [],
    totalCount: 0,
    myCurrentStatus: null,
    showDurationPicker: false,
    selectedStatusId: null,
    loading: true
  },

  watcher: null,

  onLoad() {
    // 设置主题
    this.setData({ theme: app.getTheme() });

    // 初始化数据
    this.initData();

    // 初始化实时监听
    this.initWatcher();
  },

  onShow() {
    // 刷新数据
    this.loadStatusCounts();
  },

  onUnload() {
    // 关闭实时监听
    if (this.watcher) {
      this.watcher.close();
    }
  },

  // 主题变更回调
  onThemeChange(newTheme) {
    this.setData({ theme: newTheme });
  },

  // 初始化数据
  async initData() {
    try {
      const envId = app.globalData.envId || 'cloud1-0g7t1v9lab94a58b';
      const res = await wx.cloud.callFunction({
        name: 'login',
        config: { env: envId }
      });
      const r = res.result || {};
      const openId = r.openid || (r.userInfo && r.userInfo.openId);
      if (openId) {
        app.globalData.openId = openId;
      }

      // 加载状态数据
      await this.loadStatusCounts();

      this.setData({ loading: false });
    } catch (err) {
      console.error('初始化失败:', err);
      this.setData({ loading: false });
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    }
  },

  // 初始化实时监听
  initWatcher() {
    const db = wx.cloud.database();

    this.watcher = db.collection('users')
      .where({
        currentStatus: db.command.neq(null)
      })
      .watch({
        onChange: (snapshot) => {
          // 延迟更新，避免频繁刷新
          this.debouncedUpdate();
        },
        onError: (err) => {
          console.error('监听失败:', err);
        }
      });
  },

  // 防抖更新
  debouncedUpdate: debounce(function () {
    this.loadStatusCounts();
  }, 1000),

  // 加载状态人数
  async loadStatusCounts() {
    try {
      const db = wx.cloud.database();
      const _ = db.command;
      const now = new Date();

      // 查询所有有效状态的用户（只取必要字段）
      const res = await db.collection('users')
        .where({
          currentStatus: _.neq(null),
          statusEndTime: _.gt(now)
        })
        .field({ currentStatus: true })
        .get();

      // 前端分组统计
      const countMap = {};
      (res.data || []).forEach(user => {
        const status = user.currentStatus;
        if (status) {
          countMap[status] = (countMap[status] || 0) + 1;
        }
      });

      const statusList = Object.entries(countMap).map(([status, count]) => ({
        _id: status,
        count
      }));

      // 获取当前用户状态
      let myStatus = null;
      const openId = app.globalData.openId;
      if (openId) {
        const myRes = await db.collection('users')
          .where({ openId })
          .field({ currentStatus: true })
          .get();
        if (myRes.data?.[0]?.currentStatus) {
          myStatus = myRes.data[0].currentStatus;
        }
      }

      // 交给页面处理
      this.processStatusData(statusList, myStatus);

    } catch (err) {
      console.error('加载状态失败:', err);
      // 可选：显示 toast 提示
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  // 处理状态数据
  processStatusData(countData, myStatus) {
    // 创建状态计数映射
    const countMap = {};
    countData.forEach(item => {
      countMap[item._id] = item.count;
    });

    // 生成完整状态列表
    const statusList = STATUS_LIST.map((status, index) => ({
      ...status,
      count: countMap[status.id] || 0,
      isMine: status.id === myStatus,
      rank: 0
    }));

    // 按人数排序
    statusList.sort((a, b) => b.count - a.count);

    // 添加排名
    statusList.forEach((item, index) => {
      item.rank = index + 1;
    });

    // 计算总人数
    const totalCount = statusList.reduce((sum, item) => sum + item.count, 0);

    // 分离前3名和其余
    const topThree = statusList.slice(0, 3);
    const restList = statusList.slice(3);

    this.setData({
      statusList,
      topThree,
      restList,
      totalCount,
      myCurrentStatus: myStatus
    });
  },

  // 选择状态
  selectStatus(e) {
    const statusId = e.currentTarget.dataset.id;
    console.log("statusId+++++++++++++", statusId);
    // 检查是否可以更新
    this.checkCanUpdate().then(canUpdate => {
      if (!canUpdate.success) {
        wx.showToast({
          title: canUpdate.message,
          icon: 'none',
          duration: 2000
        });
        return;
      }

      // 显示持续时间选择器
      this.setData({
        showDurationPicker: true,
        selectedStatusId: statusId
      });

      // 触觉反馈
      wx.vibrateShort({ type: 'light' });
    });
  },

  // 检查是否可以更新状态
  async checkCanUpdate() {
    try {
      let openId = app.globalData.openId;
      // 没有 openId 时先尝试登录（避免只提示不执行）
      if (!openId) {
        console.log("没有openId，先尝试登录");
        const envId = app.globalData.envId || 'cloud1-0g7t1v9lab94a58b';
        const loginRes = await wx.cloud.callFunction({
          name: 'login',
          config: { env: envId }
        });
        console.log("loginRes+++++++++++++", loginRes);
        const r = loginRes.result || {};
        const gotOpenId = r.openid || (r.userInfo && r.userInfo.openId);
        if (gotOpenId) {
          app.globalData.openId = gotOpenId;
          openId = gotOpenId;
        } else {
          return { success: false, message: '登录失败，请检查网络后重试' };
        }
      }

      const db = wx.cloud.database();
      const res = await db.collection('users')
        .where({ openId })
        .get();
      console.log("res+++++++++++++", res);
      if (res.data.length === 0) {
        return { success: true };
      }

      const user = res.data[0];
      const now = new Date();
      const lastUpdate = user.lastUpdateTime ? new Date(user.lastUpdateTime) : null;

      if (lastUpdate) {
        const diffMinutes = (now - lastUpdate) / 1000 / 60;
        if (diffMinutes < 5) {
          const waitMinutes = Math.ceil(5 - diffMinutes);
          return {
            success: false,
            message: `请${waitMinutes}分钟后再切换状态`
          };
        }
      }

      return { success: true };

    } catch (err) {
      console.error('检查更新权限失败:', err);
      return { success: false, message: '检查失败，请重试' };
    }
  },

  // 取消选择持续时间
  onDurationCancel() {
    this.setData({
      showDurationPicker: false,
      selectedStatusId: null
    });
  },

  // 确认持续时间
  async onDurationConfirm(e) {
    const duration = e.detail.duration;
    const statusId = this.data.selectedStatusId;

    this.setData({
      showDurationPicker: false,
      loading: true
    });

    try {
      // 调用云函数设置状态（必须与 app.js 中 wx.cloud.init 的 env 一致，否则会调错环境）
      const envId = app.globalData.envId || 'cloud1-0g7t1v9lab94a58b';
      const res = await wx.cloud.callFunction({
        name: 'setStatus',
        config: { env: envId },
        data: {
          statusId,
          duration
        }
      });
      console.log('setStatus 调用完成', res.requestID);
      // result 可能被平台合并为 event，不依赖 result，只要没 reject 就视为成功
      wx.showToast({
        title: '状态已更新',
        icon: 'success'
      });
      await this.loadStatusCounts();
    } catch (err) {
      console.error('设置状态失败:', err);
      const msg = (err.errObj && err.errObj.message) || err.result?.message || err.message || '设置失败';
      wx.showToast({
        title: String(msg),
        icon: 'none'
      });
    } finally {
      this.setData({
        loading: false,
        selectedStatusId: null
      });
    }
  },

  // Tab切换
  onTabChange(e) {
    const current = e.detail.current;
    if (current === 1) {
      wx.navigateTo({
        url: '/pages/records/records'
      });
    }
  },

  // 下拉刷新
  async onPullDownRefresh() {
    await this.loadStatusCounts();
    wx.stopPullDownRefresh();
  }
});
