'use client';

import { RentalStatus, EquipmentStatus, RENTAL_STATUS_LABELS, RENTAL_STATUS_COLORS } from '@rental/shared';
import { cn } from '@/lib/utils';

const EQUIPMENT_STATUS_LABELS: Record<EquipmentStatus, string> = {
  [EquipmentStatus.AVAILABLE]: 'Available',
  [EquipmentStatus.RENTED]: 'Rented',
  [EquipmentStatus.MAINTENANCE]: 'Maintenance',
  [EquipmentStatus.RETIRED]: 'Retired',
};

const EQUIPMENT_STATUS_COLORS: Record<EquipmentStatus, string> = {
  [EquipmentStatus.AVAILABLE]: '#00c875',
  [EquipmentStatus.RENTED]: '#579bfc',
  [EquipmentStatus.MAINTENANCE]: '#fdab3d',
  [EquipmentStatus.RETIRED]: '#c4c4c4',
};

interface RentalStatusBadgeProps {
  status: RentalStatus;
  className?: string;
}

export function RentalStatusBadge({ status, className }: RentalStatusBadgeProps) {
  const color = RENTAL_STATUS_COLORS[status];
  const label = RENTAL_STATUS_LABELS[status];
  return (
    <span
      className={cn('inline-flex items-center font-semibold text-white whitespace-nowrap', className)}
      style={{
        backgroundColor: color,
        borderRadius: 4,
        padding: '2px 10px',
        fontSize: 12,
        fontWeight: 600,
      }}
      aria-label={`Status: ${label}`}
    >
      {label}
    </span>
  );
}

interface EquipmentStatusBadgeProps {
  status: EquipmentStatus;
  className?: string;
}

export function EquipmentStatusBadge({ status, className }: EquipmentStatusBadgeProps) {
  const color = EQUIPMENT_STATUS_COLORS[status];
  const label = EQUIPMENT_STATUS_LABELS[status];
  return (
    <span
      className={cn('inline-flex items-center font-semibold text-white whitespace-nowrap', className)}
      style={{
        backgroundColor: color,
        borderRadius: 4,
        padding: '2px 10px',
        fontSize: 12,
        fontWeight: 600,
      }}
      aria-label={`Status: ${label}`}
    >
      {label}
    </span>
  );
}
