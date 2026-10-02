'use client';

import React, { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Cpu, Minus, RotateCcw, Sparkles, TrendingDown, TrendingUp } from 'lucide-react';
import { ImpactAnalysis, LEVEL_ORDER, normalizeAnalysis } from '@/lib/impact-schema';
import { stashImpactContext } from '@/lib/share-context';
import { Disruption, fetchDisruption } from '@/lib/disruptions';
import { decodeEntities } from '@/lib/text';
import { PageContainer, PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card, SectionHeading } from '@/components/ui/Card';
import { SeverityBadge } from '@/components/ui/Badge';
import { InlineError, Skeleton, Spinner } from '@/components/ui/Feedback';
import { RiskGauge } from '@/components/copilot/RiskGauge';
import { CascadeFlowchart } from '@/components/copilot/CascadeFlowchart';
import { NodeDetail } from '@/components/copilot/NodeDetail';
import { Playbook } from '@/components/copilot/Playbook';

const LOADING_STEPS = [
  'Reading the global signal',
  'Tracing regional bottlenecks',
  'Mapping the impact onto your business',
  'Drafting your mitigation playbook',
];

const EXAMPLES = ['Hardware manufacturing', 'EV battery startup', 'Pharma distribution', 'D2C apparel brand'];

function CopilotContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const disruptionId = searchParams.get('id');
  const initialQuery = searchParams.get('query');

  const [disruption, setDisruption] = useState<Disruption | null>(null);
  const [contextReady, setContextReady] = useState(!disruptionId);
  const [profession, setProfession] = useState(initialQuery ?? '');
  const [submitted, setSubmitted] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<ImpactAnalysis | null>(null);
  const [error, setError] = useState('');
  const [modelUsed, setModelUsed] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const autoRan = useRef(false);

  /* ---------- signal context ---------- */

  useEffect(() => {
    if (!disruptionId) return;
    let cancelled = false;
    fetchDisruption(disruptionId)
      .then((d) => !cancelled && setDisruption(d))
      .catch((e) => console.error('Could not load signal', e))
      .finally(() => !cancelled && setContextReady(true));
    return () => {
      cancelled = true;
    };
  }, [disruptionId]);

  /* ---------- loading steps ---------- */

  useEffect(() => {
    if (!analyzing) return;
    const t = setInterval(() => setStep((s) => Math.min(s + 1, LOADING_STEPS.length - 1)), 1800);
    return () => clearInterval(t);
  }, [analyzing]);

  /* ---------- run ---------- */

  const runAnalysis = useCallback(
    async (query: string) => {
      const q = query.trim();
      if (!q) return;

      const params = new URLSearchParams(searchParams.toString());
      params.set('query', q);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });

      setSubmitted(q);
      setStep(0);
      setAnalyzing(true);
      setError('');
      setAnalysis(null);
      setSelectedId(null);

      try {
        const res = await fetch('/api/impact-analysis', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userProfession: q, disruptionContext: disruption }),
        });
        const data = await res.json();
        if (data.success && data.analysis) {
          setAnalysis(normalizeAnalysis(data.analysis));
          setModelUsed(data.modelUsed ?? '');
        } else {
          setError(data.error === 'All models failed' ? 'The AI models didn’t return a usable analysis. Try again in a moment.' : data.error ?? 'The analysis couldn’t be generated.');
        }
      } catch (e) {
        console.error(e);
        setError('Couldn’t reach the analysis service. Check that your LLM server is running.');
      } finally {
        setAnalyzing(false);
      }
    },
    [disruption, pathname, router, searchParams],
  );

  // Auto-run when arriving with ?query= (e.g. a shared link).
  useEffect(() => {
    if (contextReady && initialQuery && !autoRan.current) {
      autoRan.current = true;
      runAnalysis(initialQuery);
    }
  }, [contextReady, initialQuery, runAnalysis]);

  const askSupplyAI = () => {
    if (!analysis) return;
    stashImpactContext({
      profession: submitted,
      disruptionId: disruption?.id ? String(disruption.id) : undefined,
      disruptionTitle: disruption?.title ? decodeEntities(disruption.title) : undefined,
      analysis,
    });
    router.push('/chat?from=impact');
  };

  const reset = () => {
    setAnalysis(null);
    setError('');
    setProfession('');
    setSelectedId(null);
    const params = new URLSearchParams(searchParams.toString());
    params.delete('query');
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  /* ---------- render ---------- */

  return (
    <PageContainer>
      <PageHeader
        title="Impact Copilot"
        description="Describe your business and see how a global shock travels down to it, level by level, with a playbook to respond."
        actions={
          analysis && (
            <>
              <Button variant="secondary" size="sm" onClick={reset}>
                <RotateCcw className="h-3.5 w-3.5" /> New analysis
              </Button>
              <Button size="sm" onClick={askSupplyAI}>
                <Sparkles className="h-3.5 w-3.5" /> Discuss with Supply AI
              </Button>
            </>
          )
        }
      />

      {disruption && (
        <Card className="mt-8 flex items-start gap-4 p-5">
          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-3 text-[13px]">
              <span className="text-label-3">Analysing against</span>
              <SeverityBadge value={disruption.severity} />
            </p>
            <h2 className="mt-1 text-headline">{decodeEntities(disruption.title)}</h2>
          </div>
        </Card>
      )}

      {/* Input */}
      {!analysis && !analyzing && (
        <Card className="mt-8 p-6 sm:p-8">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              runAnalysis(profession);
            }}
          >
            <label htmlFor="profession" className="text-title-2">
              What does your business do?
            </label>
            <p className="mt-1.5 text-body text-label-2">A sentence is enough: your industry, product or the project you’re running.</p>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <input
                id="profession"
                value={profession}
                onChange={(e) => setProfession(e.target.value)}
                placeholder="e.g. We assemble e-bikes in Pune with motors from China"
                className="h-12 min-w-0 flex-1 rounded-full bg-surface-2 px-5 text-[15px] text-label outline-none placeholder:text-label-3 focus:ring-2 focus:ring-accent/60"
              />
              <Button type="submit" size="lg" disabled={!profession.trim() || !contextReady}>
                Map my impact
              </Button>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {EXAMPLES.map((ex) => (
                <button key={ex} type="button" onClick={() => setProfession(ex)} className="rounded-full px-3 py-1.5 text-[13px] text-label-2 ring-1 ring-line transition-colors hover:bg-surface-2 hover:text-label">
                  {ex}
                </button>
              ))}
            </div>
          </form>
          {error && <InlineError className="mt-5">{error}</InlineError>}
        </Card>
      )}

      {/* Loading */}
      {analyzing && (
        <div className="mt-8">
          <div className="flex items-center gap-3 text-[15px] text-label" aria-live="polite">
            <Spinner className="text-accent" />
            {LOADING_STEPS[step]}…
          </div>
          <div className="mt-3 flex gap-1.5" aria-hidden>
            {LOADING_STEPS.map((_, i) => (
              <span key={i} className={`h-1 w-10 rounded-full transition-colors ${i <= step ? 'bg-accent' : 'bg-surface-2'}`} />
            ))}
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-3 md:gap-16">
            {LEVEL_ORDER.map((k) => (
              <div key={k} className="space-y-3">
                <Skeleton className="h-14" />
                <Skeleton className="h-24" />
                <Skeleton className="h-24" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Result */}
      {analysis && !analyzing && (
        <div className="mt-8 space-y-14">
          <Card className="grid gap-6 p-6 lg:grid-cols-[auto_1fr] lg:gap-10">
            <div className="flex justify-center lg:border-r lg:border-line lg:pr-10">
              <RiskGauge score={analysis.riskScore} />
            </div>
            <div className="min-w-0">
              <p className="text-[13px] text-label-3">For {submitted}</p>
              <h2 className="mt-1 text-title-2">{analysis.headline}</h2>
              {analysis.exposure && <p className="mt-2 max-w-2xl text-body text-label-2">{analysis.exposure}</p>}
              {analysis.metrics.length > 0 && (
                <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
                  {analysis.metrics.map((m, i) => {
                    const TrendIcon = m.trend === 'up' ? TrendingUp : m.trend === 'down' ? TrendingDown : Minus;
                    const tone = m.trend === 'up' ? 'text-critical' : m.trend === 'down' ? 'text-low' : 'text-label-3';
                    return (
                      <div key={i}>
                        <dt className="text-[12px] text-label-3">{m.label}</dt>
                        <dd className="mt-0.5 flex items-center gap-1.5 text-[17px] font-semibold tabular-nums text-label">
                          {m.value} <TrendIcon className={`h-4 w-4 ${tone}`} aria-label={`trend ${m.trend}`} />
                        </dd>
                      </div>
                    );
                  })}
                </dl>
              )}
              {modelUsed && (
                <p className="mt-6 flex items-center gap-1 text-[11px] text-label-3">
                  <Cpu className="h-3 w-3" /> {modelUsed}
                </p>
              )}
            </div>
          </Card>

          <section>
            <SectionHeading title="How the shock reaches you" description="Hover a step to trace its chain. Select one to see what causes it and what it leads to." />
            <CascadeFlowchart data={analysis} selectedId={selectedId} onSelect={setSelectedId} />
            {selectedId && (
              <div className="mt-5">
                <NodeDetail data={analysis} id={selectedId} onClose={() => setSelectedId(null)} />
              </div>
            )}
          </section>

          {analysis.playbook.length > 0 && (
            <section>
              <SectionHeading title="Your playbook" description="What to do, in order of urgency." />
              <Playbook data={analysis} />
            </section>
          )}
        </div>
      )}
    </PageContainer>
  );
}

export default function ImpactCopilotPage() {
  return (
    <Suspense>
      <CopilotContent />
    </Suspense>
  );
}
