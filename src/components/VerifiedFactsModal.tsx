import React from 'react';
import { FactsFallback } from '../types';
import { X, ShieldAlert, CheckCircle, FileText } from 'lucide-react';

interface VerifiedFactsModalProps {
  facts: FactsFallback | null;
  isOpen: boolean;
  onClose: () => void;
}

export const VerifiedFactsModal: React.FC<VerifiedFactsModalProps> = ({
  facts,
  isOpen,
  onClose,
}) => {
  if (!isOpen || !facts) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl shadow-xl w-full max-w-xl overflow-hidden text-left">
        {/* Modal Header */}
        <div className="px-5 py-4 bg-[#F8FAFC] border-b border-[#E2E8F0] flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#0284C7]/10 flex items-center justify-center text-[#0284C7]">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#0F172A] font-['Plus_Jakarta_Sans']">
                {facts.title}
              </h3>
              <p className="text-xs text-[#64748B]">
                Deterministic ground-truth records from Airline Central Res & Policy Engine
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-[#64748B] hover:text-[#0F172A] hover:bg-[#E2E8F0] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Passenger Identity Summary */}
          <div className="grid grid-cols-2 gap-3 p-3 bg-[#F1F5F9] rounded-lg border border-[#E2E8F0] text-xs">
            <div>
              <span className="text-[#64748B] block font-medium">Passenger:</span>
              <span className="font-bold text-[#0F172A]">{facts.customer}</span>
            </div>
            <div>
              <span className="text-[#64748B] block font-medium">Loyalty Tier / PNR:</span>
              <span className="font-bold text-[#0F172A]">
                {facts.tier} Tier • <span className="font-mono">{facts.bookingRef}</span>
              </span>
            </div>
            <div className="col-span-2 pt-1 border-t border-[#CBD5E1]/60">
              <span className="text-[#64748B] block font-medium">Recorded Disruption:</span>
              <span className="font-medium text-[#B91C1C]">{facts.disruption}</span>
            </div>
          </div>

          {/* Verified Flight Booking Records */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#334155] mb-2 flex items-center space-x-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-[#0284C7]" />
              <span>Verified Flight Booking Records</span>
            </h4>
            <div className="space-y-1.5">
              {facts.verifiedFacts.map((fact, i) => (
                <div
                  key={i}
                  className="p-2.5 bg-[#FFFFFF] border border-[#E2E8F0] rounded-md font-mono text-xs text-[#1E293B]"
                >
                  {fact}
                </div>
              ))}
            </div>
          </div>

          {/* Authorized Service Policy Entitlements */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#334155] mb-2 flex items-center space-x-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-[#0284C7]" />
              <span>Governing Service Policy Entitlements</span>
            </h4>
            <div className="space-y-1.5">
              {facts.policyEntitlements.map((pol, i) => (
                <div
                  key={i}
                  className="p-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-md text-xs text-[#334155] leading-relaxed font-mono"
                >
                  {pol}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 bg-[#F8FAFC] border-t border-[#E2E8F0] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#0284C7] hover:bg-[#0369A1] text-white text-xs font-semibold rounded-md shadow-xs transition-colors cursor-pointer"
          >
            Close Verified Facts
          </button>
        </div>
      </div>
    </div>
  );
};
