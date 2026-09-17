import { CustomerProfile, ChatMessage, AuditRecord, ActionStatus } from '../types';

export interface HealthResponse {
  status: string;
  system: string;
  operationalDate: string;
  geminiConfigured: boolean;
  geminiModel: string;
  groqConfigured?: boolean;
  grokConfigured?: boolean;
  instantEngineActive?: boolean;
  activeProvider?: string;
  groqModel?: string;
}

export interface ChatResponse {
  agentResponse: ChatMessage;
  auditEvents: AuditRecord[];
}

export interface ActionResponse {
  status: ActionStatus;
  message: string;
  details: string;
  auditEvent: AuditRecord;
}

export async function fetchHealth(): Promise<HealthResponse> {
  const res = await fetch('/api/health');
  if (!res.ok) throw new Error('Health check failed');
  return res.json();
}

export async function setServerApiKey(
  apiKey: string,
  provider?: 'grok' | 'gemini' | 'groq'
): Promise<{ success: boolean; provider?: string; message: string }> {
  const res = await fetch('/api/config/key', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey, provider }),
  });
  return res.json();
}

export async function fetchCustomers(): Promise<CustomerProfile[]> {
  const res = await fetch('/api/customers');
  if (!res.ok) throw new Error('Failed to fetch customers');
  return res.json();
}

export async function fetchCustomer(id: string): Promise<CustomerProfile> {
  const res = await fetch(`/api/customers/${id}`);
  if (!res.ok) throw new Error(`Failed to fetch customer ${id}`);
  return res.json();
}

export async function fetchAuditLogs(customerId: string): Promise<AuditRecord[]> {
  const res = await fetch(`/api/audit/${customerId}`);
  if (!res.ok) throw new Error(`Failed to fetch audit logs for ${customerId}`);
  return res.json();
}

export async function sendChatMessage(
  customerId: string,
  message: string,
  conversationHistory: Array<{ role: string; text: string }> = [],
  signal?: AbortSignal,
  apiKey?: string
): Promise<ChatResponse> {
  const activeKey = apiKey || (typeof window !== 'undefined' ? localStorage.getItem('aionos_custom_api_key') || undefined : undefined);
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ customerId, message, conversationHistory, apiKey: activeKey }),
    signal,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Network response error' }));
    throw new Error(err.error || 'Failed to send chat message');
  }
  return res.json();
}

export async function executeCustomerAction(
  customerId: string,
  actionType: string,
  params: Record<string, any> = {}
): Promise<ActionResponse> {
  const res = await fetch('/api/action', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ customerId, actionType, params }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Action request failed' }));
    throw new Error(err.error || 'Failed to execute action');
  }
  return res.json();
}

export async function logClientAuditEvent(
  customerId: string,
  eventType: string,
  details: string,
  policyRef?: string,
  severity: 'normal' | 'warning' | 'critical' | 'success' = 'normal'
): Promise<AuditRecord> {
  const res = await fetch(`/api/audit/${customerId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ eventType, details, policyRef, severity }),
  });
  if (!res.ok) throw new Error('Failed to log audit event');
  const data = await res.json();
  return data.record;
}
