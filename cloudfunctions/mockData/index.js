// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV }) // 使用当前云环境

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  try {
    const COUNT = 1;
    const danmusToInsert = [];
    const userStatusesToInsert = [];

    const now = new Date();
    const expireTime = new Date(now.getTime() + 30 * 60 * 1000); // 30分钟后

    for (let i = 1; i <= COUNT; i++) {
      // 1. 生成随机索引
      const statusIndex = getRandomInt(0, 21); 
      const danmuIndex = getRandomInt(0, 5);   

      // 2. 获取源数据
      const statusObj = STATUS_LIST[statusIndex];
      const safeDanmuIndex = danmuIndex < statusObj.Danmu.length ? danmuIndex : 0;
      const danmuContent = statusObj.Danmu[safeDanmuIndex];

      // 3. 构造 openId
      const openId = `test-${i.toString().padStart(2, '0')}`;

      // 4. 【新增】生成随机位置
      const location = generateRandomLocation();

      // 5. 构造 R1 数据 (用于 danmus 集合)
      const danmuRecord = {
        openId: openId,
        statusId: statusObj.id,
        danmuContent: danmuContent,
        createAt: now,
        expireTime: expireTime,
        isExpired: false,
        // 添加位置信息
        lat: location.lat,
        lng: location.lng
      };

      // 6. 构造 R1 数据 (用于 user_status 集合)
      const userStatusRecord = {
        openId: openId,
        statusId: statusObj.id,
        statusName: statusObj.name,
        createAt: now,
        expireTime: expireTime,
        isExpired: false,
        // 添加位置信息 (user_status 通常也需要位置来做附近的人查询)
        lat: location.lat,
        lng: location.lng
      };

      danmusToInsert.push(danmuRecord);
      userStatusesToInsert.push(userStatusRecord);
    }

    // 7. 批量写入数据库
    const [danmuRes, statusRes] = await Promise.all([
      db.collection('danmus').add({
        data: danmusToInsert
      }),
      db.collection('user_status').add({
        data: userStatusesToInsert
      })
    ]);

    return {
      success: true,
      message: `成功生成并插入 ${COUNT} 条带位置的数据`,
      details: {
        danmusInserted: danmuRes._ids.length,
        userStatusesInserted: statusRes._ids.length,
        sampleLocation: {
          lat: danmusToInsert[0].lat,
          lng: danmusToInsert[0].lng
        }
      }
    };

  } catch (error) {
    console.error("生成数据失败:", error);
    return {
      success: false,
      message: "生成数据失败",
      error: error.message
    };
  }
}

// 辅助函数：生成指定范围的随机整数 [min, max]
function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// 【新增】辅助函数：生成随机经纬度 (模拟中国大陆范围)
function generateRandomLocation() {
  // 中国大致范围：纬度 18~54, 经度 73~135
  // 为了数据更集中像城市用户，可以稍微缩小一点，或者保持大范围
  const minLat = 18.000000;
  const maxLat = 54.000000;
  const minLng = 73.000000;
  const maxLng = 135.000000;

  const lat = (Math.random() * (maxLat - minLat) + minLat).toFixed(6);
  const lng = (Math.random() * (maxLng - minLng) + minLng).toFixed(6);

  return {
    lat: parseFloat(lat),
    lng: parseFloat(lng)
  };
}