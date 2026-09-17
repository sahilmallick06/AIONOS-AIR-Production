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

export interface CustomerProfile {
  id: string;
  name: string;
  loyaltyTier: 'Gold' | 'Silver' | 'Platinum';
  bookingReference: string; // PNR
  contactEmail: string;
  contactPhone: string;
  travelHistory: {
    flightsLast12Months: number;
    priorComplaints: string;
  };
  disruptionSummary: string;
  flights: FlightBooking[];
}

export const CUSTOMERS: Record<string, CustomerProfile> = {
  priya: {
    id: 'priya',
    name: 'Priya Nair',
    loyaltyTier: 'Gold',
    bookingReference: 'SK4821X',
    contactEmail: 'priya.nair@example.com',
    contactPhone: '+91-98xxxxxxx1',
    travelHistory: {
      flightsLast12Months: 6,
      priorComplaints: '1 prior complaint (delayed baggage, resolved with voucher)',
    },
    disruptionSummary: 'Flight SK-204 cancelled due to operational reasons. Return flight unaffected.',
    flights: [
      {
        flightNumber: 'SK-204',
        route: 'Delhi → Goa',
        origin: 'Delhi',
        originCode: 'DEL',
        destination: 'Goa',
        destinationCode: 'GOI',
        date: 'Wed 23 Sep 2026',
        scheduledDeparture: '18:40',
        status: 'Cancelled',
        statusDetails: 'Cancelled (operational reasons)',
        isReturn: false,
      },
      {
        flightNumber: 'Return',
        route: 'Goa → Delhi',
        origin: 'Goa',
        originCode: 'GOI',
        destination: 'Delhi',
        destinationCode: 'DEL',
        date: 'Fri 25 Sep 2026',
        scheduledDeparture: '16:20',
        status: 'Unaffected',
        statusDetails: 'Unaffected (Confirmed scheduled departure)',
        isReturn: true,
      },
    ],
  },
  arvind: {
    id: 'arvind',
    name: 'Arvind Kulkarni',
    loyaltyTier: 'Silver',
    bookingReference: 'TR1190B',
    contactEmail: 'arvind.kulkarni@example.com',
    contactPhone: '+91-98xxxxxxx2',
    travelHistory: {
      flightsLast12Months: 3,
      priorComplaints: 'No prior complaints',
    },
    disruptionSummary: 'Flight SK-118 delayed by 4 hours due to airline disruption.',
    flights: [
      {
        flightNumber: 'SK-118',
        route: 'Mumbai → Bengaluru',
        origin: 'Mumbai',
        originCode: 'BOM',
        destination: 'Bengaluru',
        destinationCode: 'BLR',
        date: 'Wed 23 Sep 2026',
        scheduledDeparture: '07:10',
        actualOrNewDeparture: '11:10',
        status: 'Delayed',
        statusDetails: 'Delayed 4h (new departure 11:10)',
        isReturn: false,
      },
    ],
  },
  meher: {
    id: 'meher',
    name: 'Meher Kaur',
    loyaltyTier: 'Platinum',
    bookingReference: 'WL7742',
    contactEmail: 'meher.kaur@example.com',
    contactPhone: '+91-98xxxxxxx3',
    travelHistory: {
      flightsLast12Months: 10,
      priorComplaints: '1 prior complaint (overbooking, resolved with a tier-status upgrade)',
    },
    disruptionSummary: 'Flight SK-305 delayed by 6 hours due to airline disruption.',
    flights: [
      {
        flightNumber: 'SK-305',
        route: 'Delhi → Hyderabad',
        origin: 'Delhi',
        originCode: 'DEL',
        destination: 'Hyderabad',
        destinationCode: 'HYD',
        date: 'Wed 23 Sep 2026',
        scheduledDeparture: '14:00',
        actualOrNewDeparture: '20:00',
        status: 'Delayed',
        statusDetails: 'Delayed 6h (new departure 20:00)',
        isReturn: false,
      },
    ],
  },
};
