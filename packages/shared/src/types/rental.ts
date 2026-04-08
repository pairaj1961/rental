export enum RentalStatus {
  ORDER_RECEIVED = 'ORDER_RECEIVED',
  PREPARING = 'PREPARING',
  DELIVERED = 'DELIVERED',
  ACTIVE = 'ACTIVE',
  RETURNING = 'RETURNING',
  CLOSED = 'CLOSED',
  CANCELLED = 'CANCELLED',
}

export enum InspectionType {
  PRE_DELIVERY = 'PRE_DELIVERY',
  DELIVERY = 'DELIVERY',
  RETURN = 'RETURN',
}

export enum MaintenanceType {
  REPAIR = 'REPAIR',
  PM = 'PM',
  EMERGENCY = 'EMERGENCY',
}

export enum DocumentType {
  DELIVERY_NOTE = 'DELIVERY_NOTE',
  INSPECTION_FORM = 'INSPECTION_FORM',
  RETURN_FORM = 'RETURN_FORM',
  RENTAL_CONTRACT = 'RENTAL_CONTRACT',
}

export interface ChecklistItem {
  itemName: string;
  status: 'PASS' | 'FAIL' | 'NA';
  note?: string;
}
