import type { ImpactAnalysis } from '@/lib/impact-schema';

/** A realistic, hand-checked example shown before the user runs their own analysis. */
export const SAMPLE_PROFILE = 'EV battery startup';
/** For use mid-sentence: “an example for an EV battery startup”. */
export const SAMPLE_PROFILE_PHRASE = 'an EV battery startup';

export const SAMPLE_ANALYSIS: ImpactAnalysis = {
  headline: 'Lithium and cobalt supply shock threatens EV battery production',
  riskScore: 78,
  exposure:
    'The startup relies on concentrated cobalt and lithium sources, high shipping costs and few suppliers, which exposes it to geopolitical and commodity price swings.',
  metrics: [
    { label: 'Lead time', value: '+3–5 wks', trend: 'up' },
    { label: 'Cost volatility', value: '±15%', trend: 'up' },
    { label: 'Inventory turnover', value: '4x', trend: 'flat' },
    { label: 'Carbon footprint', value: '0.8 kg/kWh', trend: 'down' },
  ],
  levels: {
    macro: {
      title: 'Macro-level risks',
      summary: 'Global forces shaping raw material availability and cost.',
      nodes: [
        { id: 'm1', title: 'Geopolitical tensions', detail: 'China–US trade friction and the Russia–Ukraine conflict disrupt critical mineral flows.', severity: 'high' },
        { id: 'm2', title: 'Lithium price surge', detail: 'Demand from EV makers outpaces new mine supply, pushing spot prices up.', severity: 'high' },
      ],
    },
    regional: {
      title: 'Regional risks',
      summary: 'Country-specific supply and logistics pressure.',
      nodes: [
        { id: 'r1', title: 'China manufacturing concentration', detail: 'Over 70% of battery components are refined or made in China.', severity: 'critical' },
        { id: 'r2', title: 'Red Sea shipping diversions', detail: 'Cape routing adds about two weeks and fuel surcharges to Asia–Europe freight.', severity: 'high' },
      ],
    },
    direct: {
      title: 'Direct operational risks',
      summary: 'Immediate threats to production and cost control.',
      nodes: [
        { id: 'd1', title: 'Supplier concentration', detail: 'Only two cobalt suppliers, one of them in Congo.', severity: 'critical' },
        { id: 'd2', title: 'Logistics bottleneck', detail: 'Cell shipments slip 3–5 weeks, stalling pilot production runs.', severity: 'high' },
      ],
    },
  },
  links: [
    { from: 'm1', to: 'r1', label: 'export controls' },
    { from: 'm2', to: 'r1', label: 'refining squeeze' },
    { from: 'm1', to: 'r2', label: 'shipping risk' },
    { from: 'r1', to: 'd1', label: 'single source' },
    { from: 'r2', to: 'd2', label: 'longer transit' },
  ],
  playbook: [
    {
      phase: 'Immediate',
      horizon: '0–7 days',
      actions: [
        { title: 'Lock 6-month cobalt contracts', detail: 'Request forward quotes from both suppliers and cap price exposure.', priority: 'P0', owner: 'Procurement' },
        { title: 'Add two weeks of cell buffer', detail: 'Pre-order cells for the next two pilot runs.', priority: 'P0', owner: 'Operations' },
      ],
    },
    {
      phase: 'Short-term',
      horizon: '2–6 weeks',
      actions: [
        { title: 'Qualify a non-China cell supplier', detail: 'Start samples with a Korean or Indian cell maker.', priority: 'P1', owner: 'Engineering' },
        { title: 'Re-quote freight on two routes', detail: 'Compare Cape routing with air for urgent parts.', priority: 'P1', owner: 'Logistics' },
      ],
    },
    {
      phase: 'Strategic',
      horizon: '1–6 months',
      actions: [
        { title: 'Pilot an LFP chemistry variant', detail: 'Cut cobalt dependence for the entry model.', priority: 'P2', owner: 'R&D' },
        { title: 'Sign a recycling feedstock deal', detail: 'Cover 10–15% of material demand from recovered cells.', priority: 'P2', owner: 'Business development' },
      ],
    },
  ],
};
