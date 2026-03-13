// components/records/records.js
const app = getApp();
const { STATUS_MAP } = require('../../utils/constants.js');
const { formatDuration, formatDateLabel, isSameDay } = require('../../utils/util.js');
Component({

  /**
   * 组件的属性列表
   */
  properties: {

  },

  /**
   * 组件的初始数据
   */
  data: {
    topNavigationheight: app.globalData.topNavigationheight,
    //胶囊体离顶部高度
    buttonBoundingTop: app.globalData.buttonBoundingTop,
    //胶囊体高度
    buttonBoundingHeigth: app.globalData.buttonBoundingHeigth,
    theme: 'light',
    recordsByDate: [],
    totalRecords: 0,
    showDuration: true, // 是否显示持续时长（可以设置为false弱化）
    loading: true,
    hasMore: true,
    page: 1,
    pageSize: 20
  },

  lifetimes: {
    attached() {
      // 设置主题
      this.setData({ theme: app.getTheme() });
      // 加载记录
      this.loadRecords();
    },
    detached() {
      // 关闭实时监听
      // if (this.watcher) {
      //   this.watcher.close();
      // }
    },
  },

  /**
   * 页面生命周期 - 监听所在页面的显示/隐藏
   */
  pageLifetimes: {
    show() {
      // 每次显示时刷新数据
      this.refreshRecords();
    },
  },


  /**
   * 组件的方法列表
   */
  methods: {
    // 加载记录
    async loadRecords(isRefresh = false) {
      // 如果是刷新，重置分页
      if (isRefresh) {
        this.setData({
          page: 1,
          hasMore: true,
          recordsByDate: []
        });
      }

      try {
        const db = wx.cloud.database();
        const openId = app.globalData.openId;

        if (!openId) {
          console.error('未获取到OpenID');
          this.setData({ loading: false });
          return;
        }

        const { page, pageSize } = this.data;
        const skip = (page - 1) * pageSize;

        // 查询记录
        const res = await db.collection('user_status')
          .where({ openid: openId })
          .orderBy('createdAt', 'desc')
          .skip(skip)
          .limit(pageSize)
          .get();
        // 处理数据
        const newRecords = this.processRecords(res.data);

        // 先把当前已经分好组的记录打平，再追加新记录，最后重新分组
        const existingRecords = isRefresh
          ? []
          : (this.data.recordsByDate || []).reduce((acc, group) => {
              if (group && Array.isArray(group.records)) {
                return acc.concat(group.records);
              }
              return acc;
            }, []);
        const allRecords = existingRecords.concat(newRecords);

        const recordsByDate = this.groupByDate(allRecords);

        // 计算总记录数
        const totalRecords = this.countTotalRecords(recordsByDate);

        this.setData({
          recordsByDate,
          totalRecords,
          hasMore: res.data.length === pageSize,
          loading: false
        });

      } catch (err) {
        console.error('加载记录失败:', err);
        this.setData({ loading: false });
        wx.showToast({
          title: '加载失败',
          icon: 'none'
        });
      }
    },

    // 处理记录数据
    processRecords(records) {
        return records.map(record => {
        const startTime = new Date(record.createdAt);
        const endTime = new Date(record.expireTime);
        
          return {
          id: record._id,
          statusId: record.statusId,
          statusName: record.statusName,
          icon: STATUS_MAP[record.statusId]?.icon || '❓',
            hasLocation: typeof record.lat === 'number' && typeof record.lng === 'number',
          startTime: startTime,
          endTime: endTime,
          startTimeStr: this.formatTime(startTime),
          endTimeStr: this.formatTime(endTime),
          duration: record.duration,
          durationText: formatDuration(record.duration),
          date: this.getDateKey(startTime)
        };
      });
    },

    // 格式化时间（只显示时:分）
    formatTime(date) {
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      return `${hours}:${minutes}`;
    },

    // 获取日期键（用于分组）
    getDateKey(date) {
      const year = date.getFullYear();
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');
      return `${year}-${month}-${day}`;
    },

    // 按日期分组
    groupByDate(records) {
      const groups = {};

      // 分组
      records.forEach(record => {
        const dateKey = record.date;
        if (!groups[dateKey]) {
          groups[dateKey] = [];
        }
        groups[dateKey].push(record);
      });

      // 转换为数组并排序
      const result = Object.keys(groups)
        .sort((a, b) => b.localeCompare(a)) // 日期降序
        .map(dateKey => {
          const date = new Date(dateKey);
          return {
            date: dateKey,
            dateLabel: formatDateLabel(date),
            records: groups[dateKey]
          };
        });

      return result;
    },

    // 计算总记录数
    countTotalRecords(recordsByDate) {
      return recordsByDate.reduce((sum, group) => sum + group.records.length, 0);
    },

    // 刷新记录
    async refreshRecords() {
      this.setData({ loading: true });
      await this.loadRecords(true);
    },

    // 加载更多
    async onLoadMore() {
      if (!this.data.hasMore || this.data.loading) {
        return;
      }

      // 增加页码
      this.setData({
        page: this.data.page + 1
      });

      await this.loadRecords(false);
    },

    // 下拉刷新
    async onPullDownRefresh() {
      await this.refreshRecords();
      wx.stopPullDownRefresh();
    },

    // Tab切换
    onTabChange(e) {
      const current = e.detail.current;
      if (current == 0) {
        // 返回首页
        wx.navigateBack();
      }
    },

    // 主题变更回调
    onThemeChange(newTheme) {
      this.setData({ theme: newTheme });
    },
  }
})