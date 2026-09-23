import type {
  DietaryOption,
  RateBasis,
  VendorAssignmentStatus,
  VendorPaymentRecordStatus,
  VendorPaymentStatus,
  VendorStatus,
  VendorType,
} from "./vendorConstants";

/**
 * API response shapes for the vendor module. Money is in rupees with up to two
 * decimals (the storage layer keeps rupees for expenses/payments, matching the
 * finance module; quotations/invoices keep paise internally).
 */

export interface VendorRateInfoDto {
  basis: RateBasis | string;
  /** Indicative figure only — the agreed figure lives on the assignment. */
  amount: number;
  notes: string;
}

export interface VendorPackageDto {
  id: string;
  name: string;
  pricePerPlate: number;
  minimumGuests: number | null;
  description: string;
  menuItems: string[];
  active: boolean;
}

export interface VendorCatererDto {
  cuisines: string[];
  dietaryOptions: (DietaryOption | string)[];
  perPlatePrice: number;
  minimumGuestCount: number | null;
  maximumGuestCount: number | null;
  staffIncluded: boolean;
  equipmentIncluded: boolean;
  servingStaff: number;
  setupCharges: number;
  deliveryCharges: number;
  additionalCharges: number;
  notes: string;
}

export interface VendorNoteDto {
  id: string;
  body: string;
  authorName: string;
  createdAt: string;
}

export interface VendorDto {
  id: string;
  name: string;
  company: string;
  type: VendorType | string;
  category: string;
  contactPerson: string;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  area: string;
  city: string;
  description: string;
  services: string[];
  rateInfo: VendorRateInfoDto;
  status: VendorStatus;
  /** Free-text internal summary shown on the form. */
  notes: string;

  caterer: VendorCatererDto;
  packages: VendorPackageDto[];
  noteLog: VendorNoteDto[];

  createdBy: { id: string; name: string } | null;
  updatedBy: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}

/**
 * A vendor as it appears in the list. Deliberately leaner than `VendorDto`:
 * a page of 20 vendors does not need every caterer package and note, and the
 * list carries the two figures the operator actually scans for.
 */
export interface VendorListItemDto {
  id: string;
  name: string;
  company: string;
  type: VendorType | string;
  category: string;
  contactPerson: string;
  phone: string;
  whatsapp: string;
  email: string;
  area: string;
  city: string;
  status: VendorStatus;
  services: string[];

  /** Derived from event assignments and vendor payments. */
  events: number;
  contracted: number;
  paid: number;
  outstanding: number;

  createdAt: string;
  updatedAt: string;
}

/** Catering detail carried by a single event assignment. */
export interface AssignmentCatererDto {
  guestCount: number | null;
  packageName: string;
  pricePerPlate: number;
  cuisine: string;
  dietaryNotes: string;
  setupTime: string;
  servingTime: string;
  cleanupTime: string;
  specialInstructions: string;
}

export interface EventVendorAssignmentDto {
  id: string;
  vendor: { id: string; name: string; type: string; phone: string; status: string } | null;
  /** The role the vendor is playing on this event (usually their vendor type). */
  role: string;
  service: string;

  estimatedCost: number;
  negotiatedCost: number;
  /** What flows into the event's expenses and profit. */
  agreedCost: number;
  /**
   * How `agreedCost` was arrived at, so the UI can explain the figure instead
   * of presenting a calculated number as a negotiated one.
   */
  costSource: "agreed" | "negotiated" | "catering-calculation" | "none";
  quantity: number;

  status: VendorAssignmentStatus;
  startTime: string;
  endTime: string;
  notes: string;
  contactPerson: string;
  contactPhone: string;

  /** The Expense record this assignment's cost is represented by, if any. */
  expenseId: string | null;

  caterer: AssignmentCatererDto;

  /** Derived from VendorPayment records — never stored independently. */
  amountPaid: number;
  outstanding: number;
  paymentStatus: VendorPaymentStatus;

  createdAt: string | null;
  updatedAt: string | null;
}

export interface VendorEventHistoryItemDto {
  eventId: string;
  eventName: string;
  eventDate: string;
  eventStatus: string;
  assignmentId: string;
  service: string;
  agreedCost: number;
  amountPaid: number;
  outstanding: number;
  assignmentStatus: VendorAssignmentStatus;
  paymentStatus: VendorPaymentStatus;
}

export interface VendorTotalsDto {
  events: number;
  completedEvents: number;
  cancelledEvents: number;
  contracted: number;
  paid: number;
  outstanding: number;
  averageEventCost: number;
}

export interface VendorFinancialsDto {
  totals: VendorTotalsDto;
  events: VendorEventHistoryItemDto[];
}

export interface VendorPaymentDto {
  id: string;
  vendor: { id: string; name: string } | null;
  event: { id: string; eventName: string; eventDate?: string } | null;
  assignmentId: string | null;
  amount: number;
  paymentDate: string;
  method: string;
  reference: string;
  notes: string;
  status: VendorPaymentRecordStatus;
  createdBy: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
}
