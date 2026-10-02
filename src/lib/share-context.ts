// src/lib/share-context.ts
// Impact Copilot → Supply AI handoff.
// The analysis travels as a structured ATTACHMENT (rendered as a card in the UI),
// and is turned into a compact brief only when sent to the LLM — never shown as raw JSON.

import { ImpactAnalysis, LEVEL_ORDER, LevelKey } from './impact-schema';

export interface ImpactAttachment {
  kind: 'impact-analysis';
  profession: string;
  disruptionId?: string;
  disruptionTitle?: string;
  analysis: ImpactAnalysis;
  createdAt: number;
}

const PENDING_KEY = 'supply_ai_pending_context';
const MAX_AGE_MS = 10 * 60 * 1000;

export const LEVEL_LABEL: Record<LevelKey, string> = {
  macro: 'Level 1 · Macro',
  regional: 'Level 2 · Regional',
  direct: 'Level 3 · Direct',
};

/** Call on the Impact Copilot page right before navigating to /chat. */
export function stashImpactContext(input: Omit<ImpactAttachment, 'kind' | 'createdAt'>) {
  const payload: ImpactAttachment = { ...input, kind: 'impact-analysis', createdAt: Date.now() };
  try {
    sessionStorage.setItem(PENDING_KEY, JSON.stringify(payload));
  } catch (e) {
    console.error('Could not stash impact context', e);
  }
}

/**
 * Read the pending attachment WITHOUT removing it.
 * The chat page clears it only after the message is actually in a session —
 * otherwise a double mount (React StrictMode / dev) can consume and lose it.
 */
export function peekImpactContext(): ImpactAttachment | null {
  try {
    const raw = sessionStorage.getItem(PENDING_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ImpactAttachment;
    if (parsed?.kind !== 'impact-analysis' || !parsed.analysis?.levels) return null;
    if (Date.now() - (parsed.createdAt ?? 0) > MAX_AGE_MS) {
      sessionStorage.removeItem(PENDING_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearImpactContext() {
  try {
    sessionStorage.removeItem(PENDING_KEY);
  } catch {
    /* ignore */
  }
}

/** Read + clear in one go (kept for other callers). */
export function takeImpactContext(): ImpactAttachment | null {
  const ctx = peekImpactContext();
  if (ctx) clearImpactContext();
  return ctx;
}

/** Compact, model-friendly brief. This is what the LLM sees — not the user. */
export function attachmentToPrompt(att: ImpactAttachment): string {
  const a = att.analysis;
  const titleOf = new Map<string, string>();
  LEVEL_ORDER.forEach((k) => a.levels[k].nodes.forEach((n) => titleOf.set(n.id, n.title)));

  const lines: string[] = [
    '[Attached context: Impact Copilot analysis]',
    `Profile: ${att.profession}`,
  ];
  if (att.disruptionTitle) lines.push(`Disruption: ${att.disruptionTitle}`);
  lines.push(`Risk score: ${a.riskScore}/100 — ${a.headline}`);
  if (a.exposure) lines.push(`Exposure: ${a.exposure}`);

  for (const k of LEVEL_ORDER) {
    const lvl = a.levels[k];
    lines.push(`${LEVEL_LABEL[k]} (${lvl.title}):`);
    lvl.nodes.forEach((n) => lines.push(`  - ${n.title} [${n.severity}]${n.detail ? `: ${n.detail}` : ''}`));
  }

  if (a.links.length) {
    lines.push('Causal links:');
    a.links.forEach((l) =>
      lines.push(`  - ${titleOf.get(l.from) ?? l.from} → ${titleOf.get(l.to) ?? l.to}${l.label ? ` (${l.label})` : ''}`),
    );
  }

  if (a.playbook.length) {
    lines.push('Existing playbook:');
    a.playbook.forEach((p) =>
      lines.push(`  - ${p.phase} (${p.horizon}): ${p.actions.map((x) => `${x.title} [${x.priority}]`).join('; ')}`),
    );
  }

  if (a.metrics.length) {
    lines.push(`Key metrics: ${a.metrics.map((m) => `${m.label} ${m.value} (${m.trend})`).join(', ')}`);
  }

  lines.push('[End of attached context]');
  return lines.join('\n');
}