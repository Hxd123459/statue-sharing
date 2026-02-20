// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV }) // 使用当前云环境
const db = cloud.database(); // 🔥 必须加上这一行！

// 云函数入口函数
exports.main = async (event, context) => {
    const wxContext = cloud.getWXContext();
    const openId = wxContext.OPENID;
    console.log('login 执行，openId:', openId);
  
    try {
      // 检查用户是否已存在
      const userRes = await db.collection('users')
        .where({ openId })
        .get();
  
      // 如果用户不存在，创建新用户
      if (userRes.data.length === 0) {
        await db.collection('users').add({
          data: {
            openId,
            currentStatus: null,
            statusStartTime: null,
            statusEndTime: null,
            lastUpdateTime: null,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        });
      }
  
      return {
        success: true,
        openid: openId
      };
      
    } catch (err) {
      console.error('登录失败:', err);
      return {
        success: false,
        error: err
      };
    }
}