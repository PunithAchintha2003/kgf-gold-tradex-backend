import {
  activateDueAuctions,
  closeExpiredAuctions,
} from '../services/auctionCloseService.js';

const INTERVAL_MS = 5000;
let timer = null;

export function startAuctionScheduler() {
  if (timer) return;

  const tick = async () => {
    try {
      await activateDueAuctions();
      await closeExpiredAuctions();
    } catch (err) {
      console.error('Auction scheduler error:', err);
    }
  };

  void tick();
  timer = setInterval(tick, INTERVAL_MS);
  console.log('⏱️  Auction scheduler started (every 5s)');
}

export function stopAuctionScheduler() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}
