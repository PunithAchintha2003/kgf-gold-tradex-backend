import { getIO, adminRoom, userRoom } from './io.js';

/**
 * @param {object} params
 * @param {string} params.type
 * @param {string} params.title
 * @param {string} params.message
 * @param {'success'|'error'|'warning'|'info'} [params.severity]
 * @param {string} [params.link]
 * @param {Record<string, unknown>} [params.data]
 */
export function buildNotification({ type, title, message, severity = 'info', link, data = {} }) {
  return {
    id: `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    title,
    message,
    severity,
    createdAt: new Date().toISOString(),
    link,
    data,
  };
}

export function notifyAdmin(payload) {
  const io = getIO();
  if (io) {
    io.to(adminRoom()).emit('notification', payload);
  }
}

export function notifyUser(userId, payload) {
  const io = getIO();
  if (io) {
    io.to(userRoom(String(userId))).emit('notification', payload);
  }
}
