import React, { useState, useEffect, useCallback, useRef } from 'react';
import { CustomerProfile, ChatMessage, AuditRecord, FactsFallback, ActionStatus } from './types';
import {
  fetchHealth,
  fetchCustomers,
  fetchAuditLogs,
  sendChatMessage,
  executeCustomerAction,
  logClientAuditEvent,
  HealthResponse,
} from './services/api';
import { CinematicLanding } from './components/CinematicLanding';
import { Header } from './components/Header';
import { CustomerSelector } from './components/CustomerSelector';
import { ChatPanel } from './components/ChatPanel';
import { RightContextRail } from './components/RightContextRail';
import { VerifiedFactsModal } from './components/VerifiedFactsModal';
import { AlertCircle, RefreshCw, Layers } from 'lucide-react';

export default function App() {
  // Experience Mode: 'cinematic' | 'control_tower'
  const [experienceMode, setExperienceMode] = useState<'cinematic' | 'control_tower'>('cinematic');

  // Operational State
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [customers, setCustomers] = useState<CustomerProfile[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('priya');

  // Separate conversation history per customer
  const [conversations, setConversations] = useState<Record<string, ChatMessage[]>>({
    priya: [],
    arvind: [],
    meher: [],
  });

  // Separate audit trails per customer
  const [auditLogs, setAuditLogs] = useState<Record<string, AuditRecord[]>>({
    priya: [],
    arvind: [],
    meher: [],
  });

  // UI state
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [activeFactsModal, setActiveFactsModal] = useState<FactsFallback | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Mobile active tab ('chat' | 'context')
  const [mobileTab, setMobileTab] = useState<'chat' | 'context'>('chat');

  // AbortController ref for request cancellation
  const abortControllerRef = useRef<AbortController | null>(null);

  // Initial Load: Health check & Customer data
  useEffect(() => {
    async function init() {
      try {
        const [hData, cData] = await Promise.all([fetchHealth(), fetchCustomers()]);
        setHealth(hData);
        setCustomers(cData);

        // Load audit logs for customers
        const [priyaLogs, arvindLogs, meherLogs] = await Promise.all([
          fetchAuditLogs('priya'),
          fetchAuditLogs('arvind'),
          fetchAuditLogs('meher'),
        ]);

        setAuditLogs({
          priya: priyaLogs,
          arvind: arvindLogs,
          meher: meherLogs,
        });

        // Seed realistic initial customer greeting if conversations empty
        setConversations({
          priya: [
            {
              id: 'init-priya',
              role: 'agent',
              text: 'Hello Priya. I can see your flight SK-204 from Delhi to Goa scheduled for 18:40 today has been cancelled due to operational reasons. Under our service policy, you are entitled to a free rebooking on the next available flight within 24 hours, or a full refund. How would you like to proceed?',
              timestamp: '18:42 IST',
              sources: {
                bookingData: [
                  { label: 'Booking Ref', value: 'SK4821X' },
                  { label: 'Flight SK-204', value: 'Delhi → Goa | 18:40 Cancelled (operational reasons)' },
                  { label: 'Return Flight', value: 'Goa → Delhi | 25 Sep 16:20 Unaffected' },
                ],
                servicePolicy: [
                  {
                    rule: 'Cancellation Rebooking Rule',
                    clause: 'Airline-caused cancellation entitles customer to free rebooking within 24h OR full refund.',
                    status: 'Applies',
                  },
                ],
              },
              trace: {
                perceive: 'Inbound session initialized for Priya Nair (Gold Tier). Disrupted flight SK-204 detected.',
                retrieve: 'PNR SK4821X retrieved. Flight SK-204 marked Cancelled. Return leg unaffected.',
                reason: 'Disruption is airline-caused. Entitled to free rebooking or full 100% refund.',
                guardrail: 'Frontline agent authorized to execute rebooking or refund. Return flight unaffected.',
                act: 'Proactively advise of cancellation and present authorized resolution choices.',
              },
            },
          ],
          arvind: [
            {
              id: 'init-arvind',
              role: 'agent',
              text: 'Hello Arvind. I notice your flight SK-118 from Mumbai to Bengaluru is delayed by 4 hours, with a revised departure of 11:10. Because this delay exceeds 3 hours, you are entitled to a complimentary meal voucher and lounge access at Mumbai airport. How can I assist you?',
              timestamp: '07:15 IST',
              sources: {
                bookingData: [
                  { label: 'Booking Ref', value: 'TR1190B' },
                  { label: 'Flight SK-118', value: 'Mumbai → Bengaluru | 07:10 → 11:10 (Delayed 4h)' },
                ],
                servicePolicy: [
                  {
                    rule: 'Delay Compensation Rule',
                    clause: 'Delay over 3 hours: complimentary meal voucher + departure lounge access.',
                    status: 'Applies',
                  },
                ],
              },
              trace: {
                perceive: 'Inbound session for Arvind Kulkarni (Silver Tier). Delayed flight SK-118 detected.',
                retrieve: 'PNR TR1190B. 4-hour delay confirmed at Mumbai airport.',
                reason: 'Delay exceeds 3 hours threshold. Qualifies for meal voucher and lounge access.',
                guardrail: 'Hotel accommodation strictly prohibited as delay is under 5 hours.',
                act: 'Issue departure update and offer eligible delay amenities.',
              },
            },
          ],
          meher: [
            {
              id: 'init-meher',
              role: 'agent',
              text: 'Hello Meher. I apologize for the disruption to your travel. Flight SK-305 from Delhi to Hyderabad is delayed by 6 hours, with new departure at 20:00. As a Platinum member with a delay over 5 hours, you are entitled to meal vouchers, lounge access, and hotel accommodation covering the delayed hours. How would you like me to arrange these for you?',
              timestamp: '14:05 IST',
              sources: {
                bookingData: [
                  { label: 'Booking Ref', value: 'WL7742' },
                  { label: 'Flight SK-305', value: 'Delhi → Hyderabad | 14:00 → 20:00 (Delayed 6h)' },
                ],
                servicePolicy: [
                  {
                    rule: 'Delay Compensation Rule',
                    clause: 'Delay over 5 hours: meal voucher, lounge access, and hotel covering delayed hours only.',
                    status: 'Applies',
                  },
                ],
              },
              trace: {
                perceive: 'Inbound session for Meher Kaur (Platinum Tier). 6-hour delay on SK-305 detected.',
                retrieve: 'PNR WL7742. Scheduled 14:00 revised to 20:00.',
                reason: 'Delay exceeds 5 hours. Qualifies for meal, lounge, and delayed-hours day-room hotel.',
                guardrail: 'Hotel accommodation is restricted to delayed hours portion only, not full night.',
                act: 'Present authorized delay amenities including day-room booking at airport transit hotel.',
              },
            },
          ],
        });
        } catch (e: any) {
          console.error('Initialization error:', e);
          setErrorMessage('Unable to connect to Resolution Control backend.');
        }
      }
      init();
    }, []);

  // Handle switching customer
  const handleSelectCustomer = useCallback(
    async (customerId: string) => {
      if (customerId === selectedCustomerId) return;
      setSelectedCustomerId(customerId);

      // Log switch event to audit trail
      try {
        const record = await logClientAuditEvent(
          customerId,
          'Customer Dossier Selected',
          `Agent switched active operations view to ${customerId.toUpperCase()}.`,
          'Operations Security Protocol',
          'normal'
        );
        setAuditLogs((prev) => ({
          ...prev,
          [customerId]: [record, ...(prev[customerId] || [])],
        }));
      } catch (err) {
        console.error('Audit log failed:', err);
      }
    },
    [selectedCustomerId]
  );

  // Send natural language message
  const handleSendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isChatLoading) return;

      const currentCustId = selectedCustomerId;
      const userMsg: ChatMessage = {
        id: `usr-${Date.now()}`,
        role: 'user',
        text,
        timestamp: new Date().toTimeString().split(' ')[0] + ' IST',
      };

      // 1. Optimistically append user message to this customer's thread
      setConversations((prev) => ({
        ...prev,
        [currentCustId]: [...(prev[currentCustId] || []), userMsg],
      }));

      setIsChatLoading(true);
      setErrorMessage(null);

      // Abort any existing in-flight request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const historyForBackend = (conversations[currentCustId] || []).map((m) => ({
          role: m.role,
          text: m.text,
        }));

        const response = await sendChatMessage(
          currentCustId,
          text,
          historyForBackend,
          controller.signal
        );

        // 2. Append agent response to this customer's thread
        setConversations((prev) => ({
          ...prev,
          [currentCustId]: [...(prev[currentCustId] || []), response.agentResponse],
        }));

        // 3. Prepend audit events
        if (response.auditEvents && response.auditEvents.length > 0) {
          setAuditLogs((prev) => ({
            ...prev,
            [currentCustId]: [...response.auditEvents, ...(prev[currentCustId] || [])],
          }));
        }
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        console.error('Failed to send message:', err);

        // Append fallback error message
        const errorMsg: ChatMessage = {
          id: `err-${Date.now()}`,
          role: 'agent',
          text: 'AI reasoning service is temporarily unavailable.',
          timestamp: new Date().toTimeString().split(' ')[0] + ' IST',
          isUnavailable: true,
          factsFallback: {
            title: 'Verified Booking & Policy Facts',
            customer: currentCustId,
            tier: 'Standard',
            bookingRef: 'N/A',
            disruption: 'Communication timeout',
            verifiedFacts: ['Network timeout connecting to AI reasoning service.'],
            policyEntitlements: ['Frontline policy rules remain in effect.'],
          },
        };

        setConversations((prev) => ({
          ...prev,
          [currentCustId]: [...(prev[currentCustId] || []), errorMsg],
        }));
      } finally {
        setIsChatLoading(false);
      }
    },
    [selectedCustomerId, isChatLoading, conversations]
  );

  // Execute an action
  const handleExecuteAction = useCallback(
    async (actionType: string, params: any = {}): Promise<{ status: ActionStatus; message: string }> => {
      const currentCustId = selectedCustomerId;
      try {
        const res = await executeCustomerAction(currentCustId, actionType, params);

        // Append audit event
        if (res.auditEvent) {
          setAuditLogs((prev) => ({
            ...prev,
            [currentCustId]: [res.auditEvent, ...(prev[currentCustId] || [])],
          }));
        }

        // Add status-specific notification message to conversation
        let prefix = '[ACTION CONFIRMED]';
        let ticketRef = '';
        if (
          res.status === 'ESCALATION_REQUIRED' ||
          actionType.includes('escalat') ||
          actionType === 'hotel_full_night'
        ) {
          prefix = '[SUPERVISOR ESCALATION LOGGED]';
          const ticketId =
            currentCustId === 'meher'
              ? 'ESC-7421'
              : currentCustId === 'arvind'
              ? 'ESC-8119'
              : 'ESC-4821';
          ticketRef = `(Ticket #${ticketId} assigned to Duty Supervisor).`;
        } else if (res.status === 'NOT_ELIGIBLE') {
          prefix = '[POLICY NOTICE]';
        } else if (res.status === 'FAILED') {
          prefix = '[ACTION FAILED]';
        }

        const systemConfirmMsg: ChatMessage = {
          id: `act-msg-${Date.now()}`,
          role: 'agent',
          text: `${prefix}: ${res.message} ${res.details} ${ticketRef}`.trim(),
          timestamp: new Date().toTimeString().split(' ')[0] + ' IST',
        };

        setConversations((prev) => ({
          ...prev,
          [currentCustId]: [...(prev[currentCustId] || []), systemConfirmMsg],
        }));

        return { status: res.status, message: res.message };
      } catch (err: any) {
        throw err;
      }
    },
    [selectedCustomerId]
  );

  const activeCustomer = customers.find((c) => c.id === selectedCustomerId) || customers[0];

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] flex flex-col font-sans selection:bg-[#0284C7]/20 selection:text-[#0369A1]">
      {/* EXPERIENCE 1: CINEMATIC 3D AIRLINE LANDING */}
      {experienceMode === 'cinematic' && (
        <CinematicLanding
          onEnterControlTower={() => setExperienceMode('control_tower')}
        />
      )}

      {/* EXPERIENCE 2: RESOLUTION CONTROL TOWER (PREMIUM LIGHT THEME) */}
      {experienceMode === 'control_tower' && (
        <div className="flex flex-col min-h-screen">
          {/* Header */}
          <Header
            onReplayCinematic={() => setExperienceMode('cinematic')}
            activeProvider={health?.activeProvider}
          />

          {/* Customer Selection Banner (Priya, Arvind, Meher) */}
          <CustomerSelector
            customers={customers}
            selectedCustomerId={selectedCustomerId}
            onSelectCustomer={handleSelectCustomer}
          />

          {/* Mobile View Toggle (Chat vs Context) */}
          <div className="lg:hidden flex items-center justify-around border-b border-[#E2E8F0] bg-[#FFFFFF] px-4 py-2 text-xs font-semibold">
            <button
              onClick={() => setMobileTab('chat')}
              className={`flex-1 py-1.5 text-center rounded-md cursor-pointer ${
                mobileTab === 'chat'
                  ? 'bg-[#0369A1] text-white shadow-xs'
                  : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              Resolution Conversation
            </button>
            <button
              onClick={() => setMobileTab('context')}
              className={`flex-1 py-1.5 text-center rounded-md cursor-pointer ${
                mobileTab === 'context'
                  ? 'bg-[#0369A1] text-white shadow-xs'
                  : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              Context & Actions
            </button>
          </div>

          {/* Main 3-Column Operations Layout */}
          <main className="flex-1 max-w-[1600px] w-full mx-auto p-3 sm:p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 min-h-[calc(100vh-140px)]">
            {/* Center Chat Panel (7 Columns on large screens) */}
            <div
              className={`lg:col-span-7 h-[calc(100vh-170px)] min-h-[500px] flex flex-col ${
                mobileTab === 'context' ? 'hidden lg:flex' : 'flex'
              }`}
            >
              {activeCustomer && (
                <ChatPanel
                  customer={activeCustomer}
                  messages={conversations[selectedCustomerId] || []}
                  isLoading={isChatLoading}
                  onSendMessage={handleSendMessage}
                  onExecuteAction={(act) => handleExecuteAction(act)}
                  onOpenVerifiedFacts={(facts) => setActiveFactsModal(facts)}
                />
              )}
            </div>

            {/* Right Context Rail (5 Columns on large screens) */}
            <div
              className={`lg:col-span-5 h-[calc(100vh-170px)] min-h-[500px] flex flex-col ${
                mobileTab === 'chat' ? 'hidden lg:flex' : 'flex'
              }`}
            >
              {activeCustomer && (
                <RightContextRail
                  customer={activeCustomer}
                  auditLogs={auditLogs[selectedCustomerId] || []}
                  onExecuteAction={handleExecuteAction}
                />
              )}
            </div>
          </main>
        </div>
      )}

      {/* Verified Facts Modal */}
      <VerifiedFactsModal
        facts={activeFactsModal}
        isOpen={!!activeFactsModal}
        onClose={() => setActiveFactsModal(null)}
      />
    </div>
  );
}
