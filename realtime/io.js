/** @type {import('socket.io').Server | null} */
let io = null;

export function setIO(server) {
  io = server;
}

export function getIO() {
  return io;
}

export function auctionRoom(auctionId) {
  return `auction:${auctionId}`;
}

export function conversationRoom(conversationId) {
  return `conv:${conversationId}`;
}

export function userRoom(userId) {
  return `user:${userId}`;
}
