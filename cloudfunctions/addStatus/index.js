const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  // 确保状态ID是数字类型，防止字符串/数字不匹配
  const targetStatusId = Number(event.statusId); 
  const { statusName, duration, locationInfo } = event;
  const openId = wxContext.OPENID;

  try {
    const now = new Date();
    const expireTime = new Date(now.getTime() + duration * 60 * 1000);
    const VERY_RECENT_MS = 3000;
    const recentStartTime = new Date(now.getTime() - VERY_RECENT_MS);

    const transaction = await db.startTransaction();

    try {
      // 1. 防重检查
      const recent = await transaction.collection('user_status')
        .where({
          openId,
          statusId: targetStatusId, // 使用转换后的类型
          isExpired: false,
          createdAt: _.gte(recentStartTime),
        })
        .get();

      if (recent.data && recent.data.length > 0) {
        await transaction.rollback();
        return {
          success: false,
          code: 'DUPLICATE_CLICK',
          message: '操作太频繁啦，请稍后再试~',
        };
      }

      // 2. 更新 total (前提：status_records 中必须预先存在该条记录)
      // 如果这里 updated 为 0，说明数据库中真的没有这条记录，或者类型不匹配
      const statusResult = await transaction.collection('status_records')
        .where({
          statusId: targetStatusId, 
        })
        .update({
          data: {
            total: _.inc(1),
            updateTime: now,
          },
        });

      if (statusResult.stats.updated === 0) {
        console.error(`[Error] status_records 中找不到 statusId: ${targetStatusId}，请检查数据类型或运行初始化脚本。`);
        await transaction.rollback();
        return {
          success: false,
          code: 'MISSING_STATUS_RECORD',
          message: '系统状态配置缺失，请联系管理员。',
        };
      }

      // 3. 写入 user_status
      await transaction.collection('user_status').add({
        data: {
          openId,
          statusId: targetStatusId,
          statusName,
          isExpired: false,
          expireTime,
          createdAt: now,
          lat: locationInfo?.latitude,
          lng: locationInfo?.longitude,
        },
      });

      await transaction.commit();
      
      return {
        success: true,
        data: { expireTime, duration },
      };

    } catch (err) {
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