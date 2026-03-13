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
    showCollisionMask: false,
    collisionStage: '',
    locationInfo: null,
    nearbyCount: null,
    nearbySummary: '',
  },

  watcher: null,
  danmuWatcher: null,
  danmuSeenMap: null,
  danmuRefreshTimer: null,
  collisionBusy: false,

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

  onNearby() {
    wx.getLocation({
      type: 'wgs84', // 或者 'gcj02'，返回坐标系类型
      altitude: true, // 传入 true 会解析速度，但在部分安卓机型可能无效
      success: (res) => {
        console.log('=== 定位成功 ===');
        console.log('纬度:', res.latitude);
        console.log('经度:', res.longitude);
        console.log('速度:', res.speed);
        console.log('精度:', res.accuracy);
        console.log('高度:', res.altitude);
        console.log('垂直精度:', res.verticalAccuracy);
        console.log('水平精度:', res.horizontalAccuracy);
        
        // 保存定位信息
        this.setData({ locationInfo: res });
        // 更新用户当前位置到 user_status
        const db = wx.cloud.database();
        const _ = db.command;
        const openId = app.globalData.openId;
        const us = db.collection('user_status')
        .where({
          openid: openId,
          isExpired: false,
          statusId: selectedStatusId,
        })
        .get();
        //判断用户是否设置了状态,如果
        if(us._id){
          this.updateUserStatusLocation(us._id);
          console.log("--------------us",us._id);
        }
        // 基于当前位置统计附近的同状态用户
        const { selectedStatusId } = this.data;
        if (selectedStatusId != null) {
          this.updateNearbyStats(res.latitude, res.longitude, selectedStatusId);
        }
      },
      fail: (err) => {
        console.error('=== 定位失败 ===', err);
        if (err.errMsg.includes('fail auth deny') || err.errCode === 12 || err.errCode === 6) {
          wx.showModal({
            title: '提示',
            content: '您已拒绝定位权限，需要手动开启才能使用此功能。是否前往设置？',
            success: (modalRes) => {
              if (modalRes.confirm) {
                // 引导用户打开设置页
                wx.openSetting({
                  success: (settingRes) => {
                    if (settingRes.authSetting['scope.userLocation']) {
                      wx.showToast({ title: '授权成功', icon: 'success' });
                      // 用户开启后，再次尝试获取定位
                      this.startLocation();
                    } else {
                      wx.showToast({ title: '仍未授权', icon: 'none' });
                    }
                  },
                  fail: () => {
                    console.log('打开设置页失败');
                  }
                });
              }
            }
          });
        } else {
          wx.showToast({
            title: '定位失败，请检查GPS',
            icon: 'none'
          });
        }
      }
    });
  },

  // 计算附近 500m 内同状态用户数量（基于 user_status 中的位置信息）
  async updateNearbyStats(lat, lng, statusId) {
    try {
      const db = wx.cloud.database();
      const _ = db.command;

      const res = await db.collection('user_status')
        .where({
          statusId,
          isExpired: false,
          lat: _.gt(0),
          lng: _.gt(0),
        })
        .limit(100)
        .get();

      const list = res.data || [];
      const nearby = list.filter(item => {
        if (typeof item.lat !== 'number' || typeof item.lng !== 'number') return false;
        const d = this.computeDistanceMeters(lat, lng, item.lat, item.lng);
        return d <= 500;
      });

      const count = nearby.length;
      let summary = '';
      if (count > 0) {
        summary = `附近有 ${count} 人也在${this.data.statusInfo.name || ''}`;
      } else {
        summary = '附近暂时没有同样状态的人';
      }

      this.setData({
        nearbyCount: count,
        nearbySummary: summary,
      });
    } catch (err) {
      console.error('统计附近用户失败:', err);
    }
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
    const { selectedStatusId, statusInfo, selectedDuration, loading, locationInfo } = this.data;
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
    // 检查是否已有相同/不同的进行中状态
    const sameOrDifferent = await this.expirePreviousStatusIfNeeded(selectedStatusId);
    if (sameOrDifferent && sameOrDifferent.sameStatus) {
      wx.showToast({
        title: '当前已是这个状态~',
        icon: 'none',
      });
      return;
    }

    this.startCollisionAnimation();
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
          locationInfo: this.data.locationInfo
        },
      });
      await this.loadCount();
      // 1) 先本地发一条弹幕（即时反馈）因为有watch函数所以 不需要调用 pushDanmaku函数了
      // this.pushDanmaku(this.data.danmakuText);
      // 2) 再写入数据库 danmus
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

  startCollisionAnimation() {
    if (this.data.collisionBusy) return;

    this.setData({
      showCollisionMask: true,
      collisionStage: '',
      collisionBusy: true,
    });

    // 1. 冲向中心
    setTimeout(() => {
      this.setData({ collisionStage: 'go' });
    }, 10);

    // 2. 撞住 + 符号弹出 + 震动
    setTimeout(() => {
      this.setData({ collisionStage: 'hit' });
      try {
        wx.vibrateShort({ type: 'medium' });
      } catch (e) {
        // ignore
      }
    }, 160);

    // 3. 回弹
    setTimeout(() => {
      this.setData({ collisionStage: 'rebound' });
    }, 400);

    // 4. 停在回弹位，稍作停留后关闭遮罩
    setTimeout(() => {
      this.setData({ collisionStage: 'done' });
    }, 640);

    setTimeout(() => {
      this.setData({
        showCollisionMask: false,
        collisionStage: '',
        collisionBusy: false,
      });
    }, 950);
  },

  // Haversine 计算两点间距离（单位：米）
  computeDistanceMeters(lat1, lng1, lat2, lng2) {
    const toRad = (d) => d * Math.PI / 180;
    const R = 6371000; // 地球半径（米）
    const φ1 = toRad(lat1);
    const φ2 = toRad(lat2);
    const Δφ = toRad(lat2 - lat1);
    const Δλ = toRad(lng2 - lng1);

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2)
      + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  },

  // 失效之前的状态：
  // - 如果已经存在同一个 statusId 的未过期记录：sameStatus=true，用于阻止重复点击
  // - 如果只有不同的 statusId：将这些旧状态设为过期，并同步失效该用户在这些状态下的未过期弹幕
  async expirePreviousStatusIfNeeded(newStatusId) {
    try {
      const openId = app.globalData.openId;
      if (!openId) return null;

      const db = wx.cloud.database();
      const _ = db.command;
      const now = new Date();

      // 查询当前用户所有未过期状态
      const res = await db.collection('user_status')
        .where({
          openid: openId,
          isExpired: false,
        })
        .get();

      const currentList = res.data || [];
      if (currentList.length === 0) return { sameStatus: false };

      // 如果已经有同 statusId 的未过期记录，认为是同状态重复点击
      const hasSame = currentList.some(r => r.statusId === newStatusId);
      if (hasSame) {
        return { sameStatus: true };
      }

      // 只处理不同状态的未过期记录：全部直接过期
      const oldStatusIds = Array.from(
        new Set(currentList.map(r => r.statusId).filter(id => id !== newStatusId))
      );
      if (oldStatusIds.length > 0) {
        const us = await db.collection('user_status')
        .where({
          openid: openId,
          isExpired: false,
          statusId: oldStatusIds[0],
        })
        .get();
        console.log("user_status查询结果:", JSON.stringify(us.data));
        const sr = await db.collection('status_records')
        .where({ statusId: oldStatusIds[0] })
        .get();
        console.log("status_records查询结果:", JSON.stringify(sr.data));
        
        const envId = app.globalData.envId || 'cloud1-0g7t1v9lab94a58b';
        await wx.cloud.callFunction({
          name: 'updateStatus',
          config: { env: envId },
          data: {
            statusRecordsId: sr.data[0]._id,
            userStatusId: us.data[0]._id
          },
        });
       
        await db.collection('danmus')
          .where({
            openId,
            statusId: oldStatusIds[0],
            isExpired: false,
          })
          .remove();
      }
      return { sameStatus: false };
    } catch (err) {
      console.error('处理上一状态失败:', err);
      return { sameStatus: false };
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
          isExpired: false,
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

  async updateUserStatusLocation(){
    const envId = app.globalData.envId || 'cloud1-0g7t1v9lab94a58b';
    await wx.cloud.callFunction({
      name: 'updateStatus',
      config: { env: envId },
      data: {
        locationInfo: this.data.locationInfo
      },
    });
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
