import React, { useState } from 'react';
import { TraceData } from '../types';
import { ChevronDown, ChevronUp, Cpu, ShieldCheck, Database, GitFork, CheckCircle2 } from 'lucide-react';

interface TraceVisualizerProps {
  trace?: TraceData;
  isProcessing?: boolean;
}

export const TraceVisualizer: React.FC<TraceVisualizerProps> = ({
  trace,
  isProcessing = false,
}) => {
  const [isOpen, setIsOpen] = useState(true);

  if (!trace && !isProcessing) return null;

  const steps = [
    {
      id: 'perceive',
      name: 'PERCEIVE',
      icon: Cpu,
      content: isProcessing ? 'Parsing inbound customer utterance & intent...' : trace?.perceive,
      color: 'border-sky-200 bg-sky-50 text-sky-900',
      badge: 'bg-sky-100 text-sky-800',
    },
    {
      id: 'retrieve',
      name: 'RETRIEVE',
      icon: Database,
      content: isProcessing ? 'Querying flight booking records & policy clauses...' : trace?.retrieve,
      color: 'border-slate-200 bg-slate-50 text-slate-800',
      badge: 'bg-slate-200 text-slate-700',
    },
    {
      id: 'reason',
      name: 'REASON',
      icon: GitFork,
      content: isProcessing ? 'Evaluating deterministic rules against disruption parameters...' : trace?.reason,
      color: 'border-indigo-200 bg-indigo-50 text-indigo-900',
      badge: 'bg-indigo-100 text-indigo-800',
    },
    {
      id: 'guardrail',
      name: 'GUARDRAIL',
      icon: ShieldCheck,
      content: isProcessing ? 'Enforcing policy authority constraints & statutory limits...' : trace?.guardrail,
      color: 'border-amber-200 bg-amber-50 text-amber-900',
      badge: 'bg-amber-100 text-amber-800',
    },
    {
      id: 'act',
      name: 'ACT',
      icon: CheckCircle2,
      content: isProcessing ? 'Formulating authorized customer response & operational action...' : trace?.act,
      color: 'border-emerald-200 bg-emerald-50 text-emerald-900',
      badge: 'bg-emerald-100 text-emerald-800',
    },
  ];

  return (
    <div className="mt-3 rounded-lg border border-[#E2E8F0] bg-[#FFFFFF] overflow-hidden text-xs shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
      {/* Header Bar */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 bg-[#F8FAFC] border-b border-[#E2E8F0] hover:bg-[#F1F5F9] transition-colors cursor-pointer text-left"
      >
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 rounded-full bg-[#0284C7] animate-pulse" />
          <span className="font-mono font-bold text-[#0F172A] tracking-wider uppercase text-[11px]">
            Operational Reasoning Trace (Deterministic Guardrails)
          </span>
          {isProcessing && (
            <span className="text-[10px] bg-amber-100 text-amber-800 font-semibold px-1.5 py-0.5 rounded animate-pulse">
              Evaluating...
            </span>
          )}
        </div>
        <div className="text-[#64748B]">
          {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </div>
      </button>

      {/* Expanded Pipeline Steps */}
      {isOpen && (
        <div className="p-3 space-y-2">
          <div className="grid grid-cols-1 gap-2">
            {steps.map((step, idx) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.id}
                  className={`p-2.5 rounded-md border ${step.color} transition-all duration-300 ${
                    isProcessing ? 'animate-pulse' : ''
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center space-x-1.5">
                      <Icon className="w-3.5 h-3.5" />
                      <span className="font-mono font-bold text-[10px] tracking-wider">
                        {step.name}
                      </span>
                    </div>
                    <span className="text-[9px] font-mono text-slate-500">STEP 0{idx + 1}</span>
                  </div>
                  <p className="text-[11px] font-medium leading-relaxed font-mono">
                    {step.content || 'Awaiting evaluation...'}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
