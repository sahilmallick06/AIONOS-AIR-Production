import React, { useState, useRef, useEffect } from 'react';
import { CustomerProfile, ChatMessage, FactsFallback } from '../types';
import { TraceVisualizer } from './TraceVisualizer';
import { setServerApiKey } from '../services/api';
import {
  Send,
  Bot,
  User,
  AlertCircle,
  FileText,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  RefreshCw,
  Eye,
  EyeOff,
  Mic,
  MicOff,
  Radio,
  Square,
  Zap,
  Clock,
  ArrowRight,
  Key,
  Sliders,
  Cpu,
  Check,
  X,
} from 'lucide-react';

interface ChatPanelProps {
  customer: CustomerProfile;
  messages: ChatMessage[];
  isLoading: boolean;
  onSendMessage: (text: string) => void;
  onExecuteAction: (actionType: string) => void;
  onOpenVerifiedFacts: (facts: FactsFallback) => void;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
  customer,
  messages,
  isLoading,
  onSendMessage,
  onExecuteAction,
  onOpenVerifiedFacts,
}) => {
  const [inputText, setInputText] = useState('');
  const [showDebugTrace, setShowDebugTrace] = useState(false);
  const [expandedSources, setExpandedSources] = useState<Record<string, boolean>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Custom API Key & Model Configuration Modal State
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<'grok' | 'gemini' | 'groq'>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('aionos_custom_provider');
      if (stored === 'grok' || stored === 'gemini' || stored === 'groq') return stored;
    }
    return 'grok';
  });
  const [customKeyInput, setCustomKeyInput] = useState(() =>
    typeof window !== 'undefined' ? localStorage.getItem('aionos_custom_api_key') || '' : ''
  );
  const [keySavedStatus, setKeySavedStatus] = useState<string | null>(null);
  const [isSavingKey, setIsSavingKey] = useState(false);

  // Live Speech Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<any>(null);

  // Live Streaming Typewriter State for Bot Responses
  const [streamingState, setStreamingState] = useState<{ id: string; length: number; done: boolean } | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, streamingState]);

  // Manage Live Streaming Typewriter Effect
  useEffect(() => {
    const lastMsg = messages[messages.length - 1];
    if (lastMsg && lastMsg.role === 'agent' && !lastMsg.id.startsWith('init-')) {
      if (!streamingState || streamingState.id !== lastMsg.id) {
        setStreamingState({ id: lastMsg.id, length: 0, done: false });
      }
    }
  }, [messages]);

  useEffect(() => {
    if (!streamingState || streamingState.done) return;

    const currentMsg = messages.find((m) => m.id === streamingState.id);
    if (!currentMsg) {
      setStreamingState(null);
      return;
    }

    if (streamingState.length >= currentMsg.text.length) {
      setStreamingState((prev) => (prev ? { ...prev, done: true } : null));
      return;
    }

    const timer = setTimeout(() => {
      setStreamingState((prev) => {
        if (!prev) return null;
        const nextLen = Math.min(prev.length + 4, currentMsg.text.length);
        return {
          ...prev,
          length: nextLen,
          done: nextLen >= currentMsg.text.length,
        };
      });
    }, 18);

    return () => clearTimeout(timer);
  }, [streamingState, messages]);

  const completeStreamingImmediately = (msgId: string) => {
    const msg = messages.find((m) => m.id === msgId);
    if (msg) {
      setStreamingState({ id: msgId, length: msg.text.length, done: true });
    }
  };

  // Live Speech Recognition Handlers
  const startRecording = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setVoiceNotice('Live speech recognition is not supported in this browser. Please use text input.');
      setTimeout(() => setVoiceNotice(null), 4000);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsRecording(true);
        setRecordingSeconds(0);
        timerRef.current = setInterval(() => {
          setRecordingSeconds((prev) => prev + 1);
        }, 1000);
      };

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = 0; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setInputText(transcript);
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        stopRecording();
        if (event.error === 'not-allowed') {
          setVoiceNotice('Microphone access was denied. Please allow microphone permissions.');
        } else if (event.error === 'no-speech') {
          setVoiceNotice('No speech detected. Please try speaking again.');
        } else {
          setVoiceNotice(`Audio recording: ${event.error}`);
        }
        setTimeout(() => setVoiceNotice(null), 4000);
      };

      recognition.onend = () => {
        stopRecording();
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('Failed to start speech recognition:', err);
      stopRecording();
      setVoiceNotice('Could not initialize microphone. Please check permissions.');
      setTimeout(() => setVoiceNotice(null), 4000);
    }
  };

  const stopRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
      recognitionRef.current = null;
    }
    setIsRecording(false);
    setRecordingSeconds(0);
  };

  const handleStopAndSendVoice = () => {
    const textToSend = inputText.trim();
    stopRecording();
    if (textToSend && !isLoading) {
      setInputText('');
      onSendMessage(textToSend);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isLoading) return;
    const msg = inputText.trim();
    setInputText('');
    if (isRecording) {
      stopRecording();
    }
    onSendMessage(msg);
  };

  const toggleSource = (msgId: string) => {
    setExpandedSources((prev) => ({
      ...prev,
      [msgId]: !prev[msgId],
    }));
  };

  // Save / Clear custom API Key
  const handleSaveCustomKey = async () => {
    setIsSavingKey(true);
    const key = customKeyInput.trim();
    if (typeof window !== 'undefined') {
      if (key) {
        localStorage.setItem('aionos_custom_api_key', key);
        localStorage.setItem('aionos_custom_provider', selectedProvider);
      } else {
        localStorage.removeItem('aionos_custom_api_key');
        localStorage.removeItem('aionos_custom_provider');
      }
    }
    try {
      const res = await setServerApiKey(key, selectedProvider);
      setKeySavedStatus(res.message || 'Configuration saved successfully');
      setTimeout(() => {
        setKeySavedStatus(null);
        setShowKeyModal(false);
      }, 1000);
    } catch {
      setKeySavedStatus('Saved to browser storage.');
      setTimeout(() => {
        setKeySavedStatus(null);
        setShowKeyModal(false);
      }, 1000);
    } finally {
      setIsSavingKey(false);
    }
  };

  // Contextual Interactive Actions inside Agent Messages
  const getContextualActions = (msgText: string) => {
    const lower = msgText.toLowerCase();
    const actions: Array<{ label: string; prompt: string; variant: 'primary' | 'secondary' | 'warning' }> = [];

    const isRefundDone =
      lower.includes('initiated your full refund') ||
      lower.includes('full refund has been initiated') ||
      lower.includes('refund is already processed');

    const isRebookDone =
      lower.includes('confirmed your free priority rebooking') ||
      lower.includes('rebooked on the next available flight') ||
      lower.includes('already rebooked');

    const isVoucherDone =
      lower.includes('meal voucher and departure lounge access') ||
      lower.includes('meal voucher and lounge access pass') ||
      lower.includes('lounge access pass and meal voucher have been issued');

    const isHotelDone =
      lower.includes('hotel accommodation covering the delayed hours') ||
      lower.includes('hotel accommodation has been arranged');

    if (customer.id === 'priya') {
      if (isRefundDone) {
        actions.push({
          label: '📅 Verify Return Flight Status (25 Sep)',
          prompt: 'What about my return flight from Goa on 25 September?',
          variant: 'primary',
        });
        actions.push({
          label: '🕒 Check Refund Timeline',
          prompt: 'How long does the refund take to credit?',
          variant: 'secondary',
        });
        actions.push({
          label: '🧳 Ask About Baggage',
          prompt: 'Where is my baggage?',
          variant: 'secondary',
        });
      } else if (isRebookDone) {
        actions.push({
          label: '📅 Verify Return Flight Status (25 Sep)',
          prompt: 'What about my return flight from Goa on 25 September?',
          variant: 'primary',
        });
        actions.push({
          label: '🧳 Ask About Baggage',
          prompt: 'Where is my baggage?',
          variant: 'secondary',
        });
      } else {
        if (lower.includes('escalat') || lower.includes('supervisor') || lower.includes('ticket')) {
          actions.push({
            label: '✈️ Rebook Next Available Flight',
            prompt: 'Please confirm my priority rebooking on the next available flight within 24 hours.',
            variant: 'primary',
          });
          actions.push({
            label: '⚡ Request Full Refund',
            prompt: 'Please process my full refund now.',
            variant: 'secondary',
          });
          actions.push({
            label: '❓ What happens now with my escalation?',
            prompt: 'What happens now with my escalation?',
            variant: 'secondary',
          });
        } else {
          if (lower.includes('refund') || lower.includes('full refund') || lower.includes('7 business days')) {
            actions.push({
              label: '⚡ Request Full Refund',
              prompt: 'Please process my full refund now.',
              variant: 'primary',
            });
          }
          if (lower.includes('rebook') || lower.includes('next available flight') || lower.includes('24 hours')) {
            actions.push({
              label: '✈️ Rebook Next Available Flight',
              prompt: 'Please confirm my priority rebooking on the next available flight within 24 hours.',
              variant: 'primary',
            });
          }
          if (lower.includes('upgrade') || lower.includes('business class') || lower.includes('loyalty')) {
            actions.push({
              label: '🛡️ Request Supervisor Policy Review',
              prompt: 'Can you escalate this to a supervisor for an upgrade exception?',
              variant: 'warning',
            });
          }
          actions.push({
            label: '📅 Check Return Flight (25 Sep)',
            prompt: 'What about my return flight from Goa on 25 September?',
            variant: 'secondary',
          });
          actions.push({
            label: '🧳 Ask About Baggage',
            prompt: 'Where is my baggage?',
            variant: 'secondary',
          });
        }
      }
    } else if (customer.id === 'arvind') {
      if (lower.includes('escalat') || lower.includes('supervisor') || lower.includes('ticket')) {
        actions.push({
          label: '🍽️ Issue Meal Voucher & Lounge Access',
          prompt: 'Give me my lounge access.',
          variant: 'primary',
        });
        actions.push({
          label: '🕒 Check Flight Status (SK-118)',
          prompt: 'My flight is delayed.',
          variant: 'secondary',
        });
        actions.push({
          label: '❓ What happens now with my escalation?',
          prompt: 'What happens now with my escalation?',
          variant: 'secondary',
        });
      } else if (isVoucherDone) {
        actions.push({
          label: '🕒 Check Flight Status (SK-118)',
          prompt: 'My flight is delayed.',
          variant: 'primary',
        });
        actions.push({
          label: '🛡️ Escalate Hotel Exception to Supervisor',
          prompt: 'Please escalate my hotel request to a supervisor.',
          variant: 'warning',
        });
      } else {
        if (lower.includes('voucher') || lower.includes('lounge') || lower.includes('meal')) {
          actions.push({
            label: '🍽️ Issue Meal Voucher & Lounge Access',
            prompt: 'Give me my lounge access.',
            variant: 'primary',
          });
        }
        if (lower.includes('hotel') || lower.includes('5 hours')) {
          actions.push({
            label: '🍽️ Claim Eligible Amenities (Lounge & Voucher)',
            prompt: 'Give me my lounge access.',
            variant: 'primary',
          });
          actions.push({
            label: '🛡️ Escalate Hotel Request to Supervisor',
            prompt: 'Please escalate my hotel request to a supervisor.',
            variant: 'warning',
          });
        }
        actions.push({
          label: '🕒 Check Flight Status (SK-118)',
          prompt: 'My flight is delayed.',
          variant: 'secondary',
        });
      }
    } else if (customer.id === 'meher') {
      if (lower.includes('escalat') || lower.includes('supervisor') || lower.includes('ticket')) {
        actions.push({
          label: '🏨 Arrange Hotel for Delayed Hours',
          prompt: 'Can I get a hotel?',
          variant: 'primary',
        });
        actions.push({
          label: '🕒 Revised Flight Status (20:00)',
          prompt: 'My flight is delayed 6 hours.',
          variant: 'secondary',
        });
        actions.push({
          label: '❓ What happens now with my escalation?',
          prompt: 'What happens now with my escalation?',
          variant: 'secondary',
        });
      } else if (isHotelDone) {
        actions.push({
          label: '🕒 Revised Flight Status (20:00)',
          prompt: 'My flight is delayed 6 hours.',
          variant: 'primary',
        });
        actions.push({
          label: '💎 Check Compensation Entitlements',
          prompt: 'Can I get compensation?',
          variant: 'secondary',
        });
      } else {
        if (lower.includes('hotel') || lower.includes('delayed hours') || lower.includes('20:00')) {
          actions.push({
            label: '🏨 Arrange Hotel for Delayed Hours',
            prompt: 'Can I get a hotel?',
            variant: 'primary',
          });
        }
        if (lower.includes('2,000') || lower.includes('fare difference') || lower.includes('1,500') || lower.includes('waive')) {
          actions.push({
            label: '🛡️ Escalate Fare Waiver to Supervisor',
            prompt: 'Please escalate the ₹2,000 fare difference waiver to a supervisor.',
            variant: 'warning',
          });
        }
        if (lower.includes('full night') || lower.includes('night stay')) {
          actions.push({
            label: '🛡️ Escalate Full Night Hotel to Supervisor',
            prompt: 'Please escalate my full night hotel request to a supervisor.',
            variant: 'warning',
          });
        }
        actions.push({
          label: '💎 Inquire Delay Compensation',
          prompt: 'Can I get compensation?',
          variant: 'secondary',
        });
      }
    }

    return actions.slice(0, 3);
  };

  // Scenario Quick Evaluation Suggestions
  const getSuggestions = () => {
    if (customer.id === 'priya') {
      return [
        'What are my options?',
        'Can you refund me?',
        'How long will that take?',
        'What about my return flight?',
        'Can I get business class?',
        'Why cannot you upgrade me?',
        'Can you do that now?',
        'Where is my baggage?',
        'How much is my refund?',
        'Who is the Prime Minister?',
      ];
    }
    if (customer.id === 'arvind') {
      return [
        'My flight is delayed.',
        'Can I get a hotel?',
        'Why not?',
        'What am I entitled to?',
        'Give me my lounge access.',
        "I'm angry.",
        'Why was my flight delayed?',
        'What are you doing?',
      ];
    }
    if (customer.id === 'meher') {
      return [
        'My flight is delayed 6 hours.',
        'Can I get a hotel?',
        'I want a full night.',
        'Why not?',
        'I found another flight that costs ₹2,000 more.',
        'Can you waive it?',
        'Why not?',
        'Can I get compensation?',
      ];
    }
    return ['What is the status of my booking?'];
  };

  return (
    <div className="flex flex-col h-full bg-[#FFFFFF] rounded-xl border border-[#E2E8F0] shadow-xs overflow-hidden">
      {/* Active Conversation Sub-header */}
      <div className="px-4 py-3 bg-[#F8FAFC] border-b border-[#E2E8F0] flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-full bg-[#E0F2FE] text-[#0369A1] flex items-center justify-center font-bold text-xs">
            {customer.name.charAt(0)}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-[#0F172A]">{customer.name}</span>
              <span className="text-[11px] font-mono text-[#64748B]">({customer.bookingReference})</span>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <Radio className="w-2.5 h-2.5 mr-1 text-emerald-500 animate-pulse" />
                Live Channel
              </span>
            </div>
            <p className="text-[11px] text-[#475569] truncate max-w-sm sm:max-w-md">
              {customer.disruptionSummary}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Debug Trace Toggle */}
          <button
            type="button"
            onClick={() => setShowDebugTrace(!showDebugTrace)}
            title={showDebugTrace ? 'Hide internal policy trace & source debuggers' : 'Show internal policy trace & source debuggers'}
            className={`text-[11px] font-medium px-2.5 py-1 rounded-lg border transition-colors flex items-center space-x-1.5 cursor-pointer ${
              showDebugTrace
                ? 'bg-sky-50 border-sky-300 text-sky-800 font-semibold shadow-2xs'
                : 'bg-white border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            {showDebugTrace ? <EyeOff className="w-3.5 h-3.5 text-sky-600" /> : <Eye className="w-3.5 h-3.5 text-slate-400" />}
            <span className="hidden sm:inline">{showDebugTrace ? 'Trace: ON' : 'Trace: OFF'}</span>
            <span className="sm:hidden">{showDebugTrace ? 'ON' : 'OFF'}</span>
          </button>

          {/* AI Provider / API Key Settings Button */}
          <button
            type="button"
            onClick={() => setShowKeyModal(true)}
            title="Configure Grok API / AI Engine Settings"
            className="text-[11px] font-medium px-2.5 py-1 rounded-lg border border-purple-200 bg-purple-50/80 hover:bg-purple-100 text-purple-700 transition-colors flex items-center space-x-1.5 cursor-pointer shadow-2xs"
          >
            <Key className="w-3.5 h-3.5 text-purple-600" />
            <span className="hidden sm:inline">Grok / AI Engine</span>
            <span className="sm:hidden">Grok API</span>
          </button>

          <span className="text-[10px] font-mono uppercase bg-[#F0FDF4] text-[#166534] px-2 py-0.5 rounded border border-[#BBF7D0] font-semibold hidden md:inline-block">
            ● Live Iterative
          </span>
        </div>
      </div>

      {/* Voice Notification Toast */}
      {voiceNotice && (
        <div className="px-4 py-2 bg-amber-50 border-b border-amber-200 text-amber-800 text-xs flex items-center justify-between animate-fade-in">
          <div className="flex items-center space-x-1.5 font-medium">
            <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>{voiceNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setVoiceNotice(null)}
            className="text-amber-600 hover:text-amber-900 font-bold text-xs cursor-pointer ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Message List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
            <Bot className="w-10 h-10 text-[#94A3B8] mb-3" />
            <h3 className="text-sm font-bold text-[#334155] mb-1">
              Active Customer Resolution Channel
            </h3>
            <p className="text-xs text-[#64748B] max-w-md leading-relaxed">
              Communicate with {customer.name} using natural language or live voice recording. All responses strictly adhere to carrier policy guardrails.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isStreamingThis = streamingState && streamingState.id === msg.id && !streamingState.done;
            const displayedText = isStreamingThis ? msg.text.slice(0, streamingState.length) : msg.text;
            const contextualActions = msg.role === 'agent' && (!streamingState || streamingState.id !== msg.id || streamingState.done)
              ? getContextualActions(msg.text)
              : [];

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  msg.role === 'user' ? 'items-end' : 'items-start'
                }`}
              >
                <div
                  className={`max-w-[92%] sm:max-w-[85%] rounded-xl p-3.5 text-xs sm:text-sm leading-relaxed transition-all ${
                    msg.role === 'user'
                      ? 'bg-[#0369A1] text-white shadow-xs'
                      : 'bg-[#F8FAFC] text-[#0F172A] border border-[#E2E8F0]'
                  }`}
                  onClick={() => {
                    if (isStreamingThis) {
                      completeStreamingImmediately(msg.id);
                    }
                  }}
                >
                  {/* Role and Timestamp Header */}
                  <div className="flex items-center justify-between mb-1.5 space-x-3 text-[11px]">
                    <span className={`font-bold flex items-center space-x-1 ${msg.role === 'user' ? 'text-sky-100' : 'text-[#0369A1]'}`}>
                      {msg.role === 'user' ? (
                        <>
                          <User className="w-3.5 h-3.5 mr-1 inline" />
                          <span>{customer.name}</span>
                        </>
                      ) : (
                        <>
                          <Bot className="w-3.5 h-3.5 mr-1 inline" />
                          <span>AIONOS Resolution Agent</span>
                          {isStreamingThis && (
                            <span className="ml-1.5 px-1.5 py-0.2 text-[9px] font-mono bg-sky-200 text-sky-900 rounded font-bold animate-pulse">
                              ● Live Answering
                            </span>
                          )}
                          {!isStreamingThis && msg.provider === 'instant_engine' && (
                            <span className="ml-1.5 px-1.5 py-0.2 text-[9px] font-mono bg-sky-100 text-sky-800 rounded border border-sky-300 font-semibold">
                              ⚡ Verified Live Resolution
                            </span>
                          )}
                          {!isStreamingThis && msg.provider === 'groq' && (
                            <span className="ml-1.5 px-1.5 py-0.2 text-[9px] font-mono bg-amber-100 text-amber-800 rounded border border-amber-300 font-semibold">
                              ⚡ Groq LPU Live
                            </span>
                          )}
                          {!isStreamingThis && msg.provider === 'grok' && (
                            <span className="ml-1.5 px-1.5 py-0.2 text-[9px] font-mono bg-purple-100 text-purple-800 rounded border border-purple-300 font-semibold">
                              🚀 xAI Grok Live
                            </span>
                          )}
                          {!isStreamingThis && msg.provider === 'gemini' && (
                            <span className="ml-1.5 px-1.5 py-0.2 text-[9px] font-mono bg-indigo-100 text-indigo-800 rounded border border-indigo-300 font-semibold">
                              ✦ Gemini 3.6 Flash
                            </span>
                          )}
                        </>
                      )}
                    </span>
                    <span className={`font-mono text-[10px] ${msg.role === 'user' ? 'text-sky-200' : 'text-[#94A3B8]'}`}>
                      {msg.timestamp}
                    </span>
                  </div>

                  {/* Message Body with Live Cursor */}
                  <div className="whitespace-pre-wrap font-sans">
                    {displayedText}
                    {isStreamingThis && (
                      <span className="inline-block w-1.5 h-3.5 bg-sky-600 ml-1 animate-pulse align-middle" />
                    )}
                  </div>

                  {/* Skip Streaming Hint */}
                  {isStreamingThis && (
                    <div className="mt-1 text-[10px] text-sky-600 font-mono cursor-pointer hover:underline">
                      Click text to skip typing...
                    </div>
                  )}

                  {/* Contextual Interactive Action Buttons */}
                  {contextualActions.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-[#E2E8F0] flex flex-wrap gap-1.5">
                      {contextualActions.map((action, actIdx) => (
                        <button
                          key={actIdx}
                          type="button"
                          onClick={() => onSendMessage(action.prompt)}
                          disabled={isLoading}
                          className={`text-[11px] font-medium px-2.5 py-1 rounded-md transition-all flex items-center space-x-1 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                            action.variant === 'primary'
                              ? 'bg-[#0369A1] hover:bg-[#0284C7] text-white shadow-2xs font-semibold'
                              : action.variant === 'warning'
                              ? 'bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300'
                              : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-300'
                          }`}
                        >
                          <span>{action.label}</span>
                          <ArrowRight className="w-2.5 h-2.5 opacity-70" />
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Subtle inspect button when debug traces are hidden */}
                  {msg.role === 'agent' && (msg.trace || msg.sources) && !showDebugTrace && (
                    <div className="mt-2 pt-1.5 border-t border-[#F1F5F9] flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => setShowDebugTrace(true)}
                        className="text-[#94A3B8] hover:text-[#0284C7] flex items-center space-x-1 text-[10px] font-mono transition-colors cursor-pointer"
                        title="Show deterministic guardrail reasoning & policy sources"
                      >
                        <ShieldCheck className="w-3 h-3 text-sky-500" />
                        <span>Inspect Guardrail Trace & Sources</span>
                      </button>
                    </div>
                  )}

                  {/* SOURCES DRAWER (Shown when Debug Trace is ON) */}
                  {showDebugTrace && msg.sources && (
                    <div className="mt-3 pt-2.5 border-t border-[#E2E8F0]">
                      <button
                        onClick={() => toggleSource(msg.id)}
                        className="flex items-center justify-between w-full text-left text-[11px] font-semibold text-[#0369A1] hover:text-[#0284C7] cursor-pointer py-1"
                      >
                        <span className="flex items-center space-x-1.5">
                          <FileText className="w-3 h-3" />
                          <span>Sources: Booking Data & Service Policy</span>
                        </span>
                        {expandedSources[msg.id] ? (
                          <ChevronUp className="w-3 h-3" />
                        ) : (
                          <ChevronDown className="w-3 h-3" />
                        )}
                      </button>

                      {expandedSources[msg.id] && (
                        <div className="mt-2 space-y-2 bg-[#FFFFFF] p-2.5 rounded-lg border border-[#E2E8F0] text-[11px] font-mono text-[#334155]">
                          {/* Booking Data */}
                          <div>
                            <div className="text-[10px] uppercase font-bold text-[#64748B] mb-1">
                              • Booking Data
                            </div>
                            <div className="space-y-1">
                              {msg.sources.bookingData.map((b, idx) => (
                                <div key={idx} className="flex flex-col sm:flex-row sm:space-x-2">
                                  <span className="font-semibold text-[#0F172A]">{b.label}:</span>
                                  <span className="text-[#475569]">{b.value}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Service Policy */}
                          <div className="pt-2 border-t border-[#F1F5F9]">
                            <div className="text-[10px] uppercase font-bold text-[#64748B] mb-1">
                              • Service Policy Clauses
                            </div>
                            <div className="space-y-1.5">
                              {msg.sources.servicePolicy.map((p, idx) => (
                                <div
                                  key={idx}
                                  className={`p-1.5 rounded border text-[10px] leading-relaxed ${
                                    p.status === 'Exceeded'
                                      ? 'bg-[#FEF2F2] border-[#FECACA] text-[#991B1B]'
                                      : 'bg-[#F0FDF4] border-[#BBF7D0] text-[#166534]'
                                  }`}
                                >
                                  <span className="font-bold">[{p.status}] {p.rule}:</span> {p.clause}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* OPERATIONAL TRACE (Shown when Debug Trace is ON) */}
                  {showDebugTrace && msg.trace && <TraceVisualizer trace={msg.trace} />}
                </div>
              </div>
            );
          })
        )}

        {/* Loading Indicator during policy evaluation & response generation */}
        {isLoading && (
          <div className="flex flex-col items-start space-y-2">
            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3.5 py-2.5 max-w-[85%] text-xs text-[#475569] flex items-center space-x-2.5 shadow-2xs">
              <div className="flex space-x-1">
                <div className="w-1.5 h-1.5 rounded-full bg-[#0284C7] animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1.5 h-1.5 rounded-full bg-[#0284C7] animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1.5 h-1.5 rounded-full bg-[#0284C7] animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span className="font-medium text-slate-700 text-[11px]">Evaluating policy guardrails & generating live answer...</span>
            </div>
            {showDebugTrace && (
              <div className="w-full max-w-[85%]">
                <TraceVisualizer isProcessing={true} />
              </div>
            )}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggestion Chips */}
      <div className="px-4 py-2 bg-[#F8FAFC] border-t border-[#E2E8F0] overflow-x-auto">
        <div className="flex flex-wrap gap-1.5 pb-0.5">
          {getSuggestions().map((sugg, i) => (
            <button
              key={i}
              onClick={() => onSendMessage(sugg)}
              disabled={isLoading || isRecording}
              className="text-[11px] px-2.5 py-1 rounded-md bg-[#FFFFFF] hover:bg-[#F1F5F9] border border-[#CBD5E1] text-[#334155] hover:text-[#0F172A] transition-colors whitespace-nowrap cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sugg}
            </button>
          ))}
        </div>
      </div>

      {/* Live Voice Recording Status Bar (Active when recording) */}
      {isRecording && (
        <div className="px-4 py-2.5 bg-rose-50 border-t border-rose-200 flex items-center justify-between animate-pulse">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-ping" />
            <span className="text-xs font-bold text-rose-800 flex items-center space-x-1">
              <span>RECORDING LIVE</span>
              <span className="font-mono text-rose-700 ml-1">
                ({String(Math.floor(recordingSeconds / 60)).padStart(2, '0')}:{String(recordingSeconds % 60).padStart(2, '0')})
              </span>
            </span>
            <span className="text-xs text-rose-600 italic truncate max-w-xs sm:max-w-md">
              {inputText ? `"${inputText}"` : 'Listening to your voice... speak now'}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={stopRecording}
              className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleStopAndSendVoice}
              disabled={!inputText.trim()}
              className="px-3 py-1 text-xs font-bold text-white bg-rose-600 rounded hover:bg-rose-700 flex items-center space-x-1 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-3 h-3" />
              <span>Send Audio</span>
            </button>
          </div>
        </div>
      )}

      {/* Input Box & Voice Controls */}
      <form
        onSubmit={handleSubmit}
        className="p-3 bg-[#FFFFFF] border-t border-[#E2E8F0] flex items-center space-x-2"
      >
        {/* Live Microphone Recording Button */}
        <button
          type="button"
          onClick={isRecording ? stopRecording : startRecording}
          disabled={isLoading}
          title={isRecording ? 'Stop recording' : 'Record voice live (Speech Recognition)'}
          className={`p-2.5 rounded-lg border transition-all cursor-pointer flex items-center justify-center shrink-0 ${
            isRecording
              ? 'bg-rose-600 text-white border-rose-700 shadow-md ring-2 ring-rose-400 animate-pulse'
              : 'bg-[#F8FAFC] hover:bg-[#F1F5F9] text-slate-600 hover:text-slate-900 border-[#CBD5E1]'
          }`}
        >
          {isRecording ? <Square className="w-4 h-4 fill-current" /> : <Mic className="w-4 h-4" />}
        </button>

        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={
            isRecording
              ? 'Recording speech... speak clearly...'
              : `Ask anything about ${customer.name}'s flight disruption...`
          }
          disabled={isLoading}
          className="flex-1 px-3.5 py-2.5 text-xs sm:text-sm bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#0284C7] focus:border-transparent transition-all disabled:opacity-60"
        />

        <button
          type="submit"
          disabled={!inputText.trim() || isLoading}
          className="px-4 py-2.5 bg-[#0369A1] hover:bg-[#0284C7] text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 shadow-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shrink-0"
        >
          <span>Send</span>
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>

      {/* AI Engine & API Key Configuration Modal */}
      {showKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-fade-in">
            <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center">
                  <Key className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Grok & AI Engine Configuration</h3>
                  <p className="text-[11px] text-slate-500">Enable Grok API for unlimited grounded customer answering</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowKeyModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Provider Selection Tabs */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Select Active AI Engine
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedProvider('grok')}
                    className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all ${
                      selectedProvider === 'grok'
                        ? 'border-purple-600 bg-purple-50/70 text-purple-900 ring-1 ring-purple-600'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold">xAI Grok</span>
                      {selectedProvider === 'grok' && <Check className="w-3.5 h-3.5 text-purple-600" />}
                    </div>
                    <span className="text-[10px] text-purple-700 font-medium block">grok-2-latest</span>
                    <span className="text-[9px] text-slate-500 block mt-0.5">No rate limits</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedProvider('gemini')}
                    className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all ${
                      selectedProvider === 'gemini'
                        ? 'border-indigo-600 bg-indigo-50/70 text-indigo-900 ring-1 ring-indigo-600'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold">Google Gemini</span>
                      {selectedProvider === 'gemini' && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                    </div>
                    <span className="text-[10px] text-indigo-700 font-medium block">gemini-2.5-flash</span>
                    <span className="text-[9px] text-slate-500 block mt-0.5">Google DeepMind</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedProvider('groq')}
                    className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all ${
                      selectedProvider === 'groq'
                        ? 'border-sky-600 bg-sky-50/70 text-sky-900 ring-1 ring-sky-600'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold">Groq LPU</span>
                      {selectedProvider === 'groq' && <Check className="w-3.5 h-3.5 text-sky-600" />}
                    </div>
                    <span className="text-[10px] text-sky-700 font-medium block">llama-3.3-70b</span>
                    <span className="text-[9px] text-slate-500 block mt-0.5">Ultra-low latency</span>
                  </button>
                </div>
              </div>

              <div className="p-3 bg-purple-50/70 border border-purple-100 rounded-lg text-xs text-purple-950 space-y-1.5">
                <div className="font-semibold flex items-center space-x-1.5 text-purple-900">
                  <Cpu className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                  <span>Strict Grounding & Policy Adherence</span>
                </div>
                <p className="text-[11px] text-purple-800 leading-relaxed">
                  {selectedProvider === 'grok'
                    ? 'xAI Grok is configured with the full Assignment 3 Data Pack rules (delays, cancellation rebooking/refunds, loyalty limits, baggage/delay cause boundaries). Zero answering limits.'
                    : selectedProvider === 'gemini'
                    ? 'Google Gemini reasoning engine strictly constrained to the Assignment 3 Data Pack rules and verified customer facts.'
                    : 'Groq LPU provides ultra-fast generation constrained strictly to airline policy rules.'}
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  {selectedProvider === 'grok'
                    ? 'xAI Grok API Key'
                    : selectedProvider === 'gemini'
                    ? 'Google Gemini API Key'
                    : 'Groq API Key'}
                </label>
                <input
                  type="password"
                  value={customKeyInput}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCustomKeyInput(val);
                    if (val.trim().startsWith('xai-')) setSelectedProvider('grok');
                    else if (val.trim().startsWith('gsk_')) setSelectedProvider('groq');
                    else if (val.trim().startsWith('AIza')) setSelectedProvider('gemini');
                  }}
                  placeholder={
                    selectedProvider === 'grok'
                      ? 'Paste your xAI Grok API key (e.g. xai-...)'
                      : selectedProvider === 'gemini'
                      ? 'Paste Gemini key (AIza...)'
                      : 'Paste Groq key (gsk_...)'
                  }
                  className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white text-slate-900 transition-all"
                />
                <p className="mt-1 text-[10px] text-slate-500">
                  {selectedProvider === 'grok'
                    ? 'Get your key from console.x.ai. Auto-detects xai-... prefixes.'
                    : selectedProvider === 'gemini'
                    ? 'Uses environment GEMINI_API_KEY by default or your custom key.'
                    : 'Get your key from console.groq.com. Starts with gsk_...'}
                </p>
              </div>

              {keySavedStatus && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center space-x-1.5 font-medium">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>{keySavedStatus}</span>
                </div>
              )}

              <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setCustomKeyInput('');
                    if (typeof window !== 'undefined') {
                      localStorage.removeItem('aionos_custom_api_key');
                      localStorage.removeItem('aionos_custom_provider');
                    }
                    setServerApiKey('');
                    setKeySavedStatus('Key cleared. Default live engine active.');
                    setTimeout(() => {
                      setKeySavedStatus(null);
                      setShowKeyModal(false);
                    }, 1000);
                  }}
                  className="text-xs text-slate-500 hover:text-rose-600 font-medium transition-colors cursor-pointer"
                >
                  Clear Key
                </button>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowKeyModal(false)}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveCustomKey}
                    disabled={isSavingKey}
                    className="px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-xs flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <span>{isSavingKey ? 'Saving...' : 'Save & Activate'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
