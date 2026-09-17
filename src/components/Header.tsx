import React, { useState, useEffect } from 'react';
import { Compass, Eye, Shield } from 'lucide-react';

interface HeaderProps {
  onReplayCinematic: () => void;
  activeProvider?: string;
}

export const Header: React.FC<HeaderProps> = ({
  onReplayCinematic,
  activeProvider,
}) => {
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toTimeString().split(' ')[0]);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="sticky top-0 z-30 bg-[#FFFFFF] border-b border-[#E2E8F0] px-4 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      {/* Brand & Workspace Title */}
      <div className="flex items-center space-x-3.5">
        <div className="w-9 h-9 rounded-lg bg-[#0369A1] flex items-center justify-center text-white shadow-sm">
          <Compass className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <span className="font-bold text-[#0F172A] tracking-wider text-base font-['Plus_Jakarta_Sans'] uppercase">
              AIONOS <span className="text-[#0284C7] font-semibold">AIR</span>
            </span>
            <span className="text-[#94A3B8]">/</span>
            <span className="text-xs font-semibold text-[#475569] uppercase tracking-wide">
              Resolution Control
            </span>
          </div>
          <p className="text-[11px] text-[#64748B] font-medium hidden sm:block">
            Customer-Facing Disruption Operations & Autonomous Policy Authority
          </p>
        </div>
      </div>

      {/* Center Operational Context */}
      <div className="hidden md:flex items-center space-x-2 px-3.5 py-1.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] text-xs font-medium text-[#334155]">
        <Shield className="w-3.5 h-3.5 text-[#0284C7]" />
        <span>Operational Date:</span>
        <span className="font-semibold text-[#0F172A]">Wednesday, 23 September 2026</span>
      </div>

      {/* Right Side Controls & Live Status */}
      <div className="flex items-center space-x-2.5 sm:space-x-3">
        {/* Replay 3D Landing Button */}
        <button
          onClick={onReplayCinematic}
          title="Return to 3D interactive flight scene"
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-md bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#334155] hover:text-[#0F172A] text-xs font-medium border border-[#CBD5E1] transition-colors cursor-pointer"
        >
          <Eye className="w-3.5 h-3.5 text-[#0284C7]" />
          <span className="hidden sm:inline">3D Flight View</span>
        </button>

        {/* Operational Status Dot */}
        <div className="flex items-center space-x-2 px-3 py-1.5 rounded-md bg-[#F0FDF4] border border-[#BBF7D0] text-xs text-[#166534] font-medium">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="font-semibold hidden sm:inline">Operational</span>
        </div>

        {/* Active AI / Neural Resolution Engine */}
        {activeProvider && (
          <div className="hidden xl:flex items-center space-x-1.5 px-2.5 py-1.5 rounded-md bg-[#F0F9FF] border border-[#BAE6FD] text-[11px] text-[#0369A1] font-mono font-semibold">
            <span>⚡ {activeProvider}</span>
          </div>
        )}

        {/* Live Clock */}
        <div className="font-mono text-xs text-[#0F172A] font-semibold bg-[#F8FAFC] px-2.5 py-1.5 rounded border border-[#E2E8F0] tracking-wider hidden sm:block">
          {currentTime || '00:00:00'} IST
        </div>
      </div>
    </header>
  );
};
