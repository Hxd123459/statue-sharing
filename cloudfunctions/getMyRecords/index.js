// cloudfunctions/getMyRecords/index.js
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openId = wxContext.OPENID;
  const { page = 1, pageSize = 20 } = event;

  try {
    const skip = (page - 1) * pageSize;

    // 查询用户的记录
    const res = await db.collection('status_records')
      .where({ userId: openId })
      .orderBy('startTime', 'desc')
      .skip(skip)
      .limit(pageSize)
      .get();

    // 计算总数（仅在第一页时查询）
    let total = 0;
    if (page === 1) {
      const countRes = await db.collection('status_records')
        .where({ userId: openId })
        .count();
      total = countRes.total;
    }

    return {
      success: true,
      data: res.data,
      hasMore: res.data.length === pageSize,
      total: total
    };

  } catch (err) {
    console.error('获取记录失败:', err);
    return {
      success: false,
      error: err.message
    };
  }
};
