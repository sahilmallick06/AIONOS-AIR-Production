import React, { useState } from 'react';
import { CustomerProfile, AuditRecord, ActionStatus } from '../types';
import {
  Plane,
  ArrowDown,
  ShieldCheck,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileCheck,
  History,
  AlertOctagon,
  Phone,
  Mail,
  Luggage,
  FileText,
  Sliders,
  ExternalLink,
  BookOpen,
} from 'lucide-react';

interface RightContextRailProps {
  customer: CustomerProfile;
  auditLogs: AuditRecord[];
  onExecuteAction: (actionType: string, params?: any) => Promise<{ status: ActionStatus; message: string }>;
}

export const RightContextRail: React.FC<RightContextRailProps> = ({
  customer,
  auditLogs,
  onExecuteAction,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'journey' | 'actions' | 'audit'>('overview');

  // Action execution state map
  const [actionStates, setActionStates] = useState<Record<string, { status: ActionStatus; feedback?: string }>>({});

  const handleActionClick = async (actionType: string, params: any = {}) => {
    // 1. Enter PROCESSING state
    setActionStates((prev) => ({
      ...prev,
      [actionType]: { status: 'PROCESSING', feedback: 'Checking policy...' },
    }));

    // Realistic operational latency to demonstrate policy verification progression
    await new Promise((resolve) => setTimeout(resolve, 800));

    setActionStates((prev) => ({
      ...prev,
      [actionType]: { status: 'PROCESSING', feedback: 'Policy verified. Committing transaction...' },
    }));

    await new Promise((resolve) => setTimeout(resolve, 600));

    try {
      const res = await onExecuteAction(actionType, params);
      setActionStates((prev) => ({
        ...prev,
        [actionType]: {
          status: res.status,
          feedback: res.message,
        },
      }));
    } catch (err: any) {
      setActionStates((prev) => ({
        ...prev,
        [actionType]: {
          status: 'FAILED',
          feedback: err.message || 'Action execution failed.',
        },
      }));
    }
  };

  const getTierColor = (tier: string) => {
    if (tier === 'Platinum') return 'bg-[#F1F5F9] text-[#0F172A] border-[#94A3B8]';
    if (tier === 'Gold') return 'bg-[#FEF3C7] text-[#92400E] border-[#FCD34D]';
    return 'bg-[#F1F5F9] text-[#475569] border-[#CBD5E1]';
  };

  return (
    <div className="flex flex-col h-full bg-[#FFFFFF] rounded-xl border border-[#E2E8F0] shadow-xs overflow-hidden">
      {/* Navigation Tabs */}
      <div className="flex items-center border-b border-[#E2E8F0] bg-[#F8FAFC] px-2 pt-2 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-3 py-2 border-b-2 transition-colors cursor-pointer ${
            activeTab === 'overview'
              ? 'border-[#0284C7] text-[#0369A1] bg-[#FFFFFF] rounded-t-md font-bold'
              : 'border-transparent text-[#64748B] hover:text-[#0F172A]'
          }`}
        >
          Overview & Eligibility
        </button>
        <button
          onClick={() => setActiveTab('journey')}
          className={`px-3 py-2 border-b-2 transition-colors cursor-pointer ${
            activeTab === 'journey'
              ? 'border-[#0284C7] text-[#0369A1] bg-[#FFFFFF] rounded-t-md font-bold'
              : 'border-transparent text-[#64748B] hover:text-[#0F172A]'
          }`}
        >
          Booking Journey
        </button>
        <button
          onClick={() => setActiveTab('actions')}
          className={`px-3 py-2 border-b-2 transition-colors cursor-pointer ${
            activeTab === 'actions'
              ? 'border-[#0284C7] text-[#0369A1] bg-[#FFFFFF] rounded-t-md font-bold'
              : 'border-transparent text-[#64748B] hover:text-[#0F172A]'
          }`}
        >
          Action Center
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`px-3 py-2 border-b-2 transition-colors cursor-pointer flex items-center space-x-1 ${
            activeTab === 'audit'
              ? 'border-[#0284C7] text-[#0369A1] bg-[#FFFFFF] rounded-t-md font-bold'
              : 'border-transparent text-[#64748B] hover:text-[#0F172A]'
          }`}
        >
          <span>Audit Trail</span>
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-[#E2E8F0] text-[#334155]">
            {auditLogs.length}
          </span>
        </button>
      </div>

      {/* Tab Panels */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* ----------------- TAB: OVERVIEW & ELIGIBILITY ----------------- */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {/* Customer Identity Card */}
            <div className="p-3.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-[#0F172A]">{customer.name}</h3>
                  <div className="text-[11px] font-mono text-[#64748B]">
                    Booking Ref (PNR): <span className="font-bold text-[#0F172A]">{customer.bookingReference}</span>
                  </div>
                </div>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded border uppercase ${getTierColor(customer.loyaltyTier)}`}>
                  {customer.loyaltyTier} Tier
                </span>
              </div>

              <div className="pt-2 border-t border-[#E2E8F0] grid grid-cols-1 gap-1 text-[11px] text-[#475569]">
                <div className="flex items-center space-x-1.5">
                  <Mail className="w-3.5 h-3.5 text-[#64748B]" />
                  <span>{customer.contactEmail}</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <Phone className="w-3.5 h-3.5 text-[#64748B]" />
                  <span>{customer.contactPhone}</span>
                </div>
                <div className="flex items-center space-x-1.5 pt-1">
                  <Luggage className="w-3.5 h-3.5 text-[#64748B]" />
                  <span>
                    Past 12m: {customer.travelHistory.flightsLast12Months} flights • {customer.travelHistory.priorComplaints}
                  </span>
                </div>
              </div>
            </div>

            {/* Current Disruption Card */}
            <div className="p-3 bg-[#FFFBEB] border border-[#FDE68A] rounded-xl text-xs">
              <div className="flex items-center space-x-2 font-bold text-[#92400E] mb-1">
                <AlertTriangle className="w-4 h-4 text-[#D97706]" />
                <span className="uppercase tracking-wide text-[11px]">Current Disruption</span>
              </div>
              <p className="text-[#78350F] font-medium leading-relaxed">
                {customer.disruptionSummary}
              </p>
            </div>

            {/* Deterministic Policy Eligibility Checklist */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#334155] mb-2 flex items-center space-x-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#0284C7]" />
                <span>Deterministic Entitlement Matrix</span>
              </h4>

              <div className="space-y-2 text-xs">
                {/* Rebooking */}
                <div className="p-2.5 bg-[#FFFFFF] border border-[#E2E8F0] rounded-lg flex items-start space-x-2.5">
                  {customer.eligibility.freeRebookingWithin24h.eligible ? (
                    <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-4 h-4 text-[#94A3B8] shrink-0 mt-0.5" />
                  )}
                  <div>
                    <span className="font-bold text-[#0F172A] block">Free Next-Available Rebooking (24h)</span>
                    <span className="text-[11px] text-[#64748B]">{customer.eligibility.freeRebookingWithin24h.note}</span>
                  </div>
                </div>

                {/* Refund */}
                <div className="p-2.5 bg-[#FFFFFF] border border-[#E2E8F0] rounded-lg flex items-start space-x-2.5">
                  {customer.eligibility.fullRefund.eligible ? (
                    <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-4 h-4 text-[#94A3B8] shrink-0 mt-0.5" />
                  )}
                  <div>
                    <span className="font-bold text-[#0F172A] block">100% Full Cash Refund</span>
                    <span className="text-[11px] text-[#64748B]">{customer.eligibility.fullRefund.note}</span>
                  </div>
                </div>

                {/* Meal Voucher */}
                <div className="p-2.5 bg-[#FFFFFF] border border-[#E2E8F0] rounded-lg flex items-start space-x-2.5">
                  {customer.eligibility.mealVoucher.eligible ? (
                    <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-4 h-4 text-[#94A3B8] shrink-0 mt-0.5" />
                  )}
                  <div>
                    <span className="font-bold text-[#0F172A] block">Meal Voucher</span>
                    <span className="text-[11px] text-[#64748B]">{customer.eligibility.mealVoucher.note}</span>
                  </div>
                </div>

                {/* Lounge Access */}
                <div className="p-2.5 bg-[#FFFFFF] border border-[#E2E8F0] rounded-lg flex items-start space-x-2.5">
                  {customer.eligibility.loungeAccess.eligible ? (
                    <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-4 h-4 text-[#94A3B8] shrink-0 mt-0.5" />
                  )}
                  <div>
                    <span className="font-bold text-[#0F172A] block">Departure Lounge Access</span>
                    <span className="text-[11px] text-[#64748B]">{customer.eligibility.loungeAccess.note}</span>
                  </div>
                </div>

                {/* Hotel Accommodation */}
                <div className="p-2.5 bg-[#FFFFFF] border border-[#E2E8F0] rounded-lg flex items-start space-x-2.5">
                  {customer.eligibility.hotelAccommodation.eligible ? (
                    <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-4 h-4 text-[#94A3B8] shrink-0 mt-0.5" />
                  )}
                  <div>
                    <span className="font-bold text-[#0F172A] block">Hotel Accommodation (Delayed Hours Only)</span>
                    <span className="text-[11px] text-[#64748B]">{customer.eligibility.hotelAccommodation.note}</span>
                  </div>
                </div>

                {/* Statutory Waiver Cap */}
                <div className="p-2.5 bg-[#F1F5F9] border border-[#CBD5E1] rounded-lg text-[11px] text-[#334155] font-mono">
                  <span className="font-bold text-[#0F172A]">Agent Statutory Fare Waiver Cap:</span> ₹1,500 max.
                  Higher difference requires supervisor escalation.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ----------------- TAB: BOOKING JOURNEY ----------------- */}
        {activeTab === 'journey' && (
          <div className="space-y-4">
            <div className="text-xs text-[#64748B]">
              Real-time flight status for Passenger <span className="font-bold text-[#0F172A]">{customer.name}</span> (PNR: {customer.bookingReference})
            </div>

            {/* If Priya Nair: Show Outbound DEL -> SK-204 -> GOA Cancelled, and Return GOA -> RETURN -> DEL Unaffected separately */}
            {customer.id === 'priya' && (
              <div className="space-y-4">
                {/* Outbound cancelled leg */}
                <div className="p-4 bg-[#FEF2F2] border border-[#FECACA] rounded-xl text-center">
                  <div className="text-[10px] font-mono uppercase tracking-widest text-[#DC2626] font-bold mb-2">
                    OUTBOUND SECTOR • CANCELLED
                  </div>
                  <div className="flex items-center justify-center space-x-3 font-mono font-bold text-lg text-[#0F172A]">
                    <span>DEL</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-red-100 text-red-800 font-sans border border-red-200">
                      SK-204
                    </span>
                    <ArrowDown className="w-4 h-4 text-[#DC2626] rotate-[-90deg]" />
                    <span>GOA</span>
                  </div>
                  <div className="mt-2 text-xs font-mono text-[#334155]">
                    Scheduled: <span className="font-bold">18:40</span> • Wed 23 Sep 2026
                  </div>
                  <div className="mt-2 inline-flex items-center space-x-1 text-xs font-bold text-[#DC2626] bg-[#FFFFFF] px-2.5 py-1 rounded-md border border-[#FCA5A5]">
                    <XCircle className="w-3.5 h-3.5" />
                    <span>CANCELLED (OPERATIONAL REASONS)</span>
                  </div>
                </div>

                {/* Return leg unaffected */}
                <div className="p-4 bg-[#F0FDF4] border border-[#BBF7D0] rounded-xl text-center">
                  <div className="text-[10px] font-mono uppercase tracking-widest text-[#16A34A] font-bold mb-2">
                    RETURN SECTOR • UNAFFECTED
                  </div>
                  <div className="flex items-center justify-center space-x-3 font-mono font-bold text-lg text-[#0F172A]">
                    <span>GOA</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-sans border border-emerald-200">
                      RETURN
                    </span>
                    <ArrowDown className="w-4 h-4 text-[#16A34A] rotate-[-90deg]" />
                    <span>DEL</span>
                  </div>
                  <div className="mt-2 text-xs font-mono text-[#334155]">
                    Scheduled: <span className="font-bold">16:20</span> • Fri 25 Sep 2026
                  </div>
                  <div className="mt-2 inline-flex items-center space-x-1 text-xs font-bold text-[#16A34A] bg-[#FFFFFF] px-2.5 py-1 rounded-md border border-[#86EFAC]">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>CONFIRMED / UNAFFECTED</span>
                  </div>
                </div>
              </div>
            )}

            {/* Arvind Kulkarni: BOM -> SK-118 -> BLR Delayed 4h */}
            {customer.id === 'arvind' && (
              <div className="p-4 bg-[#FFFBEB] border border-[#FDE68A] rounded-xl text-center space-y-2">
                <div className="text-[10px] font-mono uppercase tracking-widest text-[#D97706] font-bold mb-1">
                  DOMESTIC SECTOR • DELAYED 4 HOURS
                </div>
                <div className="flex items-center justify-center space-x-3 font-mono font-bold text-lg text-[#0F172A]">
                  <span>BOM</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-sans border border-amber-200">
                    SK-118
                  </span>
                  <ArrowDown className="w-4 h-4 text-[#D97706] rotate-[-90deg]" />
                  <span>BLR</span>
                </div>
                <div className="text-xs font-mono text-[#334155] space-y-0.5">
                  <div>Scheduled: <span className="line-through text-[#64748B]">07:10</span></div>
                  <div>Revised Departure: <span className="font-bold text-[#B45309]">11:10</span> (Delayed 4h)</div>
                </div>
                <div className="mt-2 inline-flex items-center space-x-1 text-xs font-bold text-[#D97706] bg-[#FFFFFF] px-2.5 py-1 rounded-md border border-[#FCD34D]">
                  <Clock className="w-3.5 h-3.5" />
                  <span>ACTIVE 4-HOUR AIRPORT DELAY</span>
                </div>
              </div>
            )}

            {/* Meher Kaur: DEL -> SK-305 -> HYD Delayed 6h */}
            {customer.id === 'meher' && (
              <div className="p-4 bg-[#FFFBEB] border border-[#FDE68A] rounded-xl text-center space-y-2">
                <div className="text-[10px] font-mono uppercase tracking-widest text-[#D97706] font-bold mb-1">
                  DOMESTIC SECTOR • DELAYED 6 HOURS
                </div>
                <div className="flex items-center justify-center space-x-3 font-mono font-bold text-lg text-[#0F172A]">
                  <span>DEL</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-sans border border-amber-200">
                    SK-305
                  </span>
                  <ArrowDown className="w-4 h-4 text-[#D97706] rotate-[-90deg]" />
                  <span>HYD</span>
                </div>
                <div className="text-xs font-mono text-[#334155] space-y-0.5">
                  <div>Scheduled: <span className="line-through text-[#64748B]">14:00</span></div>
                  <div>Revised Departure: <span className="font-bold text-[#B45309]">20:00</span> (Delayed 6h)</div>
                </div>
                <div className="mt-2 inline-flex items-center space-x-1 text-xs font-bold text-[#D97706] bg-[#FFFFFF] px-2.5 py-1 rounded-md border border-[#FCD34D]">
                  <Clock className="w-3.5 h-3.5" />
                  <span>EXTENDED 6-HOUR DELAY</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ----------------- TAB: ACTION CENTER ----------------- */}
        {activeTab === 'actions' && (
          <div className="space-y-4 text-xs">
            <div className="text-xs text-[#64748B]">
              Actions are governed by backend policy. Click an action to execute deterministic verification.
            </div>

            {/* Action Buttons tailored to Customer */}
            <div className="space-y-2.5">
              {/* Rebook Free (Only for cancellation) */}
              {customer.id === 'priya' && (
                <div className="p-3 rounded-lg border border-[#E2E8F0] bg-[#FFFFFF] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#0F172A]">Rebook Next Available Flight (Within 24h)</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-mono uppercase bg-[#F0FDF4] text-[#166534] font-semibold">
                      Allowed
                    </span>
                  </div>
                  <p className="text-[11px] text-[#64748B]">
                    Priority seat assignment under Gold tier benefits at ₹0 fare.
                  </p>
                  <button
                    onClick={() => handleActionClick('rebook_free')}
                    disabled={actionStates['rebook_free']?.status === 'PROCESSING'}
                    className="w-full py-2 bg-[#0284C7] hover:bg-[#0369A1] text-white font-semibold rounded-md transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {actionStates['rebook_free']?.status === 'PROCESSING'
                      ? actionStates['rebook_free']?.feedback
                      : 'Execute Free Rebooking'}
                  </button>
                  {actionStates['rebook_free']?.status && actionStates['rebook_free']?.status !== 'PROCESSING' && (
                    <div className="text-[11px] p-2 bg-[#F0FDF4] border border-[#BBF7D0] text-[#166534] rounded font-mono">
                      ✓ {actionStates['rebook_free']?.feedback}
                    </div>
                  )}
                </div>
              )}

              {/* Full Refund */}
              {customer.id === 'priya' && (
                <div className="p-3 rounded-lg border border-[#E2E8F0] bg-[#FFFFFF] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#0F172A]">Process Full Refund (SK-204)</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-mono uppercase bg-[#F0FDF4] text-[#166534] font-semibold">
                      Allowed
                    </span>
                  </div>
                  <p className="text-[11px] text-[#64748B]">
                    Credited in full within 7 business days to original payment method only.
                  </p>
                  <button
                    onClick={() => handleActionClick('refund_full')}
                    disabled={actionStates['refund_full']?.status === 'PROCESSING'}
                    className="w-full py-2 bg-[#0F172A] hover:bg-[#1E293B] text-white font-semibold rounded-md transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {actionStates['refund_full']?.status === 'PROCESSING'
                      ? actionStates['refund_full']?.feedback
                      : 'Initiate Full Refund'}
                  </button>
                  {actionStates['refund_full']?.status && actionStates['refund_full']?.status !== 'PROCESSING' && (
                    <div className="text-[11px] p-2 bg-[#F0FDF4] border border-[#BBF7D0] text-[#166534] rounded font-mono">
                      ✓ {actionStates['refund_full']?.feedback}
                    </div>
                  )}
                </div>
              )}

              {/* Meal Voucher & Lounge Access for Arvind & Meher */}
              {(customer.id === 'arvind' || customer.id === 'meher') && (
                <>
                  <div className="p-3 rounded-lg border border-[#E2E8F0] bg-[#FFFFFF] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#0F172A]">Issue Meal Voucher</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-mono uppercase bg-[#F0FDF4] text-[#166534] font-semibold">
                        Eligible
                      </span>
                    </div>
                    <button
                      onClick={() => handleActionClick('issue_meal_voucher')}
                      disabled={actionStates['issue_meal_voucher']?.status === 'PROCESSING'}
                      className="w-full py-2 bg-[#0284C7] hover:bg-[#0369A1] text-white font-semibold rounded-md transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {actionStates['issue_meal_voucher']?.status === 'PROCESSING'
                        ? actionStates['issue_meal_voucher']?.feedback
                        : 'Issue Meal Voucher'}
                    </button>
                    {actionStates['issue_meal_voucher']?.status && actionStates['issue_meal_voucher']?.status !== 'PROCESSING' && (
                      <div className="text-[11px] p-2 bg-[#F0FDF4] border border-[#BBF7D0] text-[#166534] rounded font-mono">
                        ✓ {actionStates['issue_meal_voucher']?.feedback}
                      </div>
                    )}
                  </div>

                  <div className="p-3 rounded-lg border border-[#E2E8F0] bg-[#FFFFFF] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#0F172A]">Issue Lounge Access Pass</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-mono uppercase bg-[#F0FDF4] text-[#166534] font-semibold">
                        Eligible
                      </span>
                    </div>
                    <button
                      onClick={() => handleActionClick('issue_lounge_access')}
                      disabled={actionStates['issue_lounge_access']?.status === 'PROCESSING'}
                      className="w-full py-2 bg-[#0284C7] hover:bg-[#0369A1] text-white font-semibold rounded-md transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {actionStates['issue_lounge_access']?.status === 'PROCESSING'
                        ? actionStates['issue_lounge_access']?.feedback
                        : 'Issue Lounge Access'}
                    </button>
                    {actionStates['issue_lounge_access']?.status && actionStates['issue_lounge_access']?.status !== 'PROCESSING' && (
                      <div className="text-[11px] p-2 bg-[#F0FDF4] border border-[#BBF7D0] text-[#166534] rounded font-mono">
                        ✓ {actionStates['issue_lounge_access']?.feedback}
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Meher Hotel Accommodation (Delayed Hours Only) */}
              {customer.id === 'meher' && (
                <div className="p-3 rounded-lg border border-[#E2E8F0] bg-[#FFFFFF] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#0F172A]">Book Delayed-Hours Hotel (14:00–20:00)</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-mono uppercase bg-[#F0FDF4] text-[#166534] font-semibold">
                      Eligible (&gt;5h)
                    </span>
                  </div>
                  <p className="text-[11px] text-[#64748B]">
                    Covers delayed hours only at airport transit facility. Not full night.
                  </p>
                  <button
                    onClick={() => handleActionClick('arrange_hotel_delayed_hours')}
                    disabled={actionStates['arrange_hotel_delayed_hours']?.status === 'PROCESSING'}
                    className="w-full py-2 bg-[#0369A1] hover:bg-[#0284C7] text-white font-semibold rounded-md transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {actionStates['arrange_hotel_delayed_hours']?.status === 'PROCESSING'
                      ? actionStates['arrange_hotel_delayed_hours']?.feedback
                      : 'Reserve Delayed-Hours Room'}
                  </button>
                  {actionStates['arrange_hotel_delayed_hours']?.status && actionStates['arrange_hotel_delayed_hours']?.status !== 'PROCESSING' && (
                    <div className="text-[11px] p-2 bg-[#F0FDF4] border border-[#BBF7D0] text-[#166534] rounded font-mono">
                      ✓ {actionStates['arrange_hotel_delayed_hours']?.feedback}
                    </div>
                  )}
                </div>
              )}

              {/* Escalation Test: Meher's ₹2,000 fare difference flight */}
              {customer.id === 'meher' && (
                <div className="p-3 rounded-lg border border-[#FDE68A] bg-[#FFFBEB] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#92400E]">Rebook Higher-Fare Flight (₹2,000 Diff)</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-mono uppercase bg-[#FEF2F2] text-[#DC2626] font-semibold">
                      Exceeds Limit
                    </span>
                  </div>
                  <p className="text-[11px] text-[#78350F]">
                    ₹2,000 fare difference exceeds agent statutory limit of ₹1,500. Triggers supervisor approval.
                  </p>
                  <button
                    onClick={() => handleActionClick('waive_fare_difference', { amount: 2000 })}
                    disabled={actionStates['waive_fare_difference']?.status === 'PROCESSING'}
                    className="w-full py-2 bg-[#D97706] hover:bg-[#B45309] text-white font-semibold rounded-md transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {actionStates['waive_fare_difference']?.status === 'PROCESSING'
                      ? actionStates['waive_fare_difference']?.feedback
                      : 'Attempt ₹2,000 Fare Waiver'}
                  </button>
                  {actionStates['waive_fare_difference']?.status && actionStates['waive_fare_difference']?.status !== 'PROCESSING' && (
                    <div className="text-[11px] p-2 bg-[#FEF2F2] border border-[#FECACA] text-[#991B1B] rounded font-mono">
                      ⚠ {actionStates['waive_fare_difference']?.feedback}
                    </div>
                  )}
                </div>
              )}

              {/* Escalation Test: Full Night Hotel Stay (Applicable to >5h delay - Meher Kaur) */}
              {customer.id === 'meher' && (
                <div className="p-3 rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#334155]">Full Night Hotel Accommodation</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-mono uppercase bg-[#FEF2F2] text-[#DC2626] font-semibold">
                      Escalation Required
                    </span>
                  </div>
                  <p className="text-[11px] text-[#64748B]">
                    Policy strictly covers delayed hours only (14:00–20:00). Full night requires supervisor approval.
                  </p>
                  <button
                    onClick={() => handleActionClick('hotel_full_night')}
                    disabled={actionStates['hotel_full_night']?.status === 'PROCESSING'}
                    className="w-full py-1.5 bg-[#FFFFFF] hover:bg-[#F1F5F9] border border-[#CBD5E1] text-[#334155] font-semibold rounded-md transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {actionStates['hotel_full_night']?.status === 'PROCESSING'
                      ? actionStates['hotel_full_night']?.feedback
                      : 'Request Supervisor Approval'}
                  </button>
                  {actionStates['hotel_full_night']?.status && actionStates['hotel_full_night']?.status !== 'PROCESSING' && (
                    <div className="text-[11px] p-2 bg-[#FFFBEB] border border-[#FDE68A] text-[#92400E] rounded font-mono">
                      ⚠ {actionStates['hotel_full_night']?.feedback}
                    </div>
                  )}
                </div>
              )}

              {/* Immediate Specialist Escalation */}
              <div className="p-3 rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#334155]">Escalate to Specialist Support Team</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded font-mono uppercase bg-[#F1F5F9] text-[#475569] font-semibold">
                    Immediate
                  </span>
                </div>
                <button
                  onClick={() => handleActionClick('escalate_specialist')}
                  disabled={actionStates['escalate_specialist']?.status === 'PROCESSING'}
                  className="w-full py-1.5 bg-[#475569] hover:bg-[#334155] text-white font-semibold rounded-md transition-colors cursor-pointer disabled:opacity-50"
                >
                  {actionStates['escalate_specialist']?.status === 'PROCESSING'
                    ? actionStates['escalate_specialist']?.feedback
                    : 'Assign Specialist Agent'}
                </button>
                {actionStates['escalate_specialist']?.status && actionStates['escalate_specialist']?.status !== 'PROCESSING' && (
                  <div className="text-[11px] p-2 bg-[#F0FDF4] border border-[#BBF7D0] text-[#166534] rounded font-mono">
                    ✓ {actionStates['escalate_specialist']?.feedback}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ----------------- TAB: AUDIT TRAIL ----------------- */}
        {activeTab === 'audit' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-[#64748B]">
              <span>Real events logged in operations ledger:</span>
              <span className="font-mono text-[10px]">{auditLogs.length} events</span>
            </div>

            <div className="space-y-2">
              {auditLogs.map((log) => (
                <div
                  key={log.id}
                  className={`p-2.5 rounded-lg border text-xs ${
                    log.severity === 'warning'
                      ? 'bg-[#FFFBEB] border-[#FDE68A] text-[#78350F]'
                      : log.severity === 'critical'
                      ? 'bg-[#FEF2F2] border-[#FECACA] text-[#991B1B]'
                      : log.severity === 'success'
                      ? 'bg-[#F0FDF4] border-[#BBF7D0] text-[#166534]'
                      : 'bg-[#FFFFFF] border-[#E2E8F0] text-[#1E293B]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-[11px]">{log.eventType}</span>
                    <span className="font-mono text-[10px] text-[#64748B]">{log.timestamp}</span>
                  </div>
                  <p className="text-[11px] leading-relaxed font-sans">{log.details}</p>
                  {log.policyRef && (
                    <div className="mt-1 font-mono text-[10px] text-[#64748B]">
                      Ref: {log.policyRef}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
