import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import { CUSTOMERS, CustomerProfile } from '../data/customers';
import { PolicyEngine } from '../policy/engine';
import { generateAgentResponse, setRuntimeApiKey, getRuntimeApiKey } from '../gemini/client';

const router = Router();

export interface AuditRecord {
  id: string;
  timestamp: string; // e.g., "08:42:15 UTC"
  isoTimestamp: string;
  customerId: string;
  customerName: string;
  eventType: string;
  details: string;
  policyRef?: string;
  severity?: 'normal' | 'warning' | 'critical' | 'success';
}

// In-memory persistent audit log separated by customer
const auditLogs: Record<string, AuditRecord[]> = {
  priya: [],
  arvind: [],
  meher: [],
};

// Seed initial audit log for active duty initialization on 23 Sep 2026
function getFormattedTime(): string {
  const now = new Date();
  return now.toTimeString().split(' ')[0] + ' IST';
}

function initCustomerAudit(customerId: string) {
  if (auditLogs[customerId] && auditLogs[customerId].length === 0) {
    const cust = CUSTOMERS[customerId];
    if (cust) {
      auditLogs[customerId].push({
        id: `aud-${Date.now()}-init`,
        timestamp: getFormattedTime(),
        isoTimestamp: new Date().toISOString(),
        customerId,
        customerName: cust.name,
        eventType: 'Disruption Event Loaded',
        details: cust.disruptionSummary,
        policyRef: 'Airline Disruption Data Pack 23 Sep 2026',
        severity: 'warning',
      });
    }
  }
}

// Initialize for each customer
Object.keys(CUSTOMERS).forEach(initCustomerAudit);

/**
 * Health check
 */
router.get('/health', (req, res) => {
  const runtimeKey = getRuntimeApiKey();
  const geminiKey = process.env.GEMINI_API_KEY;
  const geminiConfigured = (!!geminiKey && geminiKey !== 'MY_GEMINI_API_KEY' && geminiKey.trim() !== '') || runtimeKey?.provider === 'gemini';
  const grokKey = process.env.GROK_API_KEY || process.env.XAI_API_KEY;
  const grokConfigured = (!!grokKey && grokKey !== 'MY_GROK_API_KEY' && grokKey.trim() !== '') || runtimeKey?.provider === 'grok';
  const groqKey = process.env.GROQ_API_KEY;
  const groqConfigured = (!!groqKey && groqKey !== 'MY_GROQ_API_KEY' && groqKey.trim() !== '') || runtimeKey?.provider === 'groq';

  let activeProvider = 'Instant Resolution Engine';
  if (runtimeKey) {
    activeProvider = runtimeKey.provider === 'grok' ? 'xAI Grok Live' : runtimeKey.provider === 'groq' ? 'Groq LPU Live' : `Gemini (${process.env.GEMINI_MODEL || '3.5 Flash Lite'})`;
  } else if (geminiConfigured) {
    activeProvider = `Gemini (${process.env.GEMINI_MODEL || '3.5 Flash Lite'})`;
  } else if (grokConfigured) {
    activeProvider = 'xAI Grok Live';
  } else if (groqConfigured) {
    activeProvider = 'Groq LPU (Ultra-Fast)';
  }

  res.json({
    status: 'ok',
    system: 'AIONOS AIR Resolution Control',
    operationalDate: 'Wednesday, 23 September 2026',
    groqConfigured,
    grokConfigured,
    geminiConfigured,
    instantEngineActive: true,
    activeProvider,
    geminiModel: process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite',
    groqModel: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
  });
});

/**
 * Configure runtime custom API Key (xAI Grok, Google Gemini, or Groq)
 */
router.post('/config/key', (req, res) => {
  const { apiKey, provider } = req.body;
  if (!apiKey || typeof apiKey !== 'string' || apiKey.trim() === '') {
    setRuntimeApiKey('');
    return res.json({ success: true, message: 'Custom API key cleared. Using live resolution engine default.' });
  }

  setRuntimeApiKey(apiKey, provider);
  const runtime = getRuntimeApiKey();
  const providerLabel = runtime?.provider === 'grok' ? 'xAI Grok' : runtime?.provider === 'groq' ? 'Groq' : 'Gemini';
  res.json({
    success: true,
    provider: runtime?.provider,
    message: `Active provider configured: ${providerLabel}.`,
  });
});

/**
 * Get all customers
 */
router.get('/customers', (req, res) => {
  const list = Object.values(CUSTOMERS).map((customer) => {
    const eligibility = PolicyEngine.getEligibility(customer);
    return {
      ...customer,
      eligibility,
    };
  });
  res.json(list);
});

/**
 * Get single customer
 */
router.get('/customers/:id', (req, res) => {
  const { id } = req.params;
  const customer = CUSTOMERS[id];
  if (!customer) {
    return res.status(404).json({ error: 'Customer not found' });
  }
  const eligibility = PolicyEngine.getEligibility(customer);
  res.json({
    ...customer,
    eligibility,
  });
});

/**
 * Get audit trail for customer
 */
router.get('/audit/:customerId', (req, res) => {
  const { customerId } = req.params;
  const logs = auditLogs[customerId] || [];
  res.json(logs);
});

/**
 * Log an audit event (e.g. customer selected, screen interaction)
 */
router.post('/audit/:customerId', (req, res) => {
  const { customerId } = req.params;
  const customer = CUSTOMERS[customerId];
  if (!customer) {
    return res.status(404).json({ error: 'Customer not found' });
  }

  const { eventType, details, policyRef, severity } = req.body;
  const record: AuditRecord = {
    id: `aud-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    timestamp: getFormattedTime(),
    isoTimestamp: new Date().toISOString(),
    customerId,
    customerName: customer.name,
    eventType: eventType || 'System Event',
    details: details || '',
    policyRef,
    severity: severity || 'normal',
  };

  if (!auditLogs[customerId]) {
    auditLogs[customerId] = [];
  }
  auditLogs[customerId].unshift(record);

  res.json({ success: true, record });
});

/**
 * Main Chat Endpoint
 * Architecture:
 * USER MESSAGE -> SERVER -> ACTIVE CUSTOMER -> CUSTOMER DATA -> RELEVANT POLICY -> CONVERSATION HISTORY -> DETERMINISTIC POLICY CHECK -> GEMINI -> RESPONSE -> SOURCES + TRACE + AUDIT
 */
router.post('/chat', async (req, res) => {
  const { customerId, message, conversationHistory = [], apiKey } = req.body;

  if (!customerId || !message) {
    return res.status(400).json({ error: 'Missing customerId or message' });
  }

  const customer = CUSTOMERS[customerId];
  if (!customer) {
    return res.status(404).json({ error: 'Customer not found' });
  }

  // 1. Log Intent Inbound
  const intentRecord: AuditRecord = {
    id: `aud-${Date.now()}-msg`,
    timestamp: getFormattedTime(),
    isoTimestamp: new Date().toISOString(),
    customerId,
    customerName: customer.name,
    eventType: 'Customer Message Received',
    details: `User query: "${message.slice(0, 100)}${message.length > 100 ? '...' : ''}"`,
    severity: 'normal',
  };
  auditLogs[customerId].unshift(intentRecord);

  // 2. Deterministic Policy Check
  const guardrail = PolicyEngine.evaluateMessage(customer, message, conversationHistory);

  // 3. Log Policy Evaluation to Audit
  const policyAuditRecord: AuditRecord = {
    id: `aud-${Date.now()}-chk`,
    timestamp: getFormattedTime(),
    isoTimestamp: new Date().toISOString(),
    customerId,
    customerName: customer.name,
    eventType: guardrail.requiresEscalation ? 'Guardrail Triggered: Escalation Required' : 'Policy Checked & Validated',
    details: guardrail.requiresEscalation
      ? `${guardrail.escalationReason || 'Policy constraint active'}`
      : `Intent [${guardrail.intent}] evaluated against ${guardrail.sources.servicePolicy.length} policy clauses.`,
    policyRef: guardrail.sources.servicePolicy[0]?.rule || 'Service Rules',
    severity: guardrail.requiresEscalation ? 'warning' : 'normal',
  };
  auditLogs[customerId].unshift(policyAuditRecord);

  // 4. Call LLM (Groq / xAI Grok / Gemini) or provide stateful verified instant fallback
  const aiResult = await generateAgentResponse(customer, message, conversationHistory, guardrail, apiKey);

  // 5. Structure final message payload
  const agentResponse = {
    id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    role: 'agent',
    text: aiResult.text,
    isUnavailable: aiResult.isUnavailable,
    provider: aiResult.provider,
    factsFallback: aiResult.factsFallback,
    sources: guardrail.sources,
    trace: guardrail.trace,
    suggestedActions: guardrail.allowedActions,
    timestamp: getFormattedTime(),
  };

  res.json({
    agentResponse,
    auditEvents: [intentRecord, policyAuditRecord],
  });
});

/**
 * Action Execution Endpoint
 * Action states: AVAILABLE -> PROCESSING -> COMPLETED | ESCALATION REQUIRED | NOT ELIGIBLE | FAILED
 */
router.post('/action', (req, res) => {
  const { customerId, actionType, params = {} } = req.body;

  if (!customerId || !actionType) {
    return res.status(400).json({ error: 'Missing customerId or actionType' });
  }

  const customer = CUSTOMERS[customerId];
  if (!customer) {
    return res.status(404).json({ error: 'Customer not found' });
  }

  // 1. Log Action Initiated
  const initAudit: AuditRecord = {
    id: `aud-${Date.now()}-act-init`,
    timestamp: getFormattedTime(),
    isoTimestamp: new Date().toISOString(),
    customerId,
    customerName: customer.name,
    eventType: 'Action Initiated',
    details: `Initiated [${actionType}] for PNR ${customer.bookingReference}.`,
    severity: 'normal',
  };
  auditLogs[customerId].unshift(initAudit);

  // 2. Deterministic Execution Verification
  const result = PolicyEngine.executeAction(customer, actionType, params);

  // 3. Log Outcome to Audit
  const completeAudit: AuditRecord = {
    id: `aud-${Date.now()}-act-done`,
    timestamp: getFormattedTime(),
    isoTimestamp: new Date().toISOString(),
    customerId,
    customerName: customer.name,
    eventType: result.auditEvent.action,
    details: `${result.message} ${result.details}`,
    policyRef: result.auditEvent.policyRule,
    severity:
      result.status === 'COMPLETED'
        ? 'success'
        : result.status === 'ESCALATION_REQUIRED'
        ? 'warning'
        : 'critical',
  };
  auditLogs[customerId].unshift(completeAudit);

  res.json({
    status: result.status,
    message: result.message,
    details: result.details,
    auditEvent: completeAudit,
  });
});

/**
 * Download Standalone Executive PowerPoint Presentation (.pptx)
 */
router.get('/presentation/download', (req, res) => {
  const possiblePaths = [
    path.join(process.cwd(), 'AIONOS_AIR_Executive_Presentation.pptx'),
    path.join(process.cwd(), 'public', 'AIONOS_AIR_Executive_Presentation.pptx'),
    path.join(process.cwd(), 'dist', 'AIONOS_AIR_Executive_Presentation.pptx'),
    path.join(__dirname, '..', '..', 'AIONOS_AIR_Executive_Presentation.pptx'),
    path.join(__dirname, '..', '..', 'public', 'AIONOS_AIR_Executive_Presentation.pptx'),
  ];
  const filePath = possiblePaths.find((p) => fs.existsSync(p));
  if (filePath) {
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
    res.setHeader('Content-Disposition', 'attachment; filename="AIONOS_AIR_Executive_Presentation.pptx"');
    res.sendFile(filePath);
  } else {
    res.status(404).json({ error: 'Presentation file not found. Run pptx generator first.' });
  }
});

export default router;
