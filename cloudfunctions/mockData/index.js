// 云函数入口文件
const cloud = require('wx-server-sdk')

// 1. 定义状态列表
const STATUS_LIST = [
  { id: 1, name: '撸铁', icon: '💪', Danmu: ['今天你练腿了吗？', '力竭才是开始！', '轻重量，宝宝椅？', '这组做完就撤！', '肌肉在撕裂生长', '核心收紧别塌腰', '再来一个就力竭', '蛋白粉喝起来！', '镜子不会骗人', '拒绝做键盘侠', '深蹲起不来啦', '今日份多巴胺', '只要练不死就往死里练', '这个重量有点虚', '大佬带带我', '腹肌正在路上', '流汗是脂肪哭泣', '这就是泵感吗', '腿抖得像筛糠', 'Light Weight Baby!'] },
  { id: 2, name: '撸猫', icon: '🐱', Danmu: ['猫主子踩奶中', '今日份吸猫', '这手感绝了', '别停，继续摸', '猫：莫挨老子', '被治愈的瞬间', '掉毛怪实锤', '想偷回家养'] },
  { id: 3, name: '写代码', icon: '💻', Danmu: ['Bug 退散！', '一次编译通过', '头发又少一根', '这个逻辑绝了', '正在重构屎山', '删库跑路前夜', '产品经理别催', '这就是艺术'] },
  { id: 4, name: '干饭', icon: '🍚', Danmu: ['吃饭不积极，脑袋有问题！', '干饭人集合！', '这顿必须炫完', '减肥明天再说', '碳水快乐炸弹', '好吃到哭', '老板再来一碗', '这就是幸福', '饿死鬼投胎'] },
  { id: 5, name: '通勤', icon: '🚇', Danmu: ['挤成沙丁鱼', '再睡五分钟', '地铁信号没了', '早八人早八魂', '堵在路上了', '耳机一戴谁也不爱', '又是迟到的一天', '晃得站不稳'] },
  { id: 6, name: '逛街', icon: '🛍️', Danmu: ['钱包在哭泣', '买买买停不下', '这件必须拿下', '逛吃逛吃模式', '腿已断求扶', '打折就是赚到', '只逛不买行吗', '种草成功！'] },
  { id: 7, name: '发呆', icon: '😶', Danmu: ['大脑正在放空', '我是谁我在哪', '灵魂出窍中', '此时无声胜有声', '禁止打扰我', '思考人生哲理', '时间静止了', '我就静静看着'] },
  { id: 8, name: '睡觉', icon: '😴', Danmu: ['晚安玛卡巴卡', '梦里啥都有', '谁也别叫醒我', '秒睡技能发动', '熬夜冠军下线', '被子封印了我', '呼呼呼大爆发', '充电两小时'] },
  { id: 9, name: '写东西', icon: '✍️', Danmu: ['灵感爆棚中', '憋不出一个字', '文思如泉涌', '改稿第 N 版', '作家附体时刻', '笔耕不辍', '这句子绝了', '写完就睡觉'] },
  { id: 10, name: '相亲', icon: '💑', Danmu: ['尴尬扣出三室一厅', '看对眼了吗？', '查户口现场', '希望能成吧', '脚趾抠地中', '这也太普信了', '聊不到一块去', '缘分天注定'] },
  { id: 11, name: '谈恋爱', icon: '😚', Danmu: ['甜度严重超标', '又是吃狗粮', '想立刻结婚', '这就是爱情啊', '吵架也是糖', '满眼都是你', '锁死这对 CP', '单身狗退散'] },
  { id: 12, name: '刷视频', icon: '📱', Danmu: ['再刷就一天啦', '大数据懂我', '笑出腹肌了', '根本停不下来', '这剧情神反转', '手不受控制了', '电子榨菜真香', '点赞收藏吃灰'] },
  { id: 13, name: '加班', icon: '🏢', Danmu: ['公司是我家的', '凌晨三点见', '老板画饼中', '只想准点下班', '咖啡续命时刻', '这班非加不可？', '累觉不爱', '打工人的命'] },
  { id: 14, name: '失眠', icon: '🌙', Danmu: ['数羊数到一万', '脑子停不下来', '又是无眠夜', '想睡睡不着', '天快亮了吧', 'emo 时刻到了', '谁懂这种痛', '被迫清醒'] },
  { id: 15, name: '做饭', icon: '🍳', Danmu: ['黑暗料理诞生', '厨神附体时刻', '烟火气最抚人', '差点炸厨房', '真香现场', '盐放多了吗？', '为了这口吃的', '洗碗更痛苦'] },
  { id: 16, name: '刷剧', icon: '📺', Danmu: ['熬夜也要追完', '编剧出来挨打', '磕到了磕到了', '反派太气人', '结局意难平', '倍速播放启动', '纸巾不够用了', '这就大结局？'] },
  { id: 17, name: '考研', icon: '📚', Danmu: ['上岸必成功！', '背不完根本背不完', '图书馆占座', '坚持就是胜利', '肖四肖八救命', '心态有点崩了', '为了梦想冲鸭', '最后再背一遍'] },
  { id: 18, name: '学外语', icon: '🗣️', Danmu: ['Abandon 放弃', '口语太烫嘴了', '听力像听天书', '单词记不住啊', 'Hello 走天下', '语言天赋为零', '今天打卡完成', '多邻国催命了'] },
  { id: 19, name: '找工作', icon: '💼', Danmu: ['面试又挂了', '简历已读不回', 'Offer 快来吧', '海投无音讯', 'HR 太能聊了', '期望薪资多少？', '不想上班想躺', '拿到 Offer 啦'] },
  { id: 20, name: '带娃', icon: '👶', Danmu: ['神兽终于睡了', '人类幼崽太难带', '老母亲/父亲累了', '拆家现场直播', '萌化了的心', '辅导作业气死人', '抱得手都酸了', '当妈/爸不易'] },
  { id: 21, name: '打游戏', icon: '🎮', Danmu: ['带飞全场！', '队友太坑了', '这波操作丝滑', '再赢一把就睡', '落地成盒', '逆风翻盘爽', '手速跟不上', '这游戏有毒'] },
  { id: 22, name: '拉屎', icon: '💩', Danmu: ['备纸，出恭！', '带薪拉屎中', '我去释放一下内存', '腿麻了，谁扶我一下', '陪一根~', '一蹲就是半小时'] },
  { id: 23, name: '摸鱼', icon: '🐟', Danmu: [' 老板看不见我 ', ' 假装在认真工作 ', ' 偷偷刷会儿手机 ', ' 摸鱼使我快乐 ', ' 工作哪有摸鱼香 ', ' 带薪发呆中 '] }
];

// 2. 【核心】小时 - 对应状态映射（真实生活作息）
const HOUR_STATUS_MAP = {
  // --- 凌晨时段 (00:00 - 04:59) ---
  // 排除：通勤(5), 上班/上学相关(3,9,13,17,18,19), 社交/户外(6,10,15,20), 剧烈运动(1)
  0: [2, 4, 7, 8, 11, 12, 14, 16, 21, 22],
  1: [2, 4, 7, 8, 11, 12, 14, 16, 21, 22],
  2: [2, 7, 8, 12, 14, 16, 21, 22], // 深夜更倾向于独处
  3: [2, 7, 8, 12, 14, 16, 21, 22],
  4: [2, 7, 8, 12, 14, 16, 21, 22],
  5: [2, 7, 8, 12, 14, 16, 21, 22], // 早起的人可能在发呆或看手机

  // --- 早晨时段 (05:00 - 08:59) ---
  // 排除：深夜娱乐(14,16), 纯睡觉(8 - 除非赖床), 约会(10,11)
  6: [4, 5, 7, 8, 12, 15, 22], // 早起通勤、早饭、晨练(算在发呆/通勤里)
  7: [1, 4, 5, 7, 12, 15, 22], // 晨练、通勤、早饭
  8: [1, 3, 4, 5, 6, 7, 9, 12, 13, 15, 17, 18, 19, 20, 21, 22], // 忙碌的开始，排除相亲(10)

  // --- 上午时段 (09:00 - 11:59) ---
  // 排除：睡觉(8), 失眠(14), 刷剧(16), 相亲(10 - 较少上午), 约会(11)
  9: [1, 3, 5, 6, 7, 9, 12, 13, 15, 17, 18, 19, 20, 21, 22],
  10: [1, 3, 5, 6, 7, 9, 12, 13, 15, 17, 18, 19, 20, 21, 22],
  11: [1, 3, 4, 5, 6, 7, 9, 12, 13, 15, 17, 18, 19, 20, 21, 22], // 准备午饭

  // --- 中午时段 (12:00 - 13:59) ---
  // 排除：睡觉(8), 失眠(14), 刷剧(16 - 除非下饭), 约会(11 - 除非午休约)
  12: [1, 3, 4, 5, 6, 7, 9, 10, 12, 13, 15, 16, 17, 18, 19, 20, 21, 22],
  13: [1, 3, 4, 5, 6, 7, 9, 10, 12, 13, 15, 16, 17, 18, 19, 20, 21, 22],

  // --- 下午时段 (14:00 - 17:59) ---
  // 排除：睡觉(8), 失眠(14), 刷剧(16 - 摸鱼可能), 相亲(10), 约会(11)
  14: [1, 3, 5, 6, 7, 9, 12, 13, 15, 16, 17, 18, 19, 20, 21, 22],
  15: [1, 3, 5, 6, 7, 9, 12, 13, 15, 16, 17, 18, 19, 20, 21, 22],
  16: [1, 3, 5, 6, 7, 9, 12, 13, 15, 16, 17, 18, 19, 20, 21, 22],
  17: [1, 3, 4, 5, 6, 7, 9, 12, 13, 15, 16, 17, 18, 19, 20, 21, 22], // 下班/放学

  // --- 晚间时段 (18:00 - 23:59) ---
  // 排除：通勤(5 - 除非夜归), 上班/上学(3,9,13,17,18,19)
  18: [1, 2, 4, 6, 7, 10, 11, 12, 15, 16, 20, 21, 22], // 晚餐、娱乐、约会
  19: [1, 2, 4, 6, 7, 10, 11, 12, 15, 16, 20, 21, 22],
  20: [1, 2, 4, 6, 7, 10, 11, 12, 15, 16, 20, 21, 22],
  21: [1, 2, 4, 6, 7, 8, 10, 11, 12, 14, 15, 16, 20, 21, 22], // 准备睡觉，排除工作类
  22: [1, 2, 4, 6, 7, 8, 10, 11, 12, 14, 15, 16, 20, 21, 22],
  23: [2, 4, 7, 8, 11, 12, 14, 16, 21, 22] // 回归深夜模式
};

const ENV_ID = 'cloud1-0g7t1v9lab94a58b';

// 3. 初始化云开发环境
cloud.init({
  env: ENV_ID
})

const db = cloud.database();

// 4. 辅助函数
function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// 根据当前小时获取随机状态
function getRandomStatusByHour(currentHour) {
  const allowedIds = HOUR_STATUS_MAP[currentHour] || [];
  if (!allowedIds.length) return null;

  const randomId = allowedIds[getRandomInt(0, allowedIds.length - 1)];
  return STATUS_LIST.find(item => item.id === randomId) || STATUS_LIST[0];
}

function generateRandomLocation() {
  const minLat = 18.000000, maxLat = 54.000000;
  const minLng = 73.000000, maxLng = 135.000000;
  return {
    lat: parseFloat((Math.random() * (maxLat - minLat) + minLat).toFixed(6)),
    lng: parseFloat((Math.random() * (maxLng - minLng) + minLng).toFixed(6))
  };
}

// 5. 云函数入口
exports.main = async (event, context) => {
  const now = new Date();
  // 转换为北京时间
  const beijingTime = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  const currentHour = beijingTime.getHours();

  console.log(`[Time Check] 当前北京时间: ${beijingTime.toLocaleString('zh-CN')}, 小时: ${currentHour}`);

  // 凌晨 2点-6点 维护时间跳过
  if (currentHour >= 2 && currentHour < 6) {
    console.log('[Skip] 处于凌晨维护时间，任务跳过。');
    return { success: true, message: 'Skipped due to maintenance time' };
  }

  // 50% 概率跳过
  const randomFlag = getRandomInt(0, 1);
  if (randomFlag === 0) {
    console.log('[Skip] 随机概率未命中，任务跳过。');
    return { success: true, message: 'Skipped due to random chance' };
  }

  console.log('[Start] 开始执行数据写入...');

  const COUNT = 1;
  const danmusToInsert = [];
  const userStatusesToInsert = [];

  // 计算过期时间 (1-30分钟后)
  const randomOffsetMs = getRandomInt(1 * 60 * 1000, 30 * 60 * 1000);
  const expireTime = new Date(now.getTime() + randomOffsetMs);

  // --- 准备数据 ---
  for (let i = 1; i <= COUNT; i++) {
    // ✅ 核心修改：根据当前小时获取对应状态（不再随机）
    const statusObj = getRandomStatusByHour(currentHour);

    const danmuIndex = getRandomInt(0, statusObj.Danmu.length - 1);
    const openId = `test-${i.toString().padStart(2, '0')}`;
    const location = generateRandomLocation();

    danmusToInsert.push({
      openId,
      statusId: statusObj.id,
      danmuContent: statusObj.Danmu[danmuIndex],
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
    // --- 执行任务 ---
    // 任务 A: 插入数据
    const insertPromise = Promise.all([
      db.collection('danmus').add({ data: danmusToInsert }),
      db.collection('user_status').add({ data: userStatusesToInsert })
    ]);

    // 任务 B: 事务更新统计
    const transactionPromise = db.runTransaction(async (transaction) => {
      const counts = {};
      userStatusesToInsert.forEach(item => {
        counts[item.statusId] = (counts[item.statusId] || 0) + 1;
      });

      for (const idStr of Object.keys(counts)) {
        const statusId = parseInt(idStr);
        const countToAdd = counts[idStr];

        const queryRes = await transaction.collection('status_records')
          .where({ statusId: statusId })
          .get();

        if (queryRes.data.length === 0) {
          console.warn(`[Warning] 未找到 statusId: ${statusId} 的记录`);
          continue;
        }

        const currentDoc = queryRes.data[0];
        const currentTotal = currentDoc.total || 0;
        const newTotal = currentTotal + countToAdd;

        await transaction.collection('status_records')
          .doc(currentDoc._id)
          .update({
            data: {
              total: newTotal,
              updateTime: now,
            },
          });
      }
    });

    const [insertRes] = await Promise.all([insertPromise, transactionPromise]);

    return {
      success: true,
      message: `成功插入 ${COUNT} 条数据`,
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