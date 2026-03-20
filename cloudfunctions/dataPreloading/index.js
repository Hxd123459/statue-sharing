// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV }) // 使用当前云环境
const { STATUS_LIST} = require('../../utils/constants.js');

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const db = cloud.database();
  const _ = db.command;
  const collectionName = 'status_records';
  const results = [];
  try {
    // 遍历状态列表
    for (const item of STATUS_LIST) {
      // 1. 查询数据库中是否已存在该 statusId
      const queryRes = await db.collection(collectionName)
        .where({
          statusId: item.id
        })
        .get();

      if (queryRes.data.length === 0) {
        // 2. 如果不存在，则新增
        const now = new Date();
        
        await db.collection(collectionName).add({
          data: {
            statusId: item.id,
            statusName: item.name,
            total: 0, // 默认值为0
            updateTime: now, // 记录创建时间
          }
        });

        results.push({
          statusId: item.id,
          action: 'added',
          message: `成功添加状态：${item.name}`
        });
      } else {
        // 如果存在，跳过
        results.push({
          statusId: item.id,
          action: 'skipped',
          message: `状态已存在，跳过：${item.name}`
        });
      }
    }

    return {
      success: true,
      openid: wxContext.OPENID,
      msg: '初始化完成',
      details: results
    };

  } catch (err) {
    console.error('初始化状态失败:', err);
    return {
      success: false,
      openid: wxContext.OPENID,
      msg: '执行出错',
      error: err.message
    };
  }
}