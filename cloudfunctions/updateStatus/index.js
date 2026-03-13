// 云函数入口文件
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV }) // 使用当前云环境
const db = cloud.database();
const _ = db.command;
// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { userStatusId, statusRecordsId } = event;
  const now = new Date();
  console.log("------",statusRecordsId)
  try {
    await db.collection('status_records')
      .doc(statusRecordsId)
      .update({
      data: {
          total: _.inc(-1),
          updateTime: now,
      }
    });
    await db.collection('user_status')
      .doc(userStatusId)
      .update({
        data: {
          isExpired: true,
          expireTime: now,
        }
      });
  } catch (err) {
    console.error('更新状态失败！:', err);
  }
}