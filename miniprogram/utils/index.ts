import { BASE32_CHARSET } from '../constants/index';

/**
 * 生成唯一的 guita_id
 * 格式: GT + 12 位 Base32 字符
 */
export function generateGuitaId(): string {
  const length = 12;
  let result = 'GT';
  for (let i = 0; i < length; i++) {
    const idx = Math.floor(Math.random() * BASE32_CHARSET.length);
    result += BASE32_CHARSET[idx];
  }
  return result;
}

/**
 * 手机号脱敏：138****0000
 */
export function maskPhone(phone: string): string {
  if (!phone || phone.length !== 11) return phone || '';
  return phone.substring(0, 3) + '****' + phone.substring(7);
}

/**
 * 格式化日期为可读字符串
 */
export function formatDate(date: Date | string | number): string {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 格式化时长（秒 -> XX:XX:XX）
 */
export function formatDuration(totalSeconds: number): string {
  if (!totalSeconds || totalSeconds <= 0) return '00:00';
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) {
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/**
 * 获取中文的相对时间描述
 */
export function timeAgo(date: Date | string | number): string {
  const now = Date.now();
  const target = new Date(date).getTime();
  const diff = now - target;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 30) return `${days}天前`;
  return formatDate(date);
}
