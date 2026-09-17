export type LoyaltyTier = 'Gold' | 'Silver' | 'Platinum';

export interface FlightBooking {
  flightNumber: string;
  route: string;
  origin: string;
  originCode: string;
  destination: string;
  destinationCode: string;
  date: string;
  scheduledDeparture: string;
  actualOrNewDeparture?: string;
  status: 'Cancelled' | 'Delayed' | 'Unaffected';
  statusDetails: string;
  isReturn?: boolean;
}

export interface EligibilityResult {
  freeRebookingWithin24h: { eligible: boolean; note: string };
  fullRefund: { eligible: boolean; note: string };
  mealVoucher: { eligible: boolean; note: string };
  loungeAccess: { eligible: boolean; note: string };
  hotelAccommodation: { eligible: boolean; note: string };
  priorityRebooking: { eligible: boolean; note: string };
  fareDifferenceWaiverLimit: number;
}

export interface CustomerProfile {
  id: string;
  name: string;
  loyaltyTier: LoyaltyTier;
  bookingReference: string;
  contactEmail: string;
  contactPhone: string;
  travelHistory: {
    flightsLast12Months: number;
    priorComplaints: string;
  };
  disruptionSummary: string;
  flights: FlightBooking[];
  eligibility: EligibilityResult;
}

export interface TraceData {
  perceive: string;
  retrieve: string;
  reason: string;
  guardrail: string;
  act: string;
}

export interface PolicySources {
  bookingData: Array<{ label: string; value: string }>;
  servicePolicy: Array<{ rule: string; clause: string; status: 'Applies' | 'Exceeded' | 'Not Applicable' }>;
}

export interface FactsFallback {
  title: string;
  customer: string;
  tier: string;
  bookingRef: string;
  disruption: string;
  verifiedFacts: string[];
  policyEntitlements: string[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'agent';
  text: string;
  timestamp: string;
  isUnavailable?: boolean;
  factsFallback?: FactsFallback;
  sources?: PolicySources;
  trace?: TraceData;
  suggestedActions?: string[];
  provider?: 'groq' | 'grok' | 'gemini' | 'instant_engine';
}

export type ActionStatus = 'AVAILABLE' | 'PROCESSING' | 'COMPLETED' | 'ESCALATION_REQUIRED' | 'NOT_ELIGIBLE' | 'FAILED';

export interface ActionDefinition {
  id: string;
  label: string;
  description: string;
  type: string;
  params?: Record<string, any>;
  primary?: boolean;
  danger?: boolean;
}

export interface AuditRecord {
  id: string;
  timestamp: string;
  isoTimestamp: string;
  customerId: string;
  customerName: string;
  eventType: string;
  details: string;
  policyRef?: string;
  severity?: 'normal' | 'warning' | 'critical' | 'success';
}
