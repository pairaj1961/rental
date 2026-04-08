import { RentalStatus } from '../types/rental';

/**
 * Valid forward transitions for the rental state machine.
 * This is the SINGLE SOURCE OF TRUTH consumed by both:
 * - API: rental.service.ts enforces transitions before DB writes
 * - Frontend: TransitionButton disables invalid next states
 */
export const STATUS_TRANSITIONS: Record<RentalStatus, RentalStatus[]> = {
  [RentalStatus.ORDER_RECEIVED]: [RentalStatus.PREPARING, RentalStatus.CANCELLED],
  [RentalStatus.PREPARING]: [RentalStatus.DELIVERED, RentalStatus.CANCELLED],
  [RentalStatus.DELIVERED]: [RentalStatus.ACTIVE, RentalStatus.CANCELLED],
  [RentalStatus.ACTIVE]: [RentalStatus.RETURNING, RentalStatus.CANCELLED],
  [RentalStatus.RETURNING]: [RentalStatus.CLOSED, RentalStatus.CANCELLED],
  [RentalStatus.CLOSED]: [],
  [RentalStatus.CANCELLED]: [],
};

export function isValidTransition(from: RentalStatus, to: RentalStatus): boolean {
  return STATUS_TRANSITIONS[from].includes(to);
}

export const RENTAL_STATUS_LABELS: Record<RentalStatus, string> = {
  [RentalStatus.ORDER_RECEIVED]: 'Order Received',
  [RentalStatus.PREPARING]: 'Preparing',
  [RentalStatus.DELIVERED]: 'Delivered',
  [RentalStatus.ACTIVE]: 'Active',
  [RentalStatus.RETURNING]: 'Returning',
  [RentalStatus.CLOSED]: 'Closed',
  [RentalStatus.CANCELLED]: 'Cancelled',
};

export const RENTAL_STATUS_COLORS: Record<RentalStatus, string> = {
  [RentalStatus.ORDER_RECEIVED]: '#fdab3d',
  [RentalStatus.PREPARING]: '#579bfc',
  [RentalStatus.DELIVERED]: '#9b59b6',
  [RentalStatus.ACTIVE]: '#00c875',
  [RentalStatus.RETURNING]: '#e67e22',
  [RentalStatus.CLOSED]: '#c4c4c4',
  [RentalStatus.CANCELLED]: '#e44258',
};
