import React from 'react';
import { CustomerProfile } from '../types';
import { User, AlertCircle, Clock, CheckCircle2 } from 'lucide-react';

interface CustomerSelectorProps {
  customers: CustomerProfile[];
  selectedCustomerId: string;
  onSelectCustomer: (customerId: string) => void;
}

export const CustomerSelector: React.FC<CustomerSelectorProps> = ({
  customers,
  selectedCustomerId,
  onSelectCustomer,
}) => {
  const getTierBadge = (tier: string) => {
    switch (tier) {
      case 'Platinum':
        return 'bg-[#F1F5F9] text-[#0F172A] border-[#94A3B8] ring-1 ring-slate-300';
      case 'Gold':
        return 'bg-[#FEF3C7] text-[#92400E] border-[#FCD34D]';
      case 'Silver':
        return 'bg-[#F1F5F9] text-[#475569] border-[#CBD5E1]';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getDisruptionBadge = (cust: CustomerProfile) => {
    const flight = cust.flights[0];
    if (flight.status === 'Cancelled') {
      return (
        <span className="inline-flex items-center space-x-1 text-[11px] font-semibold text-[#DC2626] bg-[#FEF2F2] border border-[#FECACA] px-2 py-0.5 rounded">
          <AlertCircle className="w-3 h-3 text-[#DC2626]" />
          <span>Cancelled</span>
        </span>
      );
    }
    if (flight.status === 'Delayed') {
      return (
        <span className="inline-flex items-center space-x-1 text-[11px] font-semibold text-[#D97706] bg-[#FFFBEB] border border-[#FDE68A] px-2 py-0.5 rounded">
          <Clock className="w-3 h-3 text-[#D97706]" />
          <span>{flight.statusDetails.split('(')[0].trim()}</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center space-x-1 text-[11px] font-medium text-[#16A34A] bg-[#F0FDF4] border border-[#BBF7D0] px-2 py-0.5 rounded">
        <CheckCircle2 className="w-3 h-3 text-[#16A34A]" />
        <span>Unaffected</span>
      </span>
    );
  };

  return (
    <div className="bg-[#FFFFFF] border-b border-[#E2E8F0] px-4 lg:px-8 py-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <User className="w-4 h-4 text-[#0284C7]" />
          <span className="text-xs font-bold uppercase tracking-wider text-[#334155]">
            Active Customer Dossier:
          </span>
          <span className="text-xs text-[#64748B]">
            (Select customer to switch isolated session & conversation record)
          </span>
        </div>

        {/* The 3 Only Customers */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {customers.map((cust) => {
            const isSelected = cust.id === selectedCustomerId;
            return (
              <button
                key={cust.id}
                id={`select-customer-${cust.id}`}
                onClick={() => onSelectCustomer(cust.id)}
                className={`flex items-center justify-between p-2.5 rounded-lg border text-left transition-all duration-150 cursor-pointer ${
                  isSelected
                    ? 'bg-[#F0F9FF] border-[#0284C7] shadow-sm ring-1 ring-[#0284C7]'
                    : 'bg-[#FFFFFF] hover:bg-[#F8FAFC] border-[#E2E8F0] hover:border-[#CBD5E1]'
                }`}
              >
                <div className="min-w-0 pr-2">
                  <div className="flex items-center space-x-1.5">
                    <span
                      className={`text-xs font-bold truncate ${
                        isSelected ? 'text-[#0369A1]' : 'text-[#0F172A]'
                      }`}
                    >
                      {cust.name}
                    </span>
                    <span
                      className={`text-[10px] uppercase font-bold px-1.5 py-0.2 rounded border ${getTierBadge(
                        cust.loyaltyTier
                      )}`}
                    >
                      {cust.loyaltyTier}
                    </span>
                  </div>
                  <div className="font-mono text-[11px] text-[#64748B] mt-0.5">
                    PNR: <span className="font-semibold text-[#1E293B]">{cust.bookingReference}</span>
                  </div>
                </div>

                <div>{getDisruptionBadge(cust)}</div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
