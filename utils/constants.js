// utils/constants.js - 常量定义

// 状态列表
const STATUS_LIST = [
  { id: 1, name: '撸铁', icon: '💪' },
  { id: 2, name: '撸猫', icon: '🐱' },
  { id: 3, name: '写代码', icon: '💻' },
  { id: 4, name: '干饭', icon: '🍚' },
  { id: 5, name: '通勤', icon: '🚇' },
  { id: 6, name: '逛街', icon: '🛍️' },
  { id: 7, name: '发呆', icon: '😶' },
  { id: 8, name: '睡觉', icon: '😴' },
  { id: 9, name: '写东西', icon: '✍️' },
  { id: 10, name: '相亲', icon: '💑' },
  { id: 11, name: '谈恋爱', icon: '💕' },
  { id: 12, name: '刷视频', icon: '📱' },
  { id: 13, name: '加班', icon: '🏢' },
  { id: 14, name: '失眠', icon: '🌙' },
  { id: 15, name: '做饭', icon: '🍳' },
  { id: 16, name: '刷剧', icon: '📺' },
  { id: 17, name: '考研', icon: '📚' },
  { id: 18, name: '学外语', icon: '🗣️' },
  { id: 19, name: '找工作', icon: '💼' },
  { id: 20, name: '带娃', icon: '👶' },
  { id: 21, name: '打游戏', icon: '🎮' }
];

// 状态ID到对象的映射
const STATUS_MAP = {};
STATUS_LIST.forEach(status => {
  STATUS_MAP[status.id] = status;
});

// 持续时间选项（分钟）
const DURATION_OPTIONS = [
  { label: '30分钟', value: 30 },
  { label: '1小时', value: 60 },
  { label: '2小时', value: 120 },
  { label: '1天', value: 1440 }
];

// 防抖时间（毫秒）
const DEBOUNCE_TIME = 5 * 60 * 1000; // 5分钟

module.exports = {
  STATUS_LIST,
  STATUS_MAP,
  DURATION_OPTIONS,
  DEBOUNCE_TIME
};
