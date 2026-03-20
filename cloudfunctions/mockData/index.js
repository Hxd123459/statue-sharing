// 云函数入口文件
const cloud = require('wx-server-sdk')
const { STATUS_LIST} = require('../../utils/constants.js');
const ENV_ID = 'cloud1-0g7t1v9lab94a58b'; 

// 初始化时指定具体的 env
cloud.init({ 
  env: ENV_ID 
})
const db = cloud.database(); 
const _ = db.command; 

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateRandomLocation() {
  const minLat = 18.000000, maxLat = 54.000000;
  const minLng = 73.000000, maxLng = 135.000000;
  return {
    lat: parseFloat((Math.random() * (maxLat - minLat) + minLat).toFixed(6)),
    lng: parseFloat((Math.random() * (maxLng - minLng) + minLng).toFixed(6))
  };
}

exports.main = async (event, context) => {
  // 现在打印这个就会显示具体的 ID 了
  console.log('[Info] 当前明确指定的环境 ID:', ENV_ID);
  // 也可以打印 cloud.config.env 确认
  console.log('[Info] 实例实际运行的环境:', cloud.config?.env);
  // 凌晨2点-6点不执行！
  const COUNT = 1;
  const danmusToInsert = [];
  const userStatusesToInsert = [];
  const now = new Date();
  
  // 1. 定义时间范围的毫秒数
  const oneMinuteMs = 1 * 60 * 1000;       // 60,000 ms
  const thirtyMinutesMs = 30 * 60 * 1000;  // 1,800,000 ms
  // 2. 获取随机毫秒偏移量 (1分钟 ~ 30分钟)
  const randomOffsetMs = getRandomInt(oneMinuteMs, thirtyMinutesMs);

  const expireTime = new Date(now.getTime() + randomOffsetMs);
  // --- 第一步：准备数据 ---
  for (let i = 1; i <= COUNT; i++) {
    const statusIndex = getRandomInt(0, 21);
    const danmuIndex = getRandomInt(0, 5);
    const statusObj = STATUS_LIST[statusIndex];
    const safeDanmuIndex = danmuIndex < statusObj.Danmu.length ? danmuIndex : 0;
    const openId = `test-${i.toString().padStart(2, '0')}`;
    const location = generateRandomLocation();

    danmusToInsert.push({
      openId, 
      statusId: statusObj.id, 
      danmuContent: statusObj.Danmu[safeDanmuIndex],
      createAt: now, 
      expireTime, 
      isExpired: false,
      lat: location.lat, 
      lng: location.lng
    });

    userStatusesToInsert.push({
      openId, 
      statusId: statusObj.id, 
      statusName: statusObj.name,
      createAt: now, 
      expireTime, 
      isExpired: false,
      lat: location.lat, 
      lng: location.lng
    });
  }

  try {
    // --- 第二步：并行执行 ---
    
    // 任务 A: 普通批量插入
    const insertPromise = Promise.all([
      db.collection('danmus').add({ data: danmusToInsert }),
      db.collection('user_status').add({ data: userStatusesToInsert })
    ]);

    // 任务 B: 事务更新统计
    const transactionPromise = db.runTransaction(async (transaction) => {
      // _.inc() 返回的是一个纯对象指令，transaction.update 会识别它。
      
      const counts = {};
      userStatusesToInsert.forEach(item => {
        counts[item.statusId] = (counts[item.statusId] || 0) + 1;
      });

      const updatePromises = Object.keys(counts).map(id => {
        const countToAdd = counts[id];
        console.log("mock-data:数量",countToAdd)
        console.log("mock-id:",id)
        // 这里直接使用外部的 _
        return transaction.collection('status_records')
          .where({ statusId: parseInt(id) })
          .update({
            data: {
              total: _.inc(countToAdd), 
              updateTime: now,
            },
          });
      });

      await Promise.all(updatePromises);
    });

    // 等待所有任务完成
    const [insertRes] = await Promise.all([insertPromise, transactionPromise]);

    return {
      success: true,
      message: `成功插入 ${COUNT} 条数据并完成统计`,
      details: {
        danmusInserted: insertRes[0]._ids.length,
        userStatusesInserted: insertRes[1]._ids.length
      }
    };

  } catch (error) {
    console.error("操作失败:", error);
    return {
      success: false,
      message: "操作失败",
      error: error.message,
      stack: error.stack
    };
  }
};