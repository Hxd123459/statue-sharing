// cloudfunctions/clearExpiredStatus/index.js
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

// 状态映射
const STATUS_MAP = {
  1: '撸铁', 2: '撸猫', 3: '写代码', 4: '干饭', 5: '通勤',
  6: '逛街', 7: '发呆', 8: '睡觉', 9: '写东西', 10: '相亲',
  11: '谈恋爱', 12: '刷视频', 13: '加班', 14: '失眠', 15: '做饭',
  16: '刷剧', 17: '考研', 18: '学外语', 19: '找工作', 20: '带娃', 21: '打游戏'
};

exports.main = async (event, context) => {
  try {
    const now = new Date();
    
    // 查找所有过期的状态
    const expiredUsers = await db.collection('users')
      .where({
        currentStatus: _.neq(null),
        statusEndTime: _.lt(now)
      })
      .get();

    console.log(`找到 ${expiredUsers.data.length} 个过期状态`);

    if (expiredUsers.data.length === 0) {
      return {
        success: true,
        count: 0,
        message: '没有过期状态需要清理'
      };
    }

    // 批量处理
    const promises = expiredUsers.data.map(async (user) => {
      try {
        // 保存到记录表
        await db.collection('status_records').add({
          data: {
            userId: user.openId,
            statusId: user.currentStatus,
            statusName: STATUS_MAP[user.currentStatus] || '未知状态',
            startTime: user.statusStartTime,
            endTime: user.statusEndTime,
            duration: Math.round((new Date(user.statusEndTime) - new Date(user.statusStartTime)) / 60000),
            createdAt: now
          }
        });

        // 清空用户状态
        await db.collection('users')
          .doc(user._id)
          .update({
            data: {
              currentStatus: null,
              statusStartTime: null,
              statusEndTime: null,
              updatedAt: now
            }
          });

        return { success: true };
      } catch (err) {
        console.error(`处理用户 ${user.openId} 失败:`, err);
        return { success: false, error: err };
      }
    });

    const results = await Promise.all(promises);
    const successCount = results.filter(r => r.success).length;

    console.log(`成功处理 ${successCount}/${expiredUsers.data.length} 个过期状态`);

    return {
      success: true,
      count: successCount,
      total: expiredUsers.data.length,
      message: `已清理 ${successCount} 个过期状态`
    };

  } catch (err) {
    console.error('清理过期状态失败:', err);
    return {
      success: false,
      error: err.message
    };
  }
};
