const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const { statusId, statusName, duration } = event;
  const openid = wxContext.OPENID;
  
  try {
    // 1. 计算过期时间
    const now = new Date();
    const expireTime = new Date(now.getTime() + duration * 60 * 1000);
    
    // 2. 开启事务
    const transaction = await db.startTransaction();
    
    try {
      // 3. 更新 user_status 中的 total + 1
      const statusResult = await transaction.collection('user_status')
        .where({
          _openid: openid,
          statusId: statusId
        })
        .update({
          data: {
            total: _.inc(1),
            updateTime: now
          }
        });
      
      // 如果记录不存在，则创建
      if (statusResult.stats.updated === 0) {
        await transaction.collection('user_status').add({
          data: {
            statusId,
            statusName,
            total: 1,
            updateTime: now
          }
        });
      }
      
      // 4. 在 status_records 中创建过期记录
      await transaction.collection('status_records').add({
        data: {
          openid,
          statusId,
          expireTime,
          createdAt: now
        }
      });
      
      // 5. 提交事务
      await transaction.commit();
      
      return {
        success: true,
        data: {
          expireTime,
          duration
        }
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
      error: error.message
    };
  }
};