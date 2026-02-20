// cloudfunctions/setStatus/index.js
const cloud = require('wx-server-sdk');

cloud.init({
  env: 'cloud1-0g7t1v9lab94a58b'
});

const db = cloud.database();

// 状态映射
const STATUS_MAP = {
  1: '撸铁', 2: '撸猫', 3: '写代码', 4: '干饭', 5: '通勤',
  6: '逛街', 7: '发呆', 8: '睡觉', 9: '写东西', 10: '相亲',
  11: '谈恋爱', 12: '刷视频', 13: '加班', 14: '失眠', 15: '做饭',
  16: '刷剧', 17: '考研', 18: '学外语', 19: '找工作', 20: '带娃', 21: '打游戏'
};

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openId = wxContext.OPENID;
  const { statusId, duration } = event;

  try {
    console.log("openId------------------", openId);
    const now = new Date();
    const endTime = new Date(now.getTime() + duration * 60 * 1000);

    // 获取用户当前数据
    const userRes = await db.collection('users')
      .where({ openId })
      .get();
    
    if (userRes.data.length === 0) {
      throw new Error('用户不存在');
    }

    const user = userRes.data[0];

    // 检查防抖（5分钟限制）
    if (user.lastUpdateTime) {
      const lastUpdate = new Date(user.lastUpdateTime);
      const diffMinutes = (now - lastUpdate) / 1000 / 60;
      
      if (diffMinutes < 5) {
        const waitMinutes = Math.ceil(5 - diffMinutes);
        throw new Error(`请${waitMinutes}分钟后再切换状态`);
      }
    }

    // 如果有旧状态，先保存到记录表
    if (user.currentStatus) {
      await db.collection('status_records').add({
        data: {
          userId: openId,
          statusId: user.currentStatus,
          statusName: STATUS_MAP[user.currentStatus],
          startTime: user.statusStartTime,
          endTime: now,
          duration: Math.round((now - new Date(user.statusStartTime)) / 60000),
          createdAt: now
        }
      });
    }

    // 更新用户当前状态
    await db.collection('users')
      .where({ openId })
      .update({
        data: {
          currentStatus: statusId,
          statusStartTime: now,
          statusEndTime: endTime,
          lastUpdateTime: now,
          updatedAt: now
        }
      });

    return { success: true, message: '状态已更新' };
  } catch (err) {
    console.error('设置状态失败:', err);
    // 业务错误直接抛出，客户端能通过 catch 拿到 message
    if (err.message && err.message !== '设置失败，请重试') {
      throw err;
    }
    throw new Error('设置失败，请重试');
  }
};
