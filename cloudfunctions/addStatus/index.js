const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const { statusId, statusName, duration, locationInfo } = event;
  const openId = wxContext.OPENID;

  try {
    // 1. 计算过期时间
    const now = new Date();
    const expireTime = new Date(now.getTime() + duration * 60 * 1000);

    // 2. 开启事务
    const transaction = await db.startTransaction();

    try {
      // 2.1 防止短时间内重复点击：
      // 同一个用户 + 同一个状态，在 VERY_RECENT_MS 毫秒内只允许成功一次
      const VERY_RECENT_MS = 3000; // 3 秒窗口，可按需调整
      const recentStartTime = new Date(now.getTime() - VERY_RECENT_MS);

      const recent = await transaction.collection('user_status')
        .where({
          openId,
          statusId,
          isExpired: false,
          createdAt: _.gte(recentStartTime),
        })
        .get();

      if (recent.data && recent.data.length > 0) {
        // 认为是“快速重复点击”，不再重复计数 / 写入
        await transaction.rollback();
        return {
          success: false,
          code: 'DUPLICATE_CLICK',
          message: '操作太频繁啦，请稍后再试~',
        };
      }

      // 3. 更新 status_records 中的 total + 1
      const statusResult = await transaction.collection('status_records')
        .where({
          statusId: statusId,
        })
        .update({
          data: {
            total: _.inc(1),
            updateTime: now,
          },
        });

      // 如果记录不存在，则创建
      if (statusResult.stats.updated === 0) {
        await transaction.collection('status_records').add({
          data: {
            statusId,
            statusName,
            total: 1,
            updateTime: now,
          },
        });
      }

      // 4. 在 user_status 中创建记录
      await transaction.collection('user_status').add({
        data: {
          openId,
          statusId,
          statusName,
          isExpired: false,
          expireTime,
          createdAt: now,
          lat: locationInfo?.latitude,
          lng: locationInfo?.longitude,
        },
      });

      // 5. 提交事务
      await transaction.commit();
      return {
        success: true,
        data: {
          expireTime,
          duration,
        },
      };
    } catch (err) {
      // 事务失败，回滚
      await transaction.rollback();
      throw err;
    }
  } catch (error) {
    console.error('addStatus error:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};