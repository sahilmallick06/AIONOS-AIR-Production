import { CustomerProfile, CUSTOMERS } from '../data/customers';

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

export interface EligibilityResult {
  freeRebookingWithin24h: { eligible: boolean; note: string };
  fullRefund: { eligible: boolean; note: string };
  mealVoucher: { eligible: boolean; note: string };
  loungeAccess: { eligible: boolean; note: string };
  hotelAccommodation: { eligible: boolean; note: string };
  priorityRebooking: { eligible: boolean; note: string };
  fareDifferenceWaiverLimit: number;
}

export interface GuardrailEvaluation {
  intent: string;
  isAllowed: boolean;
  requiresEscalation: boolean;
  escalationReason?: string;
  trace: TraceData;
  sources: PolicySources;
  systemDirective: string;
  allowedActions: string[];
  isInformationUnavailable?: boolean;
}

export class PolicyEngine {
  /**
   * Determine customer eligibility based strictly on the supplied Service Policies.
   */
  public static getEligibility(customer: CustomerProfile): EligibilityResult {
    if (customer.id === 'priya') {
      // SK-204 Cancelled (operational reasons)
      return {
        freeRebookingWithin24h: {
          eligible: true,
          note: 'Eligible: Airline-caused cancellation allows free rebooking on next available flight within 24 hours.',
        },
        fullRefund: {
          eligible: true,
          note: 'Eligible: Full refund to original payment method within 7 business days.',
        },
        mealVoucher: {
          eligible: false,
          note: 'Ineligible: Delay compensation applies to active departure delays, not cancellations.',
        },
        loungeAccess: {
          eligible: false,
          note: 'Ineligible: Delay compensation applies to flight delays over 3 hours.',
        },
        hotelAccommodation: {
          eligible: false,
          note: 'Ineligible: Hotel accommodation applies to delays over 5 hours.',
        },
        priorityRebooking: {
          eligible: true,
          note: 'Gold Tier: Priority rebooking on next available flights (no additional compensation beyond standard policy).',
        },
        fareDifferenceWaiverLimit: 1500,
      };
    }

    if (customer.id === 'arvind') {
      // SK-118 Delayed 4 hours (07:10 -> 11:10)
      return {
        freeRebookingWithin24h: {
          eligible: false,
          note: 'Ineligible: Flight is delayed 4 hours, not cancelled.',
        },
        fullRefund: {
          eligible: false,
          note: 'Ineligible: Full refund rule applies to airline-caused cancellations.',
        },
        mealVoucher: {
          eligible: true,
          note: 'Eligible: Delay exceeds 3 hours (meal voucher authorized).',
        },
        loungeAccess: {
          eligible: true,
          note: 'Eligible: Delay exceeds 3 hours (departure lounge access authorized).',
        },
        hotelAccommodation: {
          eligible: false,
          note: 'Ineligible: Hotel accommodation requires delay over 5 hours. Delay of 4 hours does not qualify.',
        },
        priorityRebooking: {
          eligible: false,
          note: 'Silver Tier: Standard priority.',
        },
        fareDifferenceWaiverLimit: 1500,
      };
    }

    if (customer.id === 'meher') {
      // SK-305 Delayed 6 hours (14:00 -> 20:00)
      return {
        freeRebookingWithin24h: {
          eligible: false,
          note: 'Ineligible: Flight is delayed 6 hours, not cancelled.',
        },
        fullRefund: {
          eligible: false,
          note: 'Ineligible: Standard cancellation refund rule applies to cancellations.',
        },
        mealVoucher: {
          eligible: true,
          note: 'Eligible: Delay exceeds 5 hours (meal voucher authorized).',
        },
        loungeAccess: {
          eligible: true,
          note: 'Eligible: Delay exceeds 5 hours (departure lounge access authorized).',
        },
        hotelAccommodation: {
          eligible: true,
          note: 'Eligible: Delay exceeds 5 hours. Covers delayed hours only (14:00 to 20:00), NOT a full night.',
        },
        priorityRebooking: {
          eligible: true,
          note: 'Platinum Tier: Priority rebooking on next available flights (no additional compensation beyond standard policy).',
        },
        fareDifferenceWaiverLimit: 1500,
      };
    }

    throw new Error(`Unknown customer ID: ${customer.id}`);
  }

  /**
   * Deterministic guardrail evaluation of customer message against supplied data & policies.
   */
  public static evaluateMessage(
    customer: CustomerProfile,
    message: string,
    history: Array<{ role: string; text: string }> = []
  ): GuardrailEvaluation {
    const text = message.toLowerCase().trim();
    const eligibility = this.getEligibility(customer);

    // Build base sources from supplied data pack
    const bookingData: Array<{ label: string; value: string }> = [
      { label: 'Customer', value: `${customer.name} (${customer.loyaltyTier} Tier)` },
      { label: 'Booking Reference (PNR)', value: customer.bookingReference },
      { label: 'Disruption', value: customer.disruptionSummary },
    ];

    customer.flights.forEach((f) => {
      bookingData.push({
        label: `Flight ${f.flightNumber} (${f.route})`,
        value: `${f.date}, Scheduled ${f.scheduledDeparture}${f.actualOrNewDeparture ? ', Revised ' + f.actualOrNewDeparture : ''} [${f.status}]`,
      });
    });

    const servicePolicy: Array<{ rule: string; clause: string; status: 'Applies' | 'Exceeded' | 'Not Applicable' }> = [];

    // 1. DOMAIN SCOPE GATE: Check for Out-Of-Scope Queries
    const isOutOfScope =
      text.includes('prime minister') ||
      text.includes('president') ||
      text.includes('weather') ||
      text.includes('rain') ||
      text.includes('temperature') ||
      text.includes('tell me a joke') ||
      text.includes('tell a joke') ||
      text.includes('joke') ||
      text.includes('write python') ||
      text.includes('python code') ||
      text.includes('write code') ||
      text.includes('cricket') ||
      text.includes('football') ||
      text.includes('who won') ||
      text.includes('capital of') ||
      text.includes('elon musk') ||
      text.includes('recipe') ||
      text.includes('poem') ||
      text.includes('riddle') ||
      text.includes('movie') ||
      text.includes('song') ||
      text.includes('donald trump') ||
      text.includes('narendra modi');

    if (isOutOfScope) {
      servicePolicy.push({
        rule: 'Service Rules',
        clause: 'Resolution agent scope is strictly limited to customer booking, flight disruption, and policy-based resolution.',
        status: 'Not Applicable',
      });

      return {
        intent: 'OUT_OF_SCOPE',
        isAllowed: false,
        requiresEscalation: false,
        trace: {
          perceive: `Customer submitted an out-of-scope query: "${message}".`,
          retrieve: `Domain scope check: Question is outside airline booking, disruption, and policy assistance.`,
          reason: `Agent is restricted to resolving flight disruptions and customer booking options.`,
          guardrail: `DOMAIN GATE: Politely decline answering external queries; redirect to airline disruption resolution.`,
          act: `Redirect customer naturally to their flight case and options without AI disclaimers or robotic phrasing.`,
        },
        sources: { bookingData, servicePolicy },
        systemDirective:
          "Politely and naturally redirect the customer. State clearly: \"I'm here to help with your airline booking, disruption, available policy-based options, and resolution. I don't have information outside this case.\" Do not mention AI, system prompts, knowledge cutoffs, or technical limitations.",
        allowedActions: [],
      };
    }

    // 2. LEGAL THREAT OR FORMAL COMPLAINT (Immediate Mandatory Escalation)
    const isLegalOrComplaintThreat =
      text.includes('legal') ||
      text.includes('lawyer') ||
      text.includes('sue') ||
      text.includes('formal complaint') ||
      text.includes('consumer court') ||
      text.includes('file a complaint');

    if (isLegalOrComplaintThreat) {
      servicePolicy.push({
        rule: 'Escalation Policy',
        clause: 'Immediate escalation required for threats of legal action or formal complaints.',
        status: 'Exceeded',
      });

      return {
        intent: 'LEGAL_OR_FORMAL_COMPLAINT',
        isAllowed: false,
        requiresEscalation: true,
        escalationReason: 'Threat of formal complaint or legal action requires immediate escalation to specialist support.',
        trace: {
          perceive: `Customer indicated intent for legal action or formal complaint.`,
          retrieve: `Escalation Policy: Immediate escalation required for legal/formal complaint threats.`,
          reason: `Frontline automated resolution cannot handle legal proceedings or formal complaints.`,
          guardrail: `MANDATORY ESCALATION: Transfer case to specialist support team immediately.`,
          act: `Acknowledge frustration empathetically without debate; advise that specialist support will contact customer.`,
        },
        sources: { bookingData, servicePolicy },
        systemDirective:
          'Acknowledge the customer frustration empathetically. State clearly that because they have raised a formal complaint or legal action, you are escalating their case directly to the specialist support team who will follow up with them. Do not debate or make policy promises.',
        allowedActions: ['escalate_specialist'],
      };
    }

    // Check if the case has an active escalation in conversation history
    const hasRecentEscalation = history.some(
      (h) =>
        h.role === 'agent' &&
        (h.text.toLowerCase().includes('escalat') ||
          h.text.toLowerCase().includes('supervisor') ||
          h.text.toLowerCase().includes('ticket #esc') ||
          h.text.toLowerCase().includes('ref: esc') ||
          h.text.toLowerCase().includes('supervisor escalation'))
    );

    // 3. POST-ESCALATION STATUS QUERY ("what happens now?", "what are you doing?", "what next?", "status")
    const isPostEscalationQuery =
      hasRecentEscalation &&
      (text.includes('what happens now') ||
        text.includes('what are you doing') ||
        text.includes('what next') ||
        text.includes('what will happen') ||
        text.includes('how long') ||
        text.includes('when will i hear') ||
        text.includes('status of escalation') ||
        text.includes('did you escalate') ||
        text.includes('what will the supervisor do'));

    if (isPostEscalationQuery) {
      servicePolicy.push({
        rule: 'Escalation Policy',
        clause: 'Supervisor escalation logged. Case is actively under priority managerial review.',
        status: 'Applies',
      });

      return {
        intent: 'POST_ESCALATION_STATUS',
        isAllowed: true,
        requiresEscalation: false,
        trace: {
          perceive: `Customer inquired about escalation status and next steps.`,
          retrieve: `Escalation Policy: Priority review assigned to Operations Supervisor.`,
          reason: `Customer needs confirmation that the escalation is active and clear guidance on next steps.`,
          guardrail: `Clarify escalation workflow and remind customer of immediate active entitlements.`,
          act: `Explain that the supervisor is reviewing their file and will follow up; confirm current amenities remain valid.`,
        },
        sources: { bookingData, servicePolicy },
        systemDirective:
          `Reassure ${customer.name} that their escalation is actively logged with the Duty Supervisor for review. Explain that the supervisor will review their booking and follow up directly. Remind them of their active confirmed flight status and eligible amenities that remain ready for use.`,
        allowedActions: [],
      };
    }

    // 4. AGENT ROLE / WHAT CAN YOU DO QUERY
    const isAgentRoleQuery =
      text.includes('what are you doing') ||
      text.includes('what can you do') ||
      text.includes('how can you help') ||
      text.includes("what's your role") ||
      text.includes('what is your role') ||
      text.includes('who are you');

    if (isAgentRoleQuery) {
      servicePolicy.push({
        rule: 'Service Rules',
        clause: 'Agent resolves airline disruptions using supplied booking data and policy entitlements.',
        status: 'Applies',
      });

      return {
        intent: 'INQUIRE_AGENT_ROLE',
        isAllowed: true,
        requiresEscalation: false,
        trace: {
          perceive: `Customer inquired about agent role and capabilities.`,
          retrieve: `Operational purpose: Disruption resolution, eligibility explanation, and policy action execution.`,
          reason: `Customer needs clear understanding of agent authority and available options.`,
          guardrail: `Answer naturally without technical jargon, AI mentions, or implementation details.`,
          act: `Explain role: assist with flight status, disruption options, eligibility, authorized actions, and escalations.`,
        },
        sources: { bookingData, servicePolicy },
        systemDirective:
          "Explain your role naturally: \"I'm here to help resolve your current airline disruption using the booking information and service policies available for your case. I can explain your options, check what you're eligible for, initiate allowed actions, and escalate requests that require human approval.\"",
        allowedActions: [],
      };
    }

    // 4. UNKNOWN INFORMATION: BAGGAGE QUERY
    const isBaggageQuery =
      text.includes('baggage') ||
      text.includes('luggage') ||
      text.includes('bags') ||
      text.includes('suitcase');

    if (isBaggageQuery) {
      servicePolicy.push({
        rule: 'Service Rules',
        clause: 'No baggage tracking, belt numbers, or baggage location data exist in the supplied booking data.',
        status: 'Not Applicable',
      });

      return {
        intent: 'UNKNOWN_BAGGAGE_INFO',
        isAllowed: false,
        requiresEscalation: false,
        isInformationUnavailable: true,
        trace: {
          perceive: `Customer asked about baggage status or location.`,
          retrieve: `Supplied Booking Data: PNR ${customer.bookingReference}. Baggage records not included.`,
          reason: `Baggage location, belt numbers, and airport baggage handling are absent from supplied data.`,
          guardrail: `SOURCE-OF-TRUTH RULE: Do not guess, infer, or fabricate terminal/belt numbers. State information is unavailable.`,
          act: `State clearly: "I don't have that information in the supplied booking data." Offer help with available flight options.`,
        },
        sources: { bookingData, servicePolicy },
        systemDirective:
          "State clearly: \"I don't have baggage information in the supplied booking data. I can help with the flight status, disruption options, eligibility, policy-based actions, or escalation available for this booking.\"",
        allowedActions: [],
      };
    }

    // 5. UNKNOWN INFORMATION: REFUND AMOUNT / TICKET PRICE QUERY
    const isRefundAmountQuery =
      (text.includes('how much') && (text.includes('refund') || text.includes('get back') || text.includes('money') || text.includes('fare'))) ||
      text.includes('refund amount') ||
      text.includes('ticket price') ||
      text.includes('cost of my ticket');

    if (isRefundAmountQuery) {
      servicePolicy.push({
        rule: 'Refund Rule',
        clause: 'Airline-caused cancellation: Full refund processed within 7 business days to original payment method.',
        status: 'Applies',
      });

      return {
        intent: 'UNKNOWN_REFUND_AMOUNT',
        isAllowed: true,
        requiresEscalation: false,
        isInformationUnavailable: true,
        trace: {
          perceive: `Customer asking for specific monetary refund amount or ticket price.`,
          retrieve: `Supplied Booking Data: Ticket price / fare amount is not provided in data pack.`,
          reason: `Exact monetary ticket price is not in supplied data. Policy confirms 100% full refund entitlement.`,
          guardrail: `SOURCE-OF-TRUTH RULE: Do NOT fabricate a specific refund amount (e.g. ₹14,500). Explain full refund policy.`,
          act: `Inform customer that ticket price is not in supplied data, but confirms 100% refund to original method within 7 days.`,
        },
        sources: { bookingData, servicePolicy },
        systemDirective:
          'State clearly that the supplied data does not include their ticket price or a specific refund amount. Confirm that an airline-caused cancellation qualifies for a full refund to their original payment method within 7 business days.',
        allowedActions: customer.id === 'priya' ? ['refund_full'] : [],
      };
    }

    // 6. UNKNOWN INFORMATION: HOTEL SPECIFICS (HOTEL NAME, ADDRESS, ROOM TYPE)
    const isHotelDetailsQuery =
      (text.includes('which hotel') || text.includes('what hotel') || text.includes('hotel name') || text.includes('hotel address')) &&
      !text.includes('can i get') &&
      !text.includes('eligible');

    if (isHotelDetailsQuery) {
      servicePolicy.push({
        rule: 'Delay Rule (Over 5 Hours)',
        clause: 'Delay over 5 hours: Hotel accommodation covering delayed hours only (not a full night). Specific hotel name not in data.',
        status: 'Applies',
      });

      return {
        intent: 'UNKNOWN_HOTEL_DETAILS',
        isAllowed: true,
        requiresEscalation: false,
        isInformationUnavailable: true,
        trace: {
          perceive: `Customer asked for specific hotel name, address, or room assignment.`,
          retrieve: `Supplied Data: Hotel property names and addresses are not specified in data pack.`,
          reason: `Policy grants hotel accommodation for delayed hours, but specific facility details are not in data.`,
          guardrail: `SOURCE-OF-TRUTH RULE: Do not fabricate hotel names or room types. State clearly details are unavailable.`,
          act: `Explain that hotel name/property is not in supplied data, but confirm eligibility for accommodation covering delayed hours.`,
        },
        sources: { bookingData, servicePolicy },
        systemDirective:
          "State clearly: \"I don't have a hotel name or property assignment in the supplied data. I can confirm that your delay qualifies for hotel accommodation covering the delayed hours only.\"",
        allowedActions: customer.id === 'meher' ? ['arrange_hotel_delayed_hours'] : [],
      };
    }

    // 7. UNKNOWN INFORMATION: DELAY REASON QUERY (For Arvind or Meher)
    const isDelayReasonQuery =
      (text.includes('why') && (text.includes('delayed') || text.includes('delay'))) ||
      text.includes('reason for delay') ||
      text.includes('cause of delay');

    if (isDelayReasonQuery && (customer.id === 'arvind' || customer.id === 'meher')) {
      const flightNum = customer.id === 'arvind' ? 'SK-118' : 'SK-305';
      const delayHrs = customer.id === 'arvind' ? '4' : '6';
      const newTime = customer.id === 'arvind' ? '11:10' : '20:00';
      const amenities = customer.id === 'arvind'
        ? 'a complimentary meal voucher and departure lounge access'
        : 'a meal voucher, lounge access, and hotel accommodation covering the delayed hours';

      servicePolicy.push({
        rule: 'Service Rules',
        clause: `Booking data records flight ${flightNum} delayed by ${delayHrs} hours. Specific disruption cause is not specified in data pack.`,
        status: 'Not Applicable',
      });

      return {
        intent: 'UNKNOWN_DELAY_CAUSE',
        isAllowed: true,
        requiresEscalation: false,
        isInformationUnavailable: true,
        trace: {
          perceive: `Customer asked for the root cause of flight ${flightNum} delay.`,
          retrieve: `Supplied Booking Data: Flight ${flightNum} is recorded as delayed ${delayHrs} hours, but cause is omitted.`,
          reason: `Data pack does not state operational or weather reason for this flight delay.`,
          guardrail: `SOURCE-OF-TRUTH RULE: Do not guess or invent a delay reason (e.g. weather, crew shortage). State factually.`,
          act: `Clarify that supplied data does not specify the delay reason; confirm revised time and eligible amenities.`,
        },
        sources: { bookingData, servicePolicy },
        systemDirective:
          `Inform the customer that the supplied booking data does not specify the cause for the delay on flight ${flightNum}. Confirm the ${delayHrs}-hour delay with revised departure at ${newTime}, and present their eligible amenities: ${amenities}.`,
        allowedActions: customer.id === 'arvind'
          ? ['issue_meal_voucher', 'issue_lounge_access']
          : ['issue_meal_voucher', 'issue_lounge_access', 'arrange_hotel_delayed_hours'],
      };
    }

    // 8. UNIVERSAL SUPERVISOR REQUEST
    const isSupervisorRequest =
      text.includes('supervisor') ||
      text.includes('manager') ||
      text.includes('duty manager') ||
      text.includes('speak to human') ||
      text.includes('speak with human') ||
      text.includes('talk to human') ||
      text.includes('escalate');

    if (isSupervisorRequest) {
      servicePolicy.push({
        rule: 'Escalation Policy',
        clause: 'Customer requests for supervisor review or human intervention must be escalated.',
        status: 'Applies',
      });

      return {
        intent: 'ESCALATE_TO_SUPERVISOR',
        isAllowed: true,
        requiresEscalation: true,
        escalationReason: 'Customer explicitly requested escalation to a supervisor.',
        trace: {
          perceive: `Customer requested escalation to a supervisor or human manager.`,
          retrieve: `Escalation Policy: Managerial escalation permitted upon customer request.`,
          reason: `Customer seeks human supervisor intervention for their booking.`,
          guardrail: `ESCALATION: Create supervisor review request for booking ${customer.bookingReference}.`,
          act: `Acknowledge request and confirm escalation to an operations supervisor.`,
        },
        sources: { bookingData, servicePolicy },
        systemDirective:
          `Acknowledge ${customer.name}'s request for supervisor review. Confirm that you are escalating their case to an operations supervisor who will review the booking and assist.`,
        allowedActions: ['escalate_supervisor'],
      };
    }

    // Check recent history context for short responses like "how long does that take?", "can you do that now?", "why?"
    const recentHistoryText = history.slice(-4).map((h) => h.text.toLowerCase()).join(' ');

    const isAckOrThanks =
      /^(done|ok|okay|thanks|thank you|got it|fine|alright|cool|perfect|good|understood|bye|ty|k|noted)\b/i.test(text) ||
      text === 'done' ||
      text === 'ok' ||
      text === 'okay' ||
      text === 'thanks' ||
      text === 'thank you';

    const isExecuteAction =
      text.includes('can you do that now') ||
      text.includes('can you do that') ||
      text.includes('do it now') ||
      text.includes('do it') ||
      text.includes('please do') ||
      text.includes('confirm now') ||
      text.includes('proceed') ||
      text.includes('go ahead') ||
      text.includes('process it') ||
      text.includes('process refund') ||
      text.includes('process the refund') ||
      text.includes('process full refund') ||
      text.includes('refund it now') ||
      text.includes('refund now') ||
      text.includes('book it now') ||
      text.includes('rebook now') ||
      text.includes('rebook me') ||
      text.includes('issue my') ||
      text.includes('issue lounge') ||
      text.includes('issue meal voucher') ||
      text.includes('issue now') ||
      text.includes('give me my lounge') ||
      text.includes('reserve room') ||
      text.includes('reserve hotel') ||
      text.includes('reserve now') ||
      text.includes('yes please') ||
      text === 'yes' ||
      text === 'confirm' ||
      text === 'please';

    const isTimelineQuery =
      text.includes('how long') ||
      text.includes('when will') ||
      text.includes('how many days') ||
      text.includes('processing time') ||
      text.includes('timeline');

    // ------------------------------------------------------------------------
    // CUSTOMER 1: PRIYA NAIR (Gold Tier, SK-204 Cancelled, Return Unaffected)
    // ------------------------------------------------------------------------
    if (customer.id === 'priya') {
      const mentionsUpgrade =
        text.includes('upgrade') ||
        text.includes('business class') ||
        text.includes('business');

      const mentionsReturn =
        text.includes('return') ||
        text.includes('25 sep') ||
        text.includes('goa to delhi');

      const mentionsRefund =
        text.includes('refund') ||
        text.includes('money back') ||
        text.includes('cash');

      const mentionsRebook =
        text.includes('rebook') ||
        text.includes('next flight') ||
        text.includes('another flight') ||
        text.includes('different flight') ||
        text.includes('new flight');

      const mentionsWhy =
        text.includes('why cannot you upgrade') ||
        text.includes("why can't you upgrade") ||
        text.includes('why not') ||
        text.includes('why');

      const mentionsMeal =
        text.includes('meal') ||
        text.includes('food') ||
        text.includes('voucher') ||
        text.includes('eat') ||
        text.includes('lunch') ||
        text.includes('dinner') ||
        text.includes('snack');

      const mentionsLounge =
        text.includes('lounge') ||
        text.includes('departure lounge');

      const mentionsHotel =
        text.includes('hotel') ||
        text.includes('room') ||
        text.includes('stay') ||
        text.includes('accommodation');

      // Acknowledgment / Closing
      if (isAckOrThanks) {
        servicePolicy.push({
          rule: 'Service Rules',
          clause: 'Courteous acknowledgment of customer confirmation while maintaining verified booking state.',
          status: 'Applies',
        });
        return {
          intent: 'ACKNOWLEDGMENT_OR_THANKS',
          isAllowed: true,
          requiresEscalation: false,
          trace: {
            perceive: `Customer acknowledged options or expressed thanks.`,
            retrieve: `Booking SK4821X: Cancelled SK-204. Options available: free rebooking within 24h OR full refund.`,
            reason: `Customer acknowledged message. Keep response polite and concise.`,
            guardrail: `Do not repeat full profile or canned introduction.`,
            act: `Acknowledge politely and confirm readiness to execute their chosen option.`,
          },
          sources: { bookingData, servicePolicy },
          systemDirective:
            'Acknowledge Priya Nair politely. Remind her briefly that she can choose between free rebooking on the next available flight within 24 hours or a full refund, and offer to proceed whenever she is ready.',
          allowedActions: ['refund_full', 'rebook_free'],
        };
      }

      // "Why can't you upgrade me?" / "Why not?" (After upgrade discussion)
      if (mentionsWhy && (mentionsUpgrade || recentHistoryText.includes('upgrade') || recentHistoryText.includes('business'))) {
        servicePolicy.push({
          rule: 'Loyalty Tier Rule',
          clause: 'Gold members receive priority rebooking on disrupted flights only, and no additional compensation beyond standard policy.',
          status: 'Exceeded',
        });
        servicePolicy.push({
          rule: 'Service Rules',
          clause: 'Disruption remedies apply exclusively to the disrupted sector. Unaffected return flight operates as scheduled in original cabin.',
          status: 'Exceeded',
        });

        return {
          intent: 'EXPLAIN_UPGRADE_RESTRICTION',
          isAllowed: false,
          requiresEscalation: false,
          trace: {
            perceive: `Customer asks why a complimentary business upgrade on the return flight cannot be provided.`,
            retrieve: `Policy: Loyalty Tier Rule & Service Rules. Disruption remedies apply only to disrupted sector.`,
            reason: `Return flight is unaffected and on schedule. Free cabin upgrades are not authorized for unaffected flights.`,
            guardrail: `EXPLAIN POLICY: Remedies apply to disrupted sector only. Offer supervisor escalation if customer insists.`,
            act: `Explain clearly that disruption remedies apply to the cancelled flight only; offer supervisor escalation if requested.`,
          },
          sources: { bookingData, servicePolicy },
          systemDirective:
            'Explain respectfully to Priya Nair that under airline service rules, disruption remedies apply strictly to the flight that experienced disruption (today\'s cancelled SK-204). Because her return flight from Goa on 25 September is operating normally and on schedule, frontline agents cannot provide a complimentary cabin upgrade without payment. Offer to escalate to a supervisor if she would like an exception reviewed.',
          allowedActions: ['rebook_free', 'refund_full', 'escalate_supervisor'],
        };
      }

      // Upgrade to Business Class Request
      if (mentionsUpgrade) {
        servicePolicy.push({
          rule: 'Loyalty Tier Rule',
          clause: 'Gold members receive priority rebooking; no additional compensation or complimentary cabin upgrades beyond standard policy.',
          status: 'Exceeded',
        });
        servicePolicy.push({
          rule: 'Cancellation Rule',
          clause: 'Entitled to free rebooking on next available flight within 24 hours OR full refund for SK-204.',
          status: 'Applies',
        });

        return {
          intent: 'REQUEST_BUSINESS_UPGRADE',
          isAllowed: false,
          requiresEscalation: false,
          trace: {
            perceive: `Customer requesting complimentary business class upgrade on return flight.`,
            retrieve: `Loyalty Tier Rule: Gold tier provides priority rebooking; no additional compensation beyond policy.`,
            reason: `Complimentary cabin upgrade on unaffected return flight is not authorized under policy.`,
            guardrail: `DENIAL WITH ALTERNATIVE: Free upgrade not authorized. Reiterate cancellation remedies (rebooking/refund).`,
            act: `Clarify that policy does not authorize free business class upgrades on unaffected flights; offer supervisor escalation if requested.`,
          },
          sources: { bookingData, servicePolicy },
          systemDirective:
            'Politely explain to Priya Nair that under our service policy, complimentary cabin upgrades on unaffected flights are not authorized. As a Gold member, she is entitled to priority rebooking on the next available flight within 24 hours or a full refund for her cancelled flight SK-204, but no additional compensation. Her return flight on 25 September remains confirmed in her booked cabin. Offer supervisor escalation if she insists.',
          allowedActions: ['rebook_free', 'refund_full', 'escalate_supervisor'],
        };
      }

      // Meal Voucher Inquiry (Ineligible for cancellations per Entitlement Matrix)
      if (mentionsMeal) {
        servicePolicy.push({
          rule: 'Delay Rule (Meal Voucher)',
          clause: 'Ineligible: Delay compensation applies to active departure delays, not cancellations.',
          status: 'Exceeded',
        });
        servicePolicy.push({
          rule: 'Cancellation Rule',
          clause: 'Eligible: Airline-caused cancellation allows free rebooking on next available flight within 24 hours OR 100% full cash refund.',
          status: 'Applies',
        });

        return {
          intent: 'INQUIRE_MEAL_VOUCHER_CANCELLED',
          isAllowed: false,
          requiresEscalation: false,
          trace: {
            perceive: `Customer inquiring about meal voucher / food for cancelled flight SK-204.`,
            retrieve: `Entitlement Matrix: Delay compensation applies to active departure delays, not cancellations.`,
            reason: `Flight SK-204 is cancelled, not delayed. Meal vouchers are ineligible for cancelled flights.`,
            guardrail: `EXPLAIN INELIGIBILITY: Meal vouchers apply to active departure delays, not cancellations. Reiterate rebooking/refund.`,
            act: `Explain meal voucher ineligibility per policy; present free 24h rebooking and 100% refund options.`,
          },
          sources: { bookingData, servicePolicy },
          systemDirective:
            'Explain respectfully to Priya Nair that under our service policy, meal vouchers apply to active departure delays, not cancellations. For cancelled flight SK-204, she is eligible for free priority rebooking on the next available flight within 24 hours or a 100% full cash refund credited to her original payment method within 7 business days. Ask which resolution she prefers.',
          allowedActions: ['rebook_free', 'refund_full'],
        };
      }

      // Departure Lounge Access Inquiry (Ineligible for cancellations per Entitlement Matrix)
      if (mentionsLounge) {
        servicePolicy.push({
          rule: 'Delay Rule (Departure Lounge)',
          clause: 'Ineligible: Delay compensation applies to flight delays over 3 hours, not cancellations.',
          status: 'Exceeded',
        });
        servicePolicy.push({
          rule: 'Cancellation Rule',
          clause: 'Eligible: Airline-caused cancellation allows free rebooking on next available flight within 24 hours OR 100% full cash refund.',
          status: 'Applies',
        });

        return {
          intent: 'INQUIRE_LOUNGE_ACCESS_CANCELLED',
          isAllowed: false,
          requiresEscalation: false,
          trace: {
            perceive: `Customer inquiring about departure lounge access for cancelled flight SK-204.`,
            retrieve: `Entitlement Matrix: Delay compensation applies to flight delays over 3 hours, not cancellations.`,
            reason: `Flight SK-204 is cancelled, not delayed. Lounge access is ineligible.`,
            guardrail: `EXPLAIN INELIGIBILITY: Lounge access applies to delays >3 hours. Reiterate rebooking/refund.`,
            act: `Explain lounge access ineligibility per policy; present free 24h rebooking and 100% refund options.`,
          },
          sources: { bookingData, servicePolicy },
          systemDirective:
            'Explain respectfully to Priya Nair that under airline policy, departure lounge access applies to flight delays over 3 hours, not cancellations. For cancelled flight SK-204, she is eligible for free priority rebooking on the next available flight within 24 hours or a 100% full cash refund credited within 7 business days. Ask which resolution she prefers.',
          allowedActions: ['rebook_free', 'refund_full'],
        };
      }

      // Hotel Accommodation Inquiry (Ineligible for cancellations per Entitlement Matrix)
      if (mentionsHotel) {
        servicePolicy.push({
          rule: 'Delay Rule (Hotel Accommodation)',
          clause: 'Ineligible: Hotel accommodation applies to delays over 5 hours, not cancellations.',
          status: 'Exceeded',
        });
        servicePolicy.push({
          rule: 'Cancellation Rule',
          clause: 'Eligible: Airline-caused cancellation allows free rebooking on next available flight within 24 hours OR 100% full cash refund.',
          status: 'Applies',
        });

        return {
          intent: 'INQUIRE_HOTEL_CANCELLED',
          isAllowed: false,
          requiresEscalation: false,
          trace: {
            perceive: `Customer inquiring about hotel accommodation for cancelled flight SK-204.`,
            retrieve: `Entitlement Matrix: Hotel accommodation applies to delays over 5 hours, not cancellations.`,
            reason: `Flight SK-204 is cancelled, not delayed. Hotel accommodation is ineligible.`,
            guardrail: `EXPLAIN INELIGIBILITY: Hotel accommodation applies to delays >5 hours. Reiterate rebooking/refund.`,
            act: `Explain hotel accommodation ineligibility per policy; present free 24h rebooking and 100% refund options.`,
          },
          sources: { bookingData, servicePolicy },
          systemDirective:
            'Explain respectfully to Priya Nair that under airline service policy, hotel accommodation applies to flight delays over 5 hours, not cancellations. For cancelled flight SK-204, her eligible remedies are free priority rebooking on the next available flight within 24 hours or a 100% full cash refund credited within 7 business days. Ask which resolution she prefers.',
          allowedActions: ['rebook_free', 'refund_full'],
        };
      }

      // Return flight inquiry
      if (mentionsReturn) {
        servicePolicy.push({
          rule: 'Service Rules',
          clause: 'Return flight Goa → Delhi (Fri 25 Sep 2026, 16:20) is confirmed and unaffected.',
          status: 'Applies',
        });

        return {
          intent: 'INQUIRE_RETURN_FLIGHT',
          isAllowed: true,
          requiresEscalation: false,
          trace: {
            perceive: `Customer inquiring about status of return flight.`,
            retrieve: `Supplied Data: Return flight Goa to Delhi on Fri 25 Sep 2026, 16:20 is Unaffected.`,
            reason: `Cancellation applies strictly to outbound flight SK-204. Return flight is confirmed.`,
            guardrail: `ANSWER ONLY WHAT WAS ASKED: Confirm return flight status clearly without dumping unrelated data.`,
            act: `Confirm return flight on Friday 25 Sep at 16:20 is confirmed and unaffected.`,
          },
          sources: { bookingData, servicePolicy },
          systemDirective:
            'Inform Priya Nair directly that her return flight from Goa to Delhi on Friday 25 September 2026 at 16:20 is confirmed, unaffected, and on schedule.',
          allowedActions: ['rebook_free', 'refund_full'],
        };
      }

      // Timeline inquiry
      if (isTimelineQuery) {
        servicePolicy.push({
          rule: 'Refund Rule',
          clause: 'Full refunds for airline cancellations are processed within 7 business days to original payment method only.',
          status: 'Applies',
        });

        return {
          intent: 'INQUIRE_TIMELINE',
          isAllowed: true,
          requiresEscalation: false,
          trace: {
            perceive: `Customer asking how long the refund takes.`,
            retrieve: `Refund Rule: Processed within 7 business days to original payment method.`,
            reason: `Customer asked for timeline of refund.`,
            guardrail: `ANSWER ONLY WHAT WAS ASKED: State 7 business days timeline clearly. Do not repeat full profile.`,
            act: `Inform customer that full refund will be credited to original payment method within 7 business days.`,
          },
          sources: { bookingData, servicePolicy },
          systemDirective:
            'State clearly that full refunds for airline-cancelled flights are processed within 7 business days to the original payment method.',
          allowedActions: ['refund_full', 'rebook_free'],
        };
      }

      // "Can you do that now?" / Execute Action
      if (isExecuteAction) {
        // Determine whether customer was discussing refund or rebooking
        const prefersRefund =
          mentionsRefund ||
          recentHistoryText.includes('refund') ||
          recentHistoryText.includes('money back');
        const prefersRebook =
          mentionsRebook ||
          recentHistoryText.includes('rebook') ||
          recentHistoryText.includes('next flight');

        if (prefersRefund) {
          servicePolicy.push({
            rule: 'Refund Rule',
            clause: 'Full refund initiated for airline-caused cancellation, credited within 7 business days to original payment method.',
            status: 'Applies',
          });

          return {
            intent: 'EXECUTE_REFUND',
            isAllowed: true,
            requiresEscalation: false,
            trace: {
              perceive: `Customer confirmed request to process full refund.`,
              retrieve: `Booking SK4821X: Cancelled SK-204 qualifies for 100% full refund under Refund Rule.`,
              reason: `Disruption is airline-caused. Customer chose full refund.`,
              guardrail: `CONFIRM ACTION: Process full refund to original payment method within 7 business days.`,
              act: `Confirm full refund request has been initiated to original payment method within 7 business days.`,
            },
            sources: { bookingData, servicePolicy },
            systemDirective:
              'Confirm to Priya Nair that you have initiated her full refund for cancelled flight SK-204. It will be credited to her original payment method within 7 business days. Reassure her that her return flight on 25 September remains confirmed.',
            allowedActions: ['refund_full'],
          };
        }

        if (prefersRebook) {
          servicePolicy.push({
            rule: 'Cancellation Rule',
            clause: 'Free rebooking on next available flight within 24 hours confirmed at no extra charge.',
            status: 'Applies',
          });

          return {
            intent: 'EXECUTE_REBOOKING',
            isAllowed: true,
            requiresEscalation: false,
            trace: {
              perceive: `Customer confirmed request to rebook on next available flight.`,
              retrieve: `Booking SK4821X: Cancelled SK-204 qualifies for free rebooking within 24 hours. Gold priority seating.`,
              reason: `Disruption is airline-caused. Customer chose rebooking.`,
              guardrail: `CONFIRM ACTION: Confirm rebooking on next available flight within 24 hours at no charge.`,
              act: `Confirm priority rebooking on the next available flight within 24 hours at no charge.`,
            },
            sources: { bookingData, servicePolicy },
            systemDirective:
              'Confirm to Priya Nair that she has been rebooked on the next available flight within 24 hours at no additional charge with Gold priority rebooking. Remind her that her return flight on 25 September remains confirmed.',
            allowedActions: ['rebook_free'],
          };
        }

        // If not specified, ask which one she prefers
        servicePolicy.push({
          rule: 'Cancellation Rule',
          clause: 'Customer may choose free rebooking on next available flight within 24 hours OR full refund.',
          status: 'Applies',
        });

        return {
          intent: 'PROMPT_CHOICE',
          isAllowed: true,
          requiresEscalation: false,
          trace: {
            perceive: `Customer requested execution without specifying refund or rebooking.`,
            retrieve: `Booking SK4821X: Cancelled SK-204. Eligible for free 24h rebooking OR full refund.`,
            reason: `Customer needs to specify whether they prefer rebooking or full refund.`,
            guardrail: `Clarify customer preference concisely.`,
            act: `Ask customer whether she would like the free rebooking on the next available flight or the full refund.`,
          },
          sources: { bookingData, servicePolicy },
          systemDirective:
            'Ask Priya Nair whether she would prefer to proceed with the free rebooking on the next available flight within 24 hours or the full refund processed within 7 business days to her original payment method.',
          allowedActions: ['rebook_free', 'refund_full'],
        };
      }

      // Explicit refund inquiry / request
      if (mentionsRefund) {
        servicePolicy.push({
          rule: 'Refund Rule',
          clause: 'Full refund processed within 7 business days to original payment method only.',
          status: 'Applies',
        });

        return {
          intent: 'REQUEST_REFUND',
          isAllowed: true,
          requiresEscalation: false,
          trace: {
            perceive: `Customer inquired about / requested refund for cancelled flight SK-204.`,
            retrieve: `Refund Rule: Airline cancellation qualifies for full refund within 7 business days to original payment method.`,
            reason: `Flight SK-204 cancelled due to operational reasons. Full refund authorized.`,
            guardrail: `Credit to original payment method only. Timeline: 7 business days. Zero cancellation fee.`,
            act: `Confirm full refund entitlement to original payment method within 7 business days. Ask if she wants it processed.`,
          },
          sources: { bookingData, servicePolicy },
          systemDirective:
            'Confirm to Priya Nair that because flight SK-204 was cancelled due to operational reasons, she is entitled to a full refund credited to her original payment method within 7 business days. Ask if she would like you to process this refund now.',
          allowedActions: ['refund_full', 'rebook_free'],
        };
      }

      // Explicit rebooking inquiry / request
      if (mentionsRebook) {
        servicePolicy.push({
          rule: 'Cancellation Rule',
          clause: 'Free rebooking on next available flight within 24 hours at no extra charge.',
          status: 'Applies',
        });
        servicePolicy.push({
          rule: 'Loyalty Tier Rule',
          clause: 'Gold tier members receive priority rebooking.',
          status: 'Applies',
        });

        return {
          intent: 'REQUEST_REBOOKING',
          isAllowed: true,
          requiresEscalation: false,
          trace: {
            perceive: `Customer inquiring about rebooking options.`,
            retrieve: `Cancellation Rule & Loyalty Tier: Free rebooking on next available flight within 24 hours with Gold priority.`,
            reason: `Airline-caused cancellation entitles customer to free rebooking within 24h.`,
            guardrail: `No rebooking fees or fare difference for next available flight within 24 hours.`,
            act: `Offer free rebooking on next available flight within 24 hours with Gold priority seating.`,
          },
          sources: { bookingData, servicePolicy },
          systemDirective:
            'Inform Priya Nair that as a Gold member, she is entitled to complimentary priority rebooking on the next available flight within 24 hours at no additional charge. Ask if she would like you to confirm this rebooking.',
          allowedActions: ['rebook_free', 'refund_full'],
        };
      }

      // General cancellation options / options query / frustration
      servicePolicy.push({
        rule: 'Cancellation Rule',
        clause: 'If cancelled by airline: Free rebooking on next available flight within 24 hours OR full refund (customer chooses).',
        status: 'Applies',
      });
      servicePolicy.push({
        rule: 'Loyalty Tier Rule',
        clause: 'Gold tier: Priority rebooking; no additional compensation beyond standard policy.',
        status: 'Applies',
      });

      return {
        intent: 'INQUIRE_CANCELLATION_OPTIONS',
        isAllowed: true,
        requiresEscalation: false,
        trace: {
          perceive: `Customer asking about options for cancelled flight SK-204.`,
          retrieve: `Supplied Data: SK-204 Delhi → Goa cancelled (operational reasons). Gold Tier. Return on 25 Sep unaffected.`,
          reason: `Disruption is airline-caused. Entitled to choose between free rebooking within 24h or full refund.`,
          guardrail: `OPTIONS RESTRICTED TO POLICY: 1) Free rebooking on next available flight within 24h, or 2) Full refund.`,
          act: `Present the two authorized options clearly and with empathy; mention return flight is confirmed.`,
        },
        sources: { bookingData, servicePolicy },
        systemDirective:
          'Acknowledge the cancellation of flight SK-204 from Delhi to Goa with empathy. Explain clearly that as a Gold member, she has two options: 1) Free priority rebooking on the next available flight within 24 hours, or 2) A full refund processed within 7 business days to her original payment method. Note that her return flight on 25 September is confirmed and unaffected. Ask which resolution she would prefer.',
        allowedActions: ['rebook_free', 'refund_full'],
      };
    }

    // ------------------------------------------------------------------------
    // CUSTOMER 2: ARVIND KULKARNI (Silver Tier, SK-118 Delayed 4h)
    // ------------------------------------------------------------------------
    if (customer.id === 'arvind') {
      const mentionsHotel =
        text.includes('hotel') ||
        text.includes('room') ||
        text.includes('stay') ||
        text.includes('accommodation');

      const mentionsWhy =
        text.includes('why not') ||
        text.includes("why can't") ||
        text.includes('why cannot') ||
        text.includes('why isn') ||
        text === 'why';

      const mentionsVouchersOrLounge =
        text.includes('lounge') ||
        text.includes('voucher') ||
        text.includes('meal') ||
        text.includes('food') ||
        text.includes('compensation') ||
        text.includes('entitled');

      const mentionsAnger =
        text.includes('angry') ||
        text.includes('furious') ||
        text.includes('frustrated') ||
        text.includes('unacceptable') ||
        text.includes('meeting');

      const mentionsRefund =
        text.includes('refund') ||
        text.includes('money back') ||
        text.includes('cash');

      const mentionsRebook =
        text.includes('rebook') ||
        text.includes('free rebook') ||
        text.includes('next flight');

      // Acknowledgment / Closing
      if (isAckOrThanks) {
        servicePolicy.push({
          rule: 'Service Rules',
          clause: 'Courteous acknowledgment of customer confirmation while maintaining verified booking state.',
          status: 'Applies',
        });
        return {
          intent: 'ACKNOWLEDGMENT_OR_THANKS',
          isAllowed: true,
          requiresEscalation: false,
          trace: {
            perceive: `Customer acknowledged delay arrangements or expressed thanks.`,
            retrieve: `Booking TR1190B: Delayed SK-118 (11:10 departure). Meal voucher and lounge access available.`,
            reason: `Customer acknowledged message. Keep response polite and concise.`,
            guardrail: `Do not repeat full profile. Confirm active amenities.`,
            act: `Acknowledge courteously and remind of revised departure at 11:10.`,
          },
          sources: { bookingData, servicePolicy },
          systemDirective:
            'Acknowledge Arvind Kulkarni courteously. Remind him of his revised departure at 11:10, and confirm his meal voucher and departure lounge access are ready for use.',
          allowedActions: ['issue_meal_voucher', 'issue_lounge_access'],
        };
      }

      // "Why not?" / Why can't I get a hotel?
      if (mentionsWhy && (mentionsHotel || recentHistoryText.includes('hotel'))) {
        servicePolicy.push({
          rule: 'Delay Rule (Over 5 Hours)',
          clause: 'Hotel accommodation strictly requires a flight delay exceeding 5 hours.',
          status: 'Exceeded',
        });
        servicePolicy.push({
          rule: 'Delay Rule (3 to 5 Hours)',
          clause: 'Delay over 3 hours qualifies for complimentary meal voucher and departure lounge access.',
          status: 'Applies',
        });

        return {
          intent: 'EXPLAIN_HOTEL_INELIGIBILITY',
          isAllowed: false,
          requiresEscalation: false,
          trace: {
            perceive: `Customer asking why hotel accommodation is not provided for a 4-hour delay.`,
            retrieve: `Policy: Delay Rule. Hotel coverage requires delay > 5 hours. Flight SK-118 is delayed 4 hours.`,
            reason: `Delay is 4 hours, which does not meet the >5 hour threshold for hotel accommodation.`,
            guardrail: `EXPLAIN POLICY THRESHOLD: Delays under 5 hours do not qualify for hotel. Meal voucher + lounge apply.`,
            act: `Explain that hotel coverage begins only when a delay exceeds 5 hours; offer meal voucher and lounge access.`,
          },
          sources: { bookingData, servicePolicy },
          systemDirective:
            'Explain respectfully to Arvind Kulkarni that under airline service policy, hotel accommodation is authorized strictly when a flight delay exceeds 5 hours. Because flight SK-118 is delayed by 4 hours, it does not meet the requirement for hotel coverage. However, he is entitled to a complimentary meal voucher and departure lounge access at the airport.',
          allowedActions: ['issue_meal_voucher', 'issue_lounge_access'],
        };
      }

      // Hotel Request for 4h delay
      if (mentionsHotel) {
        servicePolicy.push({
          rule: 'Delay Rule (Over 5 Hours)',
          clause: 'Hotel accommodation is authorized only for flight delays exceeding 5 hours. 4-hour delay does not qualify.',
          status: 'Exceeded',
        });
        servicePolicy.push({
          rule: 'Delay Rule (3 to 5 Hours)',
          clause: 'Delay over 3 hours qualifies for complimentary meal voucher and departure lounge access.',
          status: 'Applies',
        });

        if (hasRecentEscalation) {
          return {
            intent: 'REQUEST_HOTEL_AFTER_ESCALATION',
            isAllowed: false,
            requiresEscalation: false,
            trace: {
              perceive: `Customer asked about hotel accommodation after case was already escalated to supervisor.`,
              retrieve: `Escalation Status: Hotel request logged with Duty Supervisor (Ticket #ESC-8119).`,
              reason: `Customer is awaiting supervisor review; frontline agent cannot approve hotel for 4-hour delay.`,
              guardrail: `Acknowledge pending escalation; reiterate policy limit of >5 hours while confirming active lounge and meal vouchers.`,
              act: `Confirm hotel request is under supervisor review; remind of ready-to-use meal voucher and lounge access.`,
            },
            sources: { bookingData, servicePolicy },
            systemDirective:
              'Remind Arvind Kulkarni that his hotel exception request has already been logged with the Duty Supervisor for review. While the supervisor reviews his case, confirm that standard airline policy grants hotel only for delays > 5 hours, and reassure him that his meal voucher and departure lounge access at Mumbai airport are active and available.',
            allowedActions: ['issue_meal_voucher', 'issue_lounge_access'],
          };
        }

        return {
          intent: 'REQUEST_HOTEL_4H_DELAY',
          isAllowed: false,
          requiresEscalation: false,
          trace: {
            perceive: `Customer requesting hotel accommodation for a 4-hour delay on flight SK-118.`,
            retrieve: `Flight SK-118: Delayed 4h (07:10 → 11:10). Policy: Hotel accommodation requires delay > 5 hours.`,
            reason: `Delay is 4 hours, which does not meet the >5 hours threshold for hotel accommodation.`,
            guardrail: `DENIAL WITH POLICY ALTERNATIVE: Deny hotel per Delay Rule. Offer meal voucher + lounge access.`,
            act: `Politely clarify 5-hour threshold for hotel; offer meal voucher and departure lounge access.`,
          },
          sources: { bookingData, servicePolicy },
          systemDirective:
            'Inform Arvind Kulkarni that hotel accommodation is not eligible for this flight. Under airline policy, hotel accommodation requires a flight delay exceeding 5 hours. Because flight SK-118 is delayed by 4 hours, he is entitled to a complimentary meal voucher and departure lounge access at Mumbai airport. Offer to issue these amenities.',
          allowedActions: ['issue_meal_voucher', 'issue_lounge_access'],
        };
      }

      // Refund Request (Ineligible for delays per Entitlement Matrix)
      if (mentionsRefund) {
        servicePolicy.push({
          rule: 'Refund Rule',
          clause: 'Ineligible: Full refund rule applies to airline-caused cancellations.',
          status: 'Exceeded',
        });
        servicePolicy.push({
          rule: 'Delay Rule (3 to 5 Hours)',
          clause: 'Eligible: Delay exceeds 3 hours (meal voucher and departure lounge access authorized).',
          status: 'Applies',
        });

        return {
          intent: 'REQUEST_REFUND_ON_DELAY',
          isAllowed: false,
          requiresEscalation: false,
          trace: {
            perceive: `Customer requesting refund for delayed flight SK-118.`,
            retrieve: `Entitlement Matrix: Full refund rule applies to airline-caused cancellations. Flight SK-118 is delayed 4 hours, not cancelled.`,
            reason: `Refund rule applies strictly to cancellations. Flight is delayed 4 hours.`,
            guardrail: `EXPLAIN INELIGIBILITY: Full refund applies to cancellations. Offer meal voucher + lounge access.`,
            act: `Explain refund ineligibility per policy; offer meal voucher and departure lounge access for 4h delay.`,
          },
          sources: { bookingData, servicePolicy },
          systemDirective:
            'Explain respectfully to Arvind Kulkarni that under airline service policy, full cash refunds apply to airline-caused flight cancellations. Because flight SK-118 is delayed by 4 hours (revised departure 11:10) and not cancelled, cancellation refunds do not apply. Confirm that he is entitled to a complimentary meal voucher and departure lounge access at Mumbai airport.',
          allowedActions: ['issue_meal_voucher', 'issue_lounge_access'],
        };
      }

      // Free Rebooking Request (Ineligible for delays per Entitlement Matrix)
      if (mentionsRebook) {
        servicePolicy.push({
          rule: 'Cancellation Rule',
          clause: 'Ineligible: Flight is delayed 4 hours, not cancelled.',
          status: 'Exceeded',
        });
        servicePolicy.push({
          rule: 'Delay Rule (3 to 5 Hours)',
          clause: 'Eligible: Delay exceeds 3 hours (meal voucher and departure lounge access authorized).',
          status: 'Applies',
        });

        return {
          intent: 'REQUEST_FREE_REBOOKING_ON_DELAY',
          isAllowed: false,
          requiresEscalation: false,
          trace: {
            perceive: `Customer requesting free next-available rebooking for 4-hour delay.`,
            retrieve: `Entitlement Matrix: Free next-available rebooking applies to cancellations. Flight SK-118 is delayed, not cancelled.`,
            reason: `Flight is delayed 4 hours to 11:10, not cancelled.`,
            guardrail: `EXPLAIN INELIGIBILITY: Free rebooking applies to cancellations. Offer meal voucher + lounge access.`,
            act: `Explain free rebooking ineligibility per policy; offer meal voucher and departure lounge access.`,
          },
          sources: { bookingData, servicePolicy },
          systemDirective:
            'Explain to Arvind Kulkarni that free next-available rebooking applies to flight cancellations. Because flight SK-118 is delayed by 4 hours (revised departure 11:10) and scheduled to operate, he is entitled to a complimentary meal voucher and departure lounge access at Mumbai airport.',
          allowedActions: ['issue_meal_voucher', 'issue_lounge_access'],
        };
      }

      // Execute Action / Issue Lounge or Vouchers
      if (isExecuteAction || text.includes('give me my lounge') || text.includes('issue my meal')) {
        servicePolicy.push({
          rule: 'Delay Rule (3 to 5 Hours)',
          clause: 'Delay over 3 hours: Issuance of complimentary meal voucher and departure lounge access.',
          status: 'Applies',
        });

        return {
          intent: 'EXECUTE_DELAY_AMENITIES',
          isAllowed: true,
          requiresEscalation: false,
          trace: {
            perceive: `Customer requested issuance of meal voucher and/or lounge access.`,
            retrieve: `Flight SK-118: Delayed 4 hours. Eligible for meal voucher and departure lounge access.`,
            reason: `Delay exceeds 3 hours statutory threshold.`,
            guardrail: `CONFIRM ACTION: Issue meal voucher and activate departure lounge access.`,
            act: `Confirm meal voucher and departure lounge access have been issued for Mumbai airport.`,
          },
          sources: { bookingData, servicePolicy },
          systemDirective:
            'Confirm to Arvind Kulkarni that his complimentary meal voucher and departure lounge access pass have been issued for Mumbai airport. Remind him of the revised departure at 11:10.',
          allowedActions: ['issue_meal_voucher', 'issue_lounge_access'],
        };
      }

      // Frustration / Anger
      if (mentionsAnger) {
        servicePolicy.push({
          rule: 'Delay Rule (3 to 5 Hours)',
          clause: 'Delay over 3 hours: Meal voucher and departure lounge access provided.',
          status: 'Applies',
        });

        return {
          intent: 'HANDLE_CUSTOMER_ANGER',
          isAllowed: true,
          requiresEscalation: false,
          trace: {
            perceive: `Customer expressing anger/frustration regarding 4-hour delay and schedule disruption.`,
            retrieve: `Flight SK-118: Delayed 4 hours (07:10 → 11:10). Entitled to meal voucher and lounge access.`,
            reason: `Customer is upset about delay. Needs empathetic acknowledgment and immediate resolution.`,
            guardrail: `Acknowledge emotion briefly and respectfully; move immediately to resolution amenities.`,
            act: `Acknowledge frustration with empathy; confirm revised departure at 11:10 and offer meal voucher and lounge.`,
          },
          sources: { bookingData, servicePolicy },
          systemDirective:
            'Acknowledge Arvind\'s frustration with empathy regarding the 4-hour delay. Confirm that revised departure is scheduled for 11:10, and provide his authorized amenities: a complimentary meal voucher and departure lounge access at Mumbai airport so he can wait comfortably.',
          allowedActions: ['issue_meal_voucher', 'issue_lounge_access'],
        };
      }

      // Vouchers / Lounge / Entitlements inquiry
      if (mentionsVouchersOrLounge) {
        servicePolicy.push({
          rule: 'Delay Rule (3 to 5 Hours)',
          clause: 'Delay over 3 hours: Complimentary meal voucher and departure lounge access.',
          status: 'Applies',
        });

        return {
          intent: 'INQUIRE_DELAY_ENTITLEMENTS',
          isAllowed: true,
          requiresEscalation: false,
          trace: {
            perceive: `Customer asking what they are entitled to for a 4-hour delay.`,
            retrieve: `Flight SK-118: Delayed 4h. Policy: Delay over 3h qualifies for meal voucher + lounge access.`,
            reason: `Delay is 4 hours (>3h and <5h). Entitled to meal voucher and departure lounge access.`,
            guardrail: `ANSWER ONLY WHAT WAS ASKED: Specify meal voucher and departure lounge access.`,
            act: `Confirm entitlement to complimentary meal voucher and departure lounge access; offer to issue both.`,
          },
          sources: { bookingData, servicePolicy },
          systemDirective:
            'Confirm to Arvind Kulkarni that for a 4-hour delay, he is entitled to a complimentary meal voucher and departure lounge access at Mumbai airport. Offer to issue both for him now.',
          allowedActions: ['issue_meal_voucher', 'issue_lounge_access'],
        };
      }

      // General delay status inquiry
      servicePolicy.push({
        rule: 'Delay Rule (3 to 5 Hours)',
        clause: 'Delay over 3 hours: Complimentary meal voucher and departure lounge access.',
        status: 'Applies',
      });

      return {
        intent: 'INQUIRE_DELAY_STATUS',
        isAllowed: true,
        requiresEscalation: false,
        trace: {
          perceive: `Customer inquiring about delayed flight SK-118 (Mumbai to Bengaluru).`,
          retrieve: `Supplied Data: Scheduled 07:10, delayed 4 hours, revised departure 11:10. Silver Tier.`,
          reason: `Delay exceeds 3 hours. Customer qualifies for meal voucher and lounge access.`,
          guardrail: `State revised departure time (11:10) and present authorized delay amenities.`,
          act: `Advise customer of revised departure (11:10) and offer meal voucher and departure lounge access.`,
        },
        sources: { bookingData, servicePolicy },
        systemDirective:
          'Inform Arvind Kulkarni that flight SK-118 from Mumbai to Bengaluru is delayed by 4 hours, with a revised departure of 11:10. Because the delay exceeds 3 hours, he is entitled to a complimentary meal voucher and departure lounge access at Mumbai airport. Offer to issue both amenities.',
        allowedActions: ['issue_meal_voucher', 'issue_lounge_access'],
      };
    }

    // ------------------------------------------------------------------------
    // CUSTOMER 3: MEHER KAUR (Platinum Tier, SK-305 Delayed 6h)
    // ------------------------------------------------------------------------
    if (customer.id === 'meher') {
      const mentionsFullNight =
        text.includes('full night') ||
        text.includes('overnight') ||
        text.includes('entire night');

      const mentionsHotel =
        text.includes('hotel') ||
        text.includes('room') ||
        text.includes('stay') ||
        text.includes('accommodation');

      const mentionsFareDifference =
        text.includes('2000') ||
        text.includes('2,000') ||
        text.includes('fare difference') ||
        text.includes('higher-fare') ||
        text.includes('higher fare') ||
        text.includes('costs more');

      const mentionsWaive =
        text.includes('waive') ||
        text.includes('waiver');

      const mentionsWhy =
        text.includes('why not') ||
        text.includes("why can't") ||
        text.includes('why cannot') ||
        text.includes('why isn') ||
        text === 'why';

      const mentionsCompensation =
        text.includes('compensation') ||
        text.includes('cash') ||
        text.includes('entitled') ||
        text.includes('money');

      const mentionsRefund =
        text.includes('refund') ||
        text.includes('money back') ||
        text.includes('full cash refund') ||
        text.includes('cancel and refund');

      const mentionsRebook =
        text.includes('rebook') ||
        text.includes('free rebooking') ||
        text.includes('free rebook') ||
        text.includes('another flight') ||
        text.includes('different flight');

      // Acknowledgment / Closing
      if (isAckOrThanks) {
        servicePolicy.push({
          rule: 'Service Rules',
          clause: 'Courteous acknowledgment of customer confirmation while maintaining verified booking state.',
          status: 'Applies',
        });
        return {
          intent: 'ACKNOWLEDGMENT_OR_THANKS',
          isAllowed: true,
          requiresEscalation: false,
          trace: {
            perceive: `Customer acknowledged options or expressed thanks.`,
            retrieve: `Booking WL7742: Delayed SK-305 (revised departure 20:00). Platinum Tier.`,
            reason: `Customer acknowledged message. Keep response polite and concise.`,
            guardrail: `Do not repeat full profile. Confirm active delay amenities.`,
            act: `Acknowledge courteously, confirm amenities, and remind of revised departure at 20:00.`,
          },
          sources: { bookingData, servicePolicy },
          systemDirective:
            'Acknowledge Meher Kaur courteously. Remind her of the revised departure at 20:00 for flight SK-305, and confirm that her meal voucher, lounge access, and hotel accommodation covering the delayed hours remain available.',
          allowedActions: ['issue_meal_voucher', 'issue_lounge_access', 'arrange_hotel_delayed_hours'],
        };
      }

      // "Why not?" (After full night hotel or fare difference waiver discussion)
      if (mentionsWhy) {
        if (recentHistoryText.includes('full night') || recentHistoryText.includes('night') || mentionsFullNight) {
          servicePolicy.push({
            rule: 'Delay Rule (Over 5 Hours)',
            clause: 'Delay over 5 hours: Hotel accommodation covers delayed hours ONLY (14:00 to 20:00), not a full night stay.',
            status: 'Exceeded',
          });

          return {
            intent: 'EXPLAIN_FULL_NIGHT_RESTRICTION',
            isAllowed: false,
            requiresEscalation: false,
            trace: {
              perceive: `Customer asking why a full night hotel stay is not covered for a 6-hour daytime delay.`,
              retrieve: `Policy: Delay Rule (>5h). Hotel accommodation covers delayed hours only, not full night.`,
              reason: `Flight is delayed 6 hours during daytime/evening. Policy restricts coverage to the delayed hours portion.`,
              guardrail: `EXPLAIN POLICY LIMIT: Frontline agent cannot authorize full night. Offer supervisor escalation.`,
              act: `Explain that policy explicitly covers delayed hours only; offer supervisor escalation if customer insists.`,
            },
            sources: { bookingData, servicePolicy },
            systemDirective:
              'Explain respectfully to Meher Kaur that our service policy explicitly specifies hotel accommodation covers the delayed hours only for daytime delays, rather than a full night stay. Frontline agents do not have authority to approve full night hotel stays for this delay. Offer to escalate to a supervisor if she requires an exception.',
            allowedActions: ['arrange_hotel_delayed_hours', 'escalate_supervisor'],
          };
        }

        if (recentHistoryText.includes('waive') || recentHistoryText.includes('fare difference') || mentionsFareDifference) {
          servicePolicy.push({
            rule: 'Higher-Fare Rebooking Rule',
            clause: 'Customer pays fare difference. Frontline agents cannot waive fare difference above ₹1,500 without supervisor approval.',
            status: 'Exceeded',
          });

          return {
            intent: 'EXPLAIN_FARE_WAIVER_LIMIT',
            isAllowed: false,
            requiresEscalation: false,
            trace: {
              perceive: `Customer asking why the ₹2,000 fare difference cannot be waived directly.`,
              retrieve: `Higher-Fare Rebooking Rule: Agent waiver limit is capped at ₹1,500. Difference is ₹2,000.`,
              reason: `The ₹2,000 fare difference exceeds the agent statutory waiver limit by ₹500.`,
              guardrail: `EXPLAIN STATUTORY LIMIT: Waivers above ₹1,500 strictly require supervisor approval.`,
              act: `Explain the ₹1,500 agent waiver limit; offer supervisor escalation to review waiving the difference.`,
            },
            sources: { bookingData, servicePolicy },
            systemDirective:
              'Explain to Meher Kaur that frontline agents are bound by an authorized waiver limit of ₹1,500 under our service rules. Because the requested fare difference is ₹2,000, waiving an amount above ₹1,500 strictly requires supervisor approval. Offer to submit a supervisor escalation for the exception.',
            allowedActions: ['escalate_supervisor'],
          };
        }
      }

      // Full Night Hotel Request
      if (mentionsFullNight) {
        servicePolicy.push({
          rule: 'Delay Rule (Over 5 Hours)',
          clause: 'Delay over 5 hours: Hotel accommodation covers delayed hours ONLY (14:00 to 20:00), NOT a full night stay.',
          status: 'Exceeded',
        });
        servicePolicy.push({
          rule: 'Escalation Policy',
          clause: 'Compensation or amenities beyond stated policy amounts require supervisor escalation.',
          status: 'Exceeded',
        });

        if (hasRecentEscalation) {
          return {
            intent: 'FULL_NIGHT_AFTER_ESCALATION',
            isAllowed: false,
            requiresEscalation: false,
            trace: {
              perceive: `Customer asked about full night hotel stay after exception was already escalated to supervisor.`,
              retrieve: `Escalation Status: Full night hotel request logged with Duty Supervisor (Ticket #ESC-7422).`,
              reason: `Managerial review is currently pending. Policy strictly restricts frontline coverage to delayed hours only.`,
              guardrail: `Confirm escalation is pending supervisor review; remind customer of active daytime hotel and amenities.`,
              act: `Reassure customer that supervisor is reviewing full night stay request; confirm daytime room is ready.`,
            },
            sources: { bookingData, servicePolicy },
            systemDirective:
              'Remind Meher Kaur that her request for a full night hotel stay exception is currently logged with the Duty Supervisor for review (Ticket #ESC-7422). While under review, reassure her that her daytime hotel accommodation (until 20:00), meal voucher, and departure lounge access remain active and ready for use.',
            allowedActions: ['arrange_hotel_delayed_hours', 'issue_lounge_access', 'issue_meal_voucher'],
          };
        }

        return {
          intent: 'REQUEST_FULL_NIGHT_HOTEL',
          isAllowed: false,
          requiresEscalation: true,
          escalationReason: 'Policy strictly limits hotel coverage to delayed hours. Full night stay requires supervisor approval.',
          trace: {
            perceive: `Customer requesting a full night hotel stay for a 6-hour delay (14:00 → 20:00).`,
            retrieve: `Delay Rule (>5h): Hotel accommodation covers delayed hours only, not full night.`,
            reason: `Delay is 6 hours during daytime. Policy explicitly restricts hotel coverage to delayed hours.`,
            guardrail: `DENIAL / ESCALATION: Frontline agents cannot authorize full night. Offer delayed hours hotel or escalate.`,
            act: `Clarify policy covers delayed hours only; offer hotel for delayed hours or escalate full night request to supervisor.`,
          },
          sources: { bookingData, servicePolicy },
          systemDirective:
            'Acknowledge Meher Kaur. Explain that under airline policy for delays over 5 hours, hotel accommodation is provided covering the delayed hours only (until her revised 20:00 departure), not a full night stay. Offer to arrange hotel accommodation covering the delayed hours, alongside lounge access and meal vouchers. If she requires a full night stay, offer to escalate to a supervisor for review.',
          allowedActions: ['arrange_hotel_delayed_hours', 'issue_lounge_access', 'issue_meal_voucher', 'escalate_supervisor'],
        };
      }

      // Higher-fare flight & Fare waiver query (₹2,000 difference)
      if (mentionsFareDifference || mentionsWaive) {
        servicePolicy.push({
          rule: 'Higher-Fare Rebooking Rule',
          clause: 'Customer pays fare difference for voluntary higher-fare rebooking. Agent cannot waive fare difference above ₹1,500 without supervisor approval.',
          status: 'Exceeded',
        });

        if (hasRecentEscalation) {
          return {
            intent: 'WAIVER_AFTER_ESCALATION',
            isAllowed: false,
            requiresEscalation: false,
            trace: {
              perceive: `Customer asked about ₹2,000 fare waiver after escalation was already submitted.`,
              retrieve: `Escalation Status: Fare waiver request exceeding ₹1,500 limit logged with Operations Supervisor.`,
              reason: `Managerial approval is pending for ₹2,000 waiver. Frontline policy cannot override supervisor review.`,
              guardrail: `Reassure customer that waiver escalation is under supervisor review and confirm active hotel and amenities.`,
              act: `Confirm waiver escalation is pending supervisor review; remind customer of daytime hotel, lounge, and voucher.`,
            },
            sources: { bookingData, servicePolicy },
            systemDirective:
              'Remind Meher Kaur that her request to waive the ₹2,000 fare difference is currently under review with the Operations Supervisor (Ticket #ESC-7421). In the meantime, confirm that her hotel accommodation for delayed hours (until 20:00), lounge pass, and meal voucher remain active.',
            allowedActions: ['arrange_hotel_delayed_hours', 'issue_lounge_access', 'issue_meal_voucher'],
          };
        }

        return {
          intent: 'REQUEST_FARE_DIFFERENCE_WAIVER',
          isAllowed: false,
          requiresEscalation: true,
          escalationReason: 'Requested fare difference of ₹2,000 exceeds frontline agent waiver limit of ₹1,500. Supervisor approval required.',
          trace: {
            perceive: `Customer asking to rebook on higher-fare flight with ₹2,000 difference / asking to waive the difference.`,
            retrieve: `Higher-Fare Rebooking Rule: Agent waiver limit is ₹1,500. Difference is ₹2,000.`,
            reason: `A ₹2,000 fare difference exceeds the agent waiver cap by ₹500. Customer pays difference unless supervisor approves waiver.`,
            guardrail: `ESCALATION REQUIRED: Frontline agent cannot waive > ₹1,500. Require supervisor review or customer pays difference.`,
            act: `Explain that customer pays fare difference and agent waiver limit is ₹1,500. Escalate ₹2,000 waiver request to supervisor.`,
          },
          sources: { bookingData, servicePolicy },
          systemDirective:
            'Explain to Meher Kaur that when voluntarily rebooking onto a higher-fare flight, the customer pays the fare difference. Frontline agents are authorized to waive up to ₹1,500 only; a ₹2,000 fare difference exceeds this limit by ₹500 and strictly requires supervisor approval. State that you can submit an escalation to a supervisor to request approval for the waiver, or she may pay the difference to confirm immediately.',
          allowedActions: ['escalate_supervisor'],
        };
      }

      // Refund Request (Ineligible for delays per Entitlement Matrix)
      if (mentionsRefund) {
        servicePolicy.push({
          rule: 'Cancellation Rule & Refund Rule',
          clause: 'Ineligible: Standard cancellation refund rule applies to cancellations.',
          status: 'Exceeded',
        });
        servicePolicy.push({
          rule: 'Delay Rule (Over 5 Hours)',
          clause: 'Eligible: Delay exceeds 5 hours (meal voucher, departure lounge access, and hotel accommodation covering delayed hours authorized).',
          status: 'Applies',
        });

        return {
          intent: 'REQUEST_REFUND_ON_DELAY',
          isAllowed: false,
          requiresEscalation: false,
          trace: {
            perceive: `Customer requesting full refund for delayed flight SK-305.`,
            retrieve: `Entitlement Matrix: Standard cancellation refund rule applies to cancellations. Flight SK-305 is delayed 6 hours, not cancelled.`,
            reason: `Flight is delayed 6 hours. Cancellation refund rule does not apply.`,
            guardrail: `EXPLAIN INELIGIBILITY: Refund rule applies to cancellations. Present meal, lounge, and delayed-hours hotel amenities.`,
            act: `Explain refund ineligibility per policy; confirm authorized delay amenities (meal, lounge, delayed-hours hotel).`,
          },
          sources: { bookingData, servicePolicy },
          systemDirective:
            'Explain respectfully to Meher Kaur that under airline service policy, standard full cash refunds apply to flight cancellations. Because flight SK-305 is delayed by 6 hours (revised departure 20:00) and not cancelled, cancellation refunds do not apply. Confirm that she is entitled to a complimentary meal voucher, departure lounge access, and hotel accommodation covering the delayed hours (14:00 to 20:00).',
          allowedActions: ['issue_meal_voucher', 'issue_lounge_access', 'arrange_hotel_delayed_hours'],
        };
      }

      // Free Rebooking Request (Ineligible for delays unless fare diff policy applied)
      if (mentionsRebook && !mentionsFareDifference && !mentionsWaive) {
        servicePolicy.push({
          rule: 'Cancellation Rule',
          clause: 'Ineligible: Flight is delayed 6 hours, not cancelled.',
          status: 'Exceeded',
        });
        servicePolicy.push({
          rule: 'Higher-Fare Rebooking Rule',
          clause: 'For voluntary rebooking onto a higher-fare flight, the customer pays the fare difference. Frontline agent waiver cap is ₹1,500.',
          status: 'Applies',
        });
        servicePolicy.push({
          rule: 'Delay Rule (Over 5 Hours)',
          clause: 'Eligible: Delay exceeds 5 hours (meal voucher, departure lounge access, and hotel accommodation covering delayed hours authorized).',
          status: 'Applies',
        });

        return {
          intent: 'REQUEST_FREE_REBOOKING_ON_DELAY',
          isAllowed: false,
          requiresEscalation: false,
          trace: {
            perceive: `Customer requesting free next-available rebooking for 6-hour delay.`,
            retrieve: `Entitlement Matrix: Free next-available rebooking applies to cancellations. Flight SK-305 is delayed 6 hours, not cancelled.`,
            reason: `Flight is delayed 6 hours. Free rebooking applies to cancellations. Voluntary higher-fare rebooking requires paying fare difference.`,
            guardrail: `EXPLAIN INELIGIBILITY: Free rebooking applies to cancellations. Clarify fare difference policy and present delay amenities.`,
            act: `Explain free rebooking ineligibility; clarify fare difference policy (waiver cap ₹1,500) and offer delay amenities.`,
          },
          sources: { bookingData, servicePolicy },
          systemDirective:
            'Explain to Meher Kaur that free next-available rebooking applies to flight cancellations. Because flight SK-305 is delayed by 6 hours, voluntary rebooking onto an alternative flight requires payment of any applicable fare difference (frontline agent waiver limit is ₹1,500; higher differences require supervisor approval). In the meantime, her eligible delay remedies are a meal voucher, departure lounge pass, and hotel accommodation covering the delayed hours (until 20:00).',
          allowedActions: ['arrange_hotel_delayed_hours', 'issue_lounge_access', 'issue_meal_voucher'],
        };
      }

      // Hotel inquiry (Standard delayed hours)
      if (mentionsHotel) {
        servicePolicy.push({
          rule: 'Delay Rule (Over 5 Hours)',
          clause: 'Delay over 5 hours: Hotel accommodation covering delayed hours only, lounge access, and meal voucher.',
          status: 'Applies',
        });

        return {
          intent: 'REQUEST_HOTEL_DELAYED_HOURS',
          isAllowed: true,
          requiresEscalation: false,
          trace: {
            perceive: `Customer inquiring about hotel accommodation for 6-hour delay.`,
            retrieve: `Flight SK-305: Delayed 6h (14:00 → 20:00). Policy: Delay > 5h qualifies for hotel covering delayed hours.`,
            reason: `Delay is 6 hours, meeting the >5 hours policy threshold.`,
            guardrail: `CONFIRM ELIGIBILITY: Hotel accommodation covering delayed hours (14:00–20:00) is authorized.`,
            act: `Confirm eligibility for hotel accommodation covering delayed hours, plus lounge access and meal voucher.`,
          },
          sources: { bookingData, servicePolicy },
          systemDirective:
            'Confirm to Meher Kaur that because flight SK-305 is delayed by 6 hours (revised departure 20:00), she is eligible for hotel accommodation covering the delayed hours only, alongside departure lounge access and meal vouchers. Offer to arrange these for her.',
          allowedActions: ['arrange_hotel_delayed_hours', 'issue_lounge_access', 'issue_meal_voucher'],
        };
      }

      // Execute Action / Arrange Hotel & Amenities
      if (isExecuteAction) {
        servicePolicy.push({
          rule: 'Delay Rule (Over 5 Hours)',
          clause: 'Delay over 5 hours: Issuance of hotel accommodation covering delayed hours, lounge access, and meal voucher.',
          status: 'Applies',
        });

        return {
          intent: 'EXECUTE_DELAY_AMENITIES',
          isAllowed: true,
          requiresEscalation: false,
          trace: {
            perceive: `Customer requested immediate arrangement of hotel / delay amenities.`,
            retrieve: `Flight SK-305: Delayed 6h. Eligible for hotel covering delayed hours, lounge access, and meal voucher.`,
            reason: `Delay exceeds 5 hours. Amenities fully authorized.`,
            guardrail: `CONFIRM ACTION: Confirm hotel covering delayed hours (until 20:00) and issue lounge and meal vouchers.`,
            act: `Confirm hotel accommodation covering delayed hours is arranged, and lounge pass and meal voucher are issued.`,
          },
          sources: { bookingData, servicePolicy },
          systemDirective:
            'Confirm to Meher Kaur that her hotel accommodation covering the delayed hours (until her revised 20:00 departure) has been arranged, alongside her departure lounge access and meal voucher.',
          allowedActions: ['arrange_hotel_delayed_hours', 'issue_lounge_access', 'issue_meal_voucher'],
        };
      }

      // Compensation inquiry
      if (mentionsCompensation) {
        servicePolicy.push({
          rule: 'Delay Rule (Over 5 Hours)',
          clause: 'Delay over 5 hours: Complimentary meal voucher, departure lounge access, and hotel accommodation covering delayed hours only.',
          status: 'Applies',
        });
        servicePolicy.push({
          rule: 'Loyalty Tier Rule',
          clause: 'Platinum tier: Priority rebooking; no additional compensation beyond standard policy.',
          status: 'Applies',
        });

        return {
          intent: 'INQUIRE_COMPENSATION',
          isAllowed: true,
          requiresEscalation: false,
          trace: {
            perceive: `Customer asking what compensation or amenities they are entitled to for 6-hour delay.`,
            retrieve: `Flight SK-305: Delayed 6h. Platinum Tier. Policy: Delay > 5h qualifies for meal, lounge, and delayed-hours hotel.`,
            reason: `Delay exceeds 5 hours. Authorized amenities are meal voucher, lounge access, and hotel covering delayed hours.`,
            guardrail: `ANSWER ONLY WHAT WAS ASKED: Specify meal voucher, lounge, and delayed-hours hotel. No cash compensation in policy.`,
            act: `Confirm entitlement to meal voucher, departure lounge access, and hotel covering delayed hours.`,
          },
          sources: { bookingData, servicePolicy },
          systemDirective:
            'Confirm to Meher Kaur that for a delay over 5 hours, her authorized amenities are a complimentary meal voucher, departure lounge access, and hotel accommodation covering the delayed hours only. Explain that under airline policy, Platinum benefits provide priority rebooking and no additional cash compensation is provided.',
          allowedActions: ['issue_meal_voucher', 'issue_lounge_access', 'arrange_hotel_delayed_hours'],
        };
      }

      // General 6-hour delay options inquiry
      servicePolicy.push({
        rule: 'Delay Rule (Over 5 Hours)',
        clause: 'Delay over 5 hours: Complimentary meal voucher, departure lounge access, and hotel accommodation covering delayed hours only (not a full night).',
        status: 'Applies',
      });
      servicePolicy.push({
        rule: 'Loyalty Tier Rule',
        clause: 'Platinum tier members receive priority rebooking.',
        status: 'Applies',
      });

      return {
        intent: 'INQUIRE_DELAY_OPTIONS',
        isAllowed: true,
        requiresEscalation: false,
        trace: {
          perceive: `Customer inquiring about 6-hour delay on flight SK-305 (Delhi to Hyderabad).`,
          retrieve: `Supplied Data: SK-305 scheduled 14:00, revised 20:00 (6h delay). Platinum Tier.`,
          reason: `Delay exceeds 5 hours. Customer qualifies for meal voucher, lounge access, and hotel covering delayed hours.`,
          guardrail: `State revised departure (20:00). Confirm meal, lounge, and hotel covering delayed hours only.`,
          act: `Advise customer of revised departure (20:00) and present the eligible delay amenities.`,
        },
        sources: { bookingData, servicePolicy },
        systemDirective:
          'Inform Meher Kaur that flight SK-305 from Delhi to Hyderabad is delayed by 6 hours, with a revised departure of 20:00. Sincerely apologize for the delay. Clarify that because the delay exceeds 5 hours, she is entitled to a meal voucher, departure lounge access, and hotel accommodation covering the delayed hours only. Offer to arrange these amenities.',
        allowedActions: ['issue_meal_voucher', 'issue_lounge_access', 'arrange_hotel_delayed_hours'],
      };
    }

    // Generic fallback for unhandled inquiries
    servicePolicy.push({
      rule: 'Service Rules',
      clause: 'All resolutions are grounded strictly in the supplied booking data and service policies.',
      status: 'Applies',
    });

    return {
      intent: 'GENERAL_INQUIRY',
      isAllowed: true,
      requiresEscalation: false,
      trace: {
        perceive: `Customer inquiry received: "${message}".`,
        retrieve: `Customer record PNR ${customer.bookingReference}.`,
        reason: `Evaluate inquiry against supplied flight booking and service policies.`,
        guardrail: `Ensure response is grounded strictly in supplied data. No hallucinations.`,
        act: `Provide verified flight details and policy entitlements based on supplied data.`,
      },
      sources: { bookingData, servicePolicy },
      systemDirective: `Provide helpful information based strictly on ${customer.name}'s flight booking and the supplied service policies.`,
      allowedActions: [],
    };
  }

  /**
   * Deterministic Action Execution Verification
   */
  public static executeAction(
    customer: CustomerProfile,
    actionType: string,
    params: Record<string, any> = {}
  ): {
    status: 'COMPLETED' | 'ESCALATION_REQUIRED' | 'NOT_ELIGIBLE' | 'FAILED';
    message: string;
    details: string;
    auditEvent: {
      action: string;
      details: string;
      policyRule: string;
    };
  } {
    const eligibility = this.getEligibility(customer);

    switch (actionType) {
      case 'rebook_free': {
        if (customer.id === 'priya') {
          return {
            status: 'COMPLETED',
            message: 'Free rebooking confirmed on next available flight within 24 hours at no charge.',
            details: 'Rebooking confirmed under Cancellation Rule. Gold priority seating assigned.',
            auditEvent: {
              action: 'Action completed: Free Rebooking',
              details: `Rebooked cancelled flight SK-204 to next available service within 24 hours at no charge (Gold priority).`,
              policyRule: 'Cancellation Rule & Loyalty Tier Rule',
            },
          };
        }
        return {
          status: 'NOT_ELIGIBLE',
          message: 'Free rebooking applies only to airline-caused cancellations.',
          details: 'Current flight is not cancelled.',
          auditEvent: {
            action: 'Action rejected: Free Rebooking',
            details: `Customer ${customer.name} attempted free cancellation rebooking on delayed service.`,
            policyRule: 'Cancellation Rule',
          },
        };
      }

      case 'refund_full': {
        if (customer.id === 'priya') {
          return {
            status: 'COMPLETED',
            message: 'Full refund initiated to original payment method.',
            details: 'Full refund will credit within 7 business days to original payment method.',
            auditEvent: {
              action: 'Action completed: Full Refund Initiated',
              details: `Full refund initiated for cancelled flight SK-204 (PNR SK4821X) to original payment method. Processing timeline: 7 business days.`,
              policyRule: 'Refund Rule & Cancellation Rule',
            },
          };
        }
        return {
          status: 'NOT_ELIGIBLE',
          message: 'Full refund without penalty applies strictly to airline-caused cancellations.',
          details: 'Active delayed flights do not qualify for immediate cancellation refund.',
          auditEvent: {
            action: 'Action rejected: Full Refund',
            details: 'Full refund request rejected for non-cancelled flight.',
            policyRule: 'Refund Rule',
          },
        };
      }

      case 'issue_meal_voucher': {
        if (eligibility.mealVoucher.eligible) {
          return {
            status: 'COMPLETED',
            message: 'Meal voucher generated and sent to customer.',
            details: 'Valid for food and beverage at departure terminal.',
            auditEvent: {
              action: 'Action completed: Meal Voucher Issued',
              details: `Meal voucher issued for customer ${customer.name} per Delay Rule.`,
              policyRule: 'Delay Rule',
            },
          };
        }
        return {
          status: 'NOT_ELIGIBLE',
          message: 'Customer does not meet the delay criteria for a meal voucher.',
          details: eligibility.mealVoucher.note,
          auditEvent: {
            action: 'Action rejected: Meal Voucher',
            details: 'Meal voucher ineligible for current booking status.',
            policyRule: 'Delay Rule',
          },
        };
      }

      case 'issue_lounge_access': {
        if (eligibility.loungeAccess.eligible) {
          return {
            status: 'COMPLETED',
            message: 'Departure lounge access pass issued.',
            details: 'Valid at departure lounge until flight departure.',
            auditEvent: {
              action: 'Action completed: Lounge Access Granted',
              details: `Departure lounge access granted for ${customer.name} due to delay > 3 hours.`,
              policyRule: 'Delay Rule (3 to 5 Hours)',
            },
          };
        }
        return {
          status: 'NOT_ELIGIBLE',
          message: 'Lounge access requires a delay exceeding 3 hours.',
          details: eligibility.loungeAccess.note,
          auditEvent: {
            action: 'Action rejected: Lounge Access',
            details: 'Lounge access rejected: delay does not exceed 3 hours.',
            policyRule: 'Delay Rule',
          },
        };
      }

      case 'arrange_hotel_delayed_hours': {
        if (eligibility.hotelAccommodation.eligible) {
          return {
            status: 'COMPLETED',
            message: 'Hotel accommodation reserved covering delayed hours (14:00–20:00).',
            details: 'Reservation covers delayed hours only prior to revised departure. Not a full night stay.',
            auditEvent: {
              action: 'Action completed: Delayed-Hours Hotel Reserved',
              details: `Hotel accommodation booked for ${customer.name} covering delayed hours (14:00 to 20:00).`,
              policyRule: 'Delay Rule (Over 5 Hours)',
            },
          };
        }
        return {
          status: 'NOT_ELIGIBLE',
          message: 'Hotel accommodation requires a flight delay exceeding 5 hours.',
          details: eligibility.hotelAccommodation.note,
          auditEvent: {
            action: 'Action rejected: Hotel Accommodation',
            details: 'Hotel request denied: flight delay does not exceed 5 hours.',
            policyRule: 'Delay Rule',
          },
        };
      }

      case 'hotel_full_night': {
        if (customer.id === 'arvind') {
          return {
            status: 'NOT_ELIGIBLE',
            message: 'Hotel accommodation requires a flight delay exceeding 5 hours.',
            details: 'Flight SK-118 is delayed by 4 hours (07:10 to 11:10). Under Delay Rule, hotel accommodation is not available for delays under 5 hours.',
            auditEvent: {
              action: 'Action rejected: Hotel Accommodation',
              details: 'Hotel request denied for Arvind Kulkarni: 4-hour delay does not meet the >5 hour policy threshold.',
              policyRule: 'Delay Rule (Over 5 Hours)',
            },
          };
        }
        return {
          status: 'ESCALATION_REQUIRED',
          message: 'Supervisor approval required for full night hotel accommodation.',
          details: 'Policy restricts hotel coverage to delayed hours only (14:00–20:00). Frontline agent cannot authorize full night stays.',
          auditEvent: {
            action: 'Escalation created: Full Night Hotel Request',
            details: `Supervisor escalation ticket (ESC-7422) generated for full night hotel request by ${customer.name}.`,
            policyRule: 'Delay Rule (Over 5 Hours) & Escalation Policy',
          },
        };
      }

      case 'waive_fare_difference': {
        const amount = params.amount || 2000;
        if (amount > 1500) {
          return {
            status: 'ESCALATION_REQUIRED',
            message: `Supervisor approval required: Fare difference of ₹${amount} exceeds agent waiver limit of ₹1,500.`,
            details: `Under Higher-Fare Rebooking Rule, agents can waive up to ₹1,500. Requested ₹${amount} waiver requires supervisor authorization.`,
            auditEvent: {
              action: 'Escalation created: Fare Difference Waiver > ₹1,500',
              details: `Supervisor escalation submitted for ₹${amount} waiver for ${customer.name}.`,
              policyRule: 'Higher-Fare Rebooking Rule & Escalation Policy',
            },
          };
        }
        return {
          status: 'COMPLETED',
          message: `Fare difference waiver of ₹${amount} applied within agent authority.`,
          details: 'Rebooking confirmed with fare difference waived within ₹1,500 statutory limit.',
          auditEvent: {
            action: `Action completed: Fare Difference Waived (₹${amount})`,
            details: `Waived ₹${amount} fare difference under agent statutory authority.`,
            policyRule: 'Higher-Fare Rebooking Rule',
          },
        };
      }

      case 'escalate_supervisor':
      case 'escalate_specialist': {
        return {
          status: 'COMPLETED',
          message: 'Case escalated to Operations Supervisor / Specialist Support Team.',
          details: 'Case has been transferred for managerial review and direct customer follow-up.',
          auditEvent: {
            action: 'Escalation created: Specialist Support Assigned',
            details: `Priority escalation initiated for ${customer.name} (Booking ${customer.bookingReference}).`,
            policyRule: 'Escalation Policy',
          },
        };
      }

      default:
        return {
          status: 'FAILED',
          message: `Unknown action: ${actionType}`,
          details: 'Action is not recognized by policy engine.',
          auditEvent: {
            action: 'Action failed',
            details: `Unrecognized action ${actionType} submitted.`,
            policyRule: 'Service Rules',
          },
        };
    }
  }
}
