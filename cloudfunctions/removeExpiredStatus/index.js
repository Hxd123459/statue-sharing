const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  try {
    const now = new Date();
    console.log("开始执行清理过期状态函数")

    // 0. 清理过期弹幕（danmus）：统一和状态过期放在一个函数里处理
    try {
      await db.collection('danmus')
        .where({
          expireTime: _.lt(now),
          isExpired: false
        })
        .remove();
    } catch (e) {
      console.error('清理过期弹幕失败:', e);
    }

    // 1. 查询所有已过期的记录
    const expiredRecords = await db.collection('user_status')
      .where({
        expireTime: _.lt(now),
        isExpired: false
      })
      .get();
    console.log("记录：" + expiredRecords.data)
    if (expiredRecords.data.length === 0) {
      return {
        success: true,
        message: '没有过期记录',
        cleanedCount: 0
      };
    }
    // mock数据需要删除
    await deleteMockData(expiredRecords);
    // 2. 按 openid 和 statusId 分组统计需要减少的数量
    const reduceMap = {};
    expiredRecords.data.forEach(record => {
      const key = `${record._openid}_${record.statusId}`;
      if (!reduceMap[key]) {
        reduceMap[key] = {
          _openid: record._openid,
          statusId: record.statusId,
          count: 0
        };
      }
      reduceMap[key].count += 1;
    });
    
    // 3. 批量更新 status_records，减少对应的 total
    const updatePromises = Object.values(reduceMap).map(async (item) => {
      await db.collection('status_records')
        .where({
          _openid: item._openid,
          statusId: item.statusId
        })
        .update({
          data: {
            total: _.inc(-item.count),
            updateTime: now,
          }
        });
    });
    
    await Promise.all(updatePromises);
    
    // 4. 删除已过期的记录
    const deleteIds = expiredRecords.data.map(r => r._id);
    // 注意：一次最多删除1000条，如果超过需要分批
    await db.collection('user_status')
      .where({
        _id: _.in(deleteIds.slice(0, 1000))
      })
      .update({
        data: {
          isExpired: true
        }
      });
    
   
    return {
      success: true,
      message: '清理完成',
      cleanedCount: expiredRecords.data.length
    };
    
  } catch (error) {
    console.error('removeExpiredStatus error:', error);
    return {
      success: false,
      error: error.message
    };
  }
  // 删除mock 数据
  async function deleteMockData(expiredRecords) {
    const testUserRecords = expiredRecords.data.filter(record => {
      const oid = record.openId || '';
      return oid.toLowerCase().startsWith('test');
    });
    console.log("待删除的Mock数据条数", testUserRecords);
    let deletedCount = 0;
    if (testUserRecords.length > 0) {
      const deleteIds = testUserRecords.map(r => r._id);
      // 分批删除，防止超过单次操作限制 (通常为 1000 条)
      const batchSize = 1000;
      const deletePromises = [];

      for (let i = 0; i < deleteIds.length; i += batchSize) {
        const batch = deleteIds.slice(i, i + batchSize);
        const promise = db.collection('user_status')
          .where({
            _id: _.in(batch)
          })
          .remove()
          .then(res => {
            deletedCount += (res.stats.removed || 0);
            console.log(`批次删除成功，本批删除：${res.stats.removed}`);
          })
          .catch(err => {
            console.error(`批次删除失败:`, err);
            throw err;
          });

        deletePromises.push(promise);
      }

      await Promise.all(deletePromises);
    }
    console.log("已删除的mock数据条数：:", deletedCount);
  } 
};