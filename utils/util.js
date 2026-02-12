// utils/util.js - 工具函数

/**
 * 格式化时间
 */
const formatTime = (date) => {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hour = date.getHours();
  const minute = date.getMinutes();

  return `${[year, month, day].map(formatNumber).join('-')} ${[hour, minute].map(formatNumber).join(':')}`;
};

/**
 * 格式化数字（补零）
 */
const formatNumber = n => {
  n = n.toString();
  return n[1] ? n : `0${n}`;
};

/**
 * 格式化持续时长
 */
const formatDuration = (minutes) => {
  if (minutes < 60) {
    return `${minutes}分钟`;
  } else if (minutes < 1440) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}小时${mins}分钟` : `${hours}小时`;
  } else {
    const days = Math.floor(minutes / 1440);
    return `${days}天`;
  }
};

/**
 * 相对时间
 */
const relativeTime = (date) => {
  const now = new Date();
  const diff = now - date;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}天前`;
  if (hours > 0) return `${hours}小时前`;
  if (minutes > 0) return `${minutes}分钟前`;
  return '刚刚';
};

/**
 * 格式化日期标签
 */
const formatDateLabel = (date) => {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const targetDate = new Date(date);
  
  if (isSameDay(targetDate, today)) {
    return '今天';
  } else if (isSameDay(targetDate, yesterday)) {
    return '昨天';
  } else {
    const month = targetDate.getMonth() + 1;
    const day = targetDate.getDate();
    return `${month}月${day}日`;
  }
};

/**
 * 判断是否同一天
 */
const isSameDay = (date1, date2) => {
  return date1.getFullYear() === date2.getFullYear() &&
         date1.getMonth() === date2.getMonth() &&
         date1.getDate() === date2.getDate();
};

/**
 * 防抖函数
 */
const debounce = (fn, delay) => {
  let timer = null;
  return function(...args) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      fn.apply(this, args);
    }, delay);
  };
};

module.exports = {
  formatTime,
  formatNumber,
  formatDuration,
  relativeTime,
  formatDateLabel,
  isSameDay,
  debounce
};
