export const PAYOUT_TRANSITIONS = {
  CREATED: ['APPROVED'],
  APPROVED: ['PROCESSING'],
  PROCESSING: ['COMPLETED', 'FAILED'],
  FAILED: ['APPROVED'],
  COMPLETED: []
};

export const TRANSACTION_TRANSITIONS = {
  PENDING: ['COMPLETE'],
  COMPLETE: ['ASSIGNED'],
  ASSIGNED: ['PAID_OUT'],
  PAID_OUT: []
};

export function assertTransition(current, next, map) {
  if (!map[current]?.includes(next)) {
    throw new Error(`Illegal transition: ${current} → ${next}`);
  }
}
