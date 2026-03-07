// pages/detail/detail.js
const app = getApp();
const { STATUS_MAP } = require('../../utils/constants.js');
const { debounce } = require('../../utils/util.js');

Page({
  data: {
    topNavigationheight: app.globalData.topNavigationheight,
    buttonBoundingTop: app.globalData.buttonBoundingTop,
    buttonBoundingHeigth: app.globalData.buttonBoundingHeigth,
    bottomNavigationHeight: app.globalData.bottomNavigationHeight,
    theme: 'light',
    selectedStatusId: null,
    statusInfo: { id: null, name: '', icon: '' },
    count: 0,
    countAnimate: false,
    selectedDuration: 30,
    showDurationPicker: false,
    showDanmakuPicker: false,
    danmakuOptions: [],
    selectedDanmakuIndex: 0,
    danmakuText: '来碰一下~',
    danmakus: [],
    danmakuTopMinPx: 120,
    danmakuTopMaxPx: 380,
    loading: false,
  },

  watcher: null,
  danmuWatcher: null,
  danmuSeenMap: null,
  danmuRefreshTimer: null,

  onLoad(options) {
    const id = options.selectedStatusId ? Number(options.selectedStatusId) : null;
    const status = (id && STATUS_MAP[id]) ? STATUS_MAP[id] : null;
    const statusInfo = status ? { id, name: status.name, icon: status.icon } : { id: null, name: '', icon: '' };
    const danmakuOptions = (status && Array.isArray(status.Danmu)) ? status.Danmu : [];
    const danmakuText = danmakuOptions.length > 0 ? danmakuOptions[0] : '来碰一下~';
    this.setData({
      selectedStatusId: id,
      statusInfo,
      danmakuOptions,
      selectedDanmakuIndex: 0,
      danmakuText,
      theme: app.getTheme ? app.getTheme() : 'light',
    });

    this.danmuSeenMap = {};

    try {
      const w = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
      const windowH = w.windowHeight || 600;
      // 让弹幕主要分布在“中间区域”，避免只出现在顶部导航附近
      const topMin = Math.max((this.data.topNavigationheight || 0) + 60, Math.floor(windowH * 0.18));
      const topMax = Math.floor(windowH * 0.70);
      this.setData({
        danmakuTopMinPx: topMin,
        danmakuTopMaxPx: Math.max(topMin + 120, topMax),
      });
    } catch (e) {
      // ignore
    }
    this.loadCount();
    this.initWatcher();
    this.loadAndPlayActiveDanmus({ spread: true });
    this.initDanmuWatcher();
    this.startDanmuRefreshTimer();
  },

  onUnload() {
    if (this.watcher) {
      this.watcher.close();
    }
    if (this.danmuWatcher) {
      this.danmuWatcher.close();
    }
    if (this.danmuRefreshTimer) {
      clearInterval(this.danmuRefreshTimer);
      this.danmuRefreshTimer = null;
    }
  },

  onThemeChange(newTheme) {
    this.setData({ theme: newTheme });
  },

  initWatcher() {
    const db = wx.cloud.database();
    this.watcher = db.collection('status_records').watch({
      onChange: () => {
        this.debouncedLoadCount();
      },
      onError: (err) => {
        console.error('detail 监听 status_records 失败:', err);
      },
    });
  },

  initDanmuWatcher() {
    const { selectedStatusId } = this.data;
    if (selectedStatusId == null) return;

    const db = wx.cloud.database();
    this.danmuWatcher = db.collection('danmus')
      .where({ statusId: selectedStatusId })
      .watch({
        onChange: () => {
          this.debouncedLoadDanmus();
        },
        onError: (err) => {
          console.error('detail 监听 danmus 失败:', err);
        },
      });
  },

  startDanmuRefreshTimer() {
    if (this.danmuRefreshTimer) return;
    this.danmuRefreshTimer = setInterval(() => {
      this.loadAndPlayActiveDanmus({ spread: false });
    }, 20000);
  },

  debouncedLoadCount: debounce(function () {
    this.loadCount();
  }, 1000),

  debouncedLoadDanmus: debounce(function () {
    this.loadAndPlayActiveDanmus({ spread: false });
  }, 600),

  async loadCount() {
    const { selectedStatusId } = this.data;
    if (selectedStatusId == null) return;
    try {
      const db = wx.cloud.database();
      const res = await db.collection('status_records')
        .where({ statusId: selectedStatusId })
        .get();
      const total = (res.data && res.data[0]) ? (res.data[0].total || 0) : 0;
      this.setData({
        count: total,
        countAnimate: true,
      });
      setTimeout(() => {
        this.setData({ countAnimate: false });
      }, 600);
    } catch (err) {
      console.error('加载人数失败:', err);
    }
  },

  onBack() {
    wx.navigateBack();
  },

  onDanmaku() {
    this.setData({ showDanmakuPicker: true });
  },

  onDanmakuSelect(e) {
    const index = Number(e.currentTarget.dataset.index);
    const text = e.currentTarget.dataset.text || '来碰一下~';
    this.setData({
      selectedDanmakuIndex: Number.isFinite(index) ? index : 0,
      danmakuText: text,
    });
    wx.vibrateShort({ type: 'light' });
  },

  onDanmakuCancel() {
    this.setData({ showDanmakuPicker: false });
  },

  onDanmakuConfirm() {
    this.setData({ showDanmakuPicker: false });
  },

  stopPropagation() {},
  preventMove() {},

  onTime() {
    this.setData({ showDurationPicker: true });
  },

  onDurationCancel() {
    this.setData({ showDurationPicker: false });
  },

  onDurationConfirm(e) {
    const duration = e.detail.duration;
    this.setData({
      showDurationPicker: false,
      selectedDuration: duration,
    });
  },

  async onTouch() {
    const { selectedStatusId, statusInfo, selectedDuration, loading } = this.data;
    if (selectedStatusId == null || !statusInfo.name) {
      wx.showToast({ title: '状态异常', icon: 'none' });
      return;
    }
    if (loading) return;

    const canUpdate = await this.checkCanUpdate();
    if (!canUpdate.success) {
      wx.showToast({ title: canUpdate.message, icon: 'none', duration: 2000 });
      return;
    }

    this.setData({ loading: true });
    try {
      const envId = app.globalData.envId || 'cloud1-0g7t1v9lab94a58b';
      await wx.cloud.callFunction({
        name: 'addStatus',
        config: { env: envId },
        data: {
          statusId: selectedStatusId,
          statusName: statusInfo.name,
          duration: selectedDuration,
        },
      });
      wx.showToast({ title: '状态已更新', icon: 'success' });
      await this.loadCount();

      // 1) 先本地发一条弹幕（即时反馈）
      this.pushDanmaku(this.data.danmakuText);

      // 2) 再写入数据库 danmus（openId、statusId、danmuContent、expireTime）
      try {
        const db = wx.cloud.database();
        const openId = app.globalData.openId;
        const now = new Date();
        const expireTime = new Date(now.getTime() + selectedDuration * 60 * 1000);
        await db.collection('danmus').add({
          data: {
            openId,
            statusId: selectedStatusId,
            danmuContent: this.data.danmakuText,
            expireTime,
            isExpired: false,
            createdAt: now,
          },
        });
      } catch (e) {
        console.error('写入 danmus 失败:', e);
      }
    } catch (err) {
      console.error('设置状态失败:', err);
      const msg = (err.errObj && err.errObj.message) || err.result?.message || err.message || '设置失败';
      wx.showToast({ title: String(msg), icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },

  async loadAndPlayActiveDanmus({ spread }) {
    const { selectedStatusId } = this.data;
    if (selectedStatusId == null) return;

    try {
      const db = wx.cloud.database();
      const _ = db.command;
      const now = new Date();
      const res = await db.collection('danmus')
        .where({
          statusId: selectedStatusId,
          expireTime: _.gt(now),
          isExpired: _.neq(true),
        })
        .orderBy('createdAt', 'asc')
        .limit(50)
        .get();

      const list = res.data || [];
      const unseen = list.filter(item => item && item._id && !this.danmuSeenMap[item._id]);
      unseen.forEach(item => { this.danmuSeenMap[item._id] = true; });

      if (unseen.length === 0) return;

      unseen.forEach((item, idx) => {
        const text = item.danmuContent || '';
        const delay = spread ? (idx * 700 + Math.floor(Math.random() * 300)) : Math.floor(Math.random() * 200);
        setTimeout(() => this.pushDanmaku(text), delay);
      });
    } catch (err) {
      // 还没建集合/没索引/权限不足等情况下不影响页面其他功能
      console.error('加载 danmus 失败:', err);
    }
  },

  pushDanmaku(text) {
    const t = (text || '').trim();
    if (!t) return;

    const id = `${Date.now()}_${Math.floor(Math.random() * 100000)}`;
    const durationMs = 5500 + Math.floor(Math.random() * 2000);
    const top = this.randomDanmakuTopPx();

    const danmaku = {
      id,
      text: t,
      topPx: top,
      durationMs,
    };

    const next = (this.data.danmakus || []).concat(danmaku);
    this.setData({ danmakus: next });

    setTimeout(() => {
      const remain = (this.data.danmakus || []).filter(x => x.id !== id);
      this.setData({ danmakus: remain });
    }, durationMs + 200);
  },

  randomDanmakuTopPx() {
    const min = Number(this.data.danmakuTopMinPx) || 120;
    const max = Number(this.data.danmakuTopMaxPx) || (min + 260);
    const span = Math.max(1, max - min);
    return min + Math.floor(Math.random() * span);
  },

  async checkCanUpdate() {
    try {
      let openId = app.globalData.openId;
      if (!openId) {
        const envId = app.globalData.envId || 'cloud1-0g7t1v9lab94a58b';
        const loginRes = await wx.cloud.callFunction({
          name: 'login',
          config: { env: envId },
        });
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
      const res = await db.collection('users').where({ openId }).get();
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
          return { success: false, message: `请${waitMinutes}分钟后再切换状态` };
        }
      }
      return { success: true };
    } catch (err) {
      console.error('检查更新权限失败:', err);
      return { success: false, message: '检查失败，请重试' };
    }
  },
});
