-- ==============================================================================
-- Supply Connect: Database Migration & Schema Definition
-- Vector Support (pgvector) for Global Supply Chain Risk Telemetry & RAG Search
-- ==============================================================================

-- 1. Enable Required Extensions
-- Enables vector mathematical operations and indexing (HNSW / IVFFlat)
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- Table: disruptions
-- Stores real-time global supply chain disruption events and telemetry
-- ==============================================================================
CREATE TABLE IF NOT EXISTS disruptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    severity TEXT NOT NULL,
    location TEXT NOT NULL,
    description TEXT NOT NULL,
    impact TEXT NOT NULL,
    embedding VECTOR(1536), -- 1536 dimensions for OpenAI / standard RAG embeddings
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Comments on table and columns
COMMENT ON TABLE disruptions IS 'Global supply chain risk signals, telemetry, and vector embeddings for semantic search.';
COMMENT ON COLUMN disruptions.id IS 'Unique identifier for the disruption signal.';
COMMENT ON COLUMN disruptions.title IS 'Headline or summary of the disruption event.';
COMMENT ON COLUMN disruptions.category IS 'Risk category (e.g., Ports, Weather, Price Spikes, Geopolitical).';
COMMENT ON COLUMN disruptions.severity IS 'Risk severity tier (e.g., Low, Medium, High, Critical).';
COMMENT ON COLUMN disruptions.location IS 'Geographic region, port, or choke point affected.';
COMMENT ON COLUMN disruptions.description IS 'Detailed description of the supply bottleneck.';
COMMENT ON COLUMN disruptions.impact IS 'Downstream operational, lead time, and supply ripple impact.';
COMMENT ON COLUMN disruptions.embedding IS 'Vector representation (1536-dim) for semantic similarity and RAG search.';
COMMENT ON COLUMN disruptions.created_at IS 'Timestamp when the risk signal was recorded.';

-- ==============================================================================
-- Table: startup_opportunities
-- Stores viable local B2B venture models derived from supply bottlenecks
-- ==============================================================================
CREATE TABLE IF NOT EXISTS startup_opportunities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    driven_by TEXT NOT NULL,
    description TEXT NOT NULL,
    est_setup_cost TEXT NOT NULL,
    disruption_id UUID REFERENCES disruptions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Comments on table and columns
COMMENT ON TABLE startup_opportunities IS 'Curated B2B venture opportunities addressing active supply chain bottlenecks.';
COMMENT ON COLUMN startup_opportunities.id IS 'Unique identifier for the startup opportunity.';
COMMENT ON COLUMN startup_opportunities.title IS 'Name of the business model or startup venture.';
COMMENT ON COLUMN startup_opportunities.driven_by IS 'The underlying bottleneck driving the market gap.';
COMMENT ON COLUMN startup_opportunities.description IS 'Operational and business model breakdown.';
COMMENT ON COLUMN startup_opportunities.est_setup_cost IS 'Estimated initial setup capital / investment range.';
COMMENT ON COLUMN startup_opportunities.disruption_id IS 'Foreign key referencing the root disruption signal.';
COMMENT ON COLUMN startup_opportunities.created_at IS 'Timestamp when the opportunity was generated.';

-- ==============================================================================
-- Indexes for High-Performance Queries & Vector Search
-- ==============================================================================

-- Fast vector similarity search using Hierarchical Navigable Small World (HNSW) index
-- Uses cosine distance metric (vector_cosine_ops)
CREATE INDEX IF NOT EXISTS disruptions_embedding_hnsw_idx 
ON disruptions 
USING hnsw (embedding vector_cosine_ops);

-- B-Tree indexes for relational filtering and sorting
CREATE INDEX IF NOT EXISTS disruptions_category_idx ON disruptions(category);
CREATE INDEX IF NOT EXISTS disruptions_severity_idx ON disruptions(severity);
CREATE INDEX IF NOT EXISTS disruptions_created_at_idx ON disruptions(created_at DESC);

-- Foreign key & sorting indexes for startup opportunities
CREATE INDEX IF NOT EXISTS startup_opportunities_disruption_id_idx ON startup_opportunities(disruption_id);
CREATE INDEX IF NOT EXISTS startup_opportunities_created_at_idx ON startup_opportunities(created_at DESC);

-- ==============================================================================
-- Row Level Security (RLS) Policies
-- ==============================================================================
ALTER TABLE disruptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE startup_opportunities ENABLE ROW LEVEL SECURITY;

-- Allow public read access to disruptions telemetry
CREATE POLICY "Allow public read access to disruptions" 
ON disruptions 
FOR SELECT 
USING (true);

-- Allow authenticated/service role full access to disruptions
CREATE POLICY "Allow full access to service role for disruptions" 
ON disruptions 
FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

-- Allow public/anon insert to disruptions (for background ingestion worker)
CREATE POLICY "Allow public insert to disruptions" 
ON disruptions 
FOR INSERT 
WITH CHECK (true);

-- Allow public read access to startup opportunities
CREATE POLICY "Allow public read access to startup_opportunities" 
ON startup_opportunities 
FOR SELECT 
USING (true);

-- Allow authenticated/service role full access to startup opportunities
CREATE POLICY "Allow full access to service role for startup_opportunities" 
ON startup_opportunities 
FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

-- ==============================================================================
-- Semantic Vector Search RPC Function (pgvector match_disruptions)
-- Used by Supabase Client for RAG-based early warning retrieval
-- ==============================================================================
CREATE OR REPLACE FUNCTION match_disruptions (
    query_embedding VECTOR(1536),
    match_threshold FLOAT DEFAULT 0.5,
    match_count INT DEFAULT 5
)
RETURNS TABLE (
    id UUID,
    title TEXT,
    category TEXT,
    severity TEXT,
    location TEXT,
    description TEXT,
    impact TEXT,
    similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        d.id,
        d.title,
        d.category,
        d.severity,
        d.location,
        d.description,
        d.impact,
        1 - (d.embedding <=> query_embedding) AS similarity
    FROM disruptions d
    WHERE d.embedding IS NOT NULL
      AND 1 - (d.embedding <=> query_embedding) > match_threshold
    ORDER BY d.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

COMMENT ON FUNCTION match_disruptions IS 'Calculates cosine similarity against stored 1536-dimensional embeddings for RAG retrieval.';

-- ==============================================================================
-- Sample Seed Data (Initial Telemetry & Linked Opportunities)
-- ==============================================================================
DO $$
DECLARE
    shanghai_id UUID;
    semiconductor_id UUID;
    typhoon_id UUID;
    ruhr_id UUID;
BEGIN
    -- Only insert seed data if the disruptions table is empty
    IF NOT EXISTS (SELECT 1 FROM disruptions LIMIT 1) THEN
        
        -- Insert Disruption 1: Shanghai Port
        INSERT INTO disruptions (title, category, severity, location, description, impact)
        VALUES (
            'Port Congestion at Shanghai Deepwater Port',
            'Ports',
            'High',
            'Shanghai, China',
            'Severe vessel backlog and berth turnaround delays causing 10-12 day delays in containerized freight clearance.',
            'Stalls critical tier-1 semiconductor deliveries to automotive and consumer electronics OEMs.'
        ) RETURNING id INTO shanghai_id;

        -- Insert Disruption 2: Semiconductor Wafer Spike
        INSERT INTO disruptions (title, category, severity, location, description, impact)
        VALUES (
            'Semiconductor Wafer Raw Material Price Spike',
            'Price Spikes',
            'Critical',
            'Global / East Asia',
            'Surging demand and rare gas supply quotas have driven up silicon wafer procurement spot costs by 18.5%.',
            'Immediate unit margin compression for microchip packaging and PCB assembly plants.'
        ) RETURNING id INTO semiconductor_id;

        -- Insert Disruption 3: South China Sea Typhoon
        INSERT INTO disruptions (title, category, severity, location, description, impact)
        VALUES (
            'Severe Typhoon Warning in South China Sea',
            'Weather',
            'High',
            'South China Sea / Taiwan Strait',
            'Container vessels rerouting around category 4 maritime storm tracks, lengthening maritime transit windows.',
            'Lithium-ion battery cell inventory delays for regional electric vehicle powertrain lines.'
        ) RETURNING id INTO typhoon_id;

        -- Insert Disruption 4: Ruhr Basin Steel Outage
        INSERT INTO disruptions (title, category, severity, location, description, impact)
        VALUES (
            'Blast Furnace Refractory Outage in Ruhr Basin',
            'Price Spikes',
            'Medium',
            'Duisburg, Germany',
            'Unplanned relining of blast furnace #2 reduces regional European cold-rolled coil availability by 28%.',
            'Automotive stamping facilities facing extended 2-3 week steel stock replenishment cycles.'
        ) RETURNING id INTO ruhr_id;

        -- Link Startup Opportunity 1 to Semiconductor Bottleneck
        INSERT INTO startup_opportunities (title, driven_by, description, est_setup_cost, disruption_id)
        VALUES (
            'Regional E-Waste Component Recovery Hub',
            'Semiconductor import delays & escalating wafer costs',
            'A localized micro-sorting and automated de-soldering lab that harvests, tests, and certifies functional microcontrollers and logic chips from decommissioned electronics.',
            '₹6L - ₹14L (Lean Pilot)',
            semiconductor_id
        );

        -- Link Startup Opportunity 2 to Port Congestion Bottleneck
        INSERT INTO startup_opportunities (title, driven_by, description, est_setup_cost, disruption_id)
        VALUES (
            'Decentralized Micro-Assembly Brokerage',
            'Finished goods delivery lag from overseas mega-assembly plants',
            'A rapid-turnaround contract assembly network aggregating idle capacity of regional PCB fabrication lines for emergency batch runs and localized box builds.',
            '₹10L - ₹22L (Asset-Light)',
            shanghai_id
        );

        -- Link Startup Opportunity 3 to Battery Logistics Bottleneck
        INSERT INTO startup_opportunities (title, driven_by, description, est_setup_cost, disruption_id)
        VALUES (
            'Lithium Second-Life Diagnostic & Pooling Service',
            'Critical lithium cell import tariffs & shipping lead times',
            'Fast-screening diagnostic service that tests retired EV modules, re-grades healthy pouch/prismatic cells, and reassembles them into commercial solar battery storage packs.',
            '₹8L - ₹18L (Modular)',
            typhoon_id
        );

        -- Link Startup Opportunity 4 to Ruhr Steel Outage Bottleneck
        INSERT INTO startup_opportunities (title, driven_by, description, est_setup_cost, disruption_id)
        VALUES (
            'Regional Industrial Fastener & CNC Cold-Stock Pool',
            'Steel lead-time volatility and port container detention fees',
            'A predictive, on-demand inventory pool of aerospace/automotive grade CNC alloy fasteners and cold-drawn billets supplied via consignment agreements with local tier-3 machine shops.',
            '₹5L - ₹12L (Working Capital)',
            ruhr_id
        );

    END IF;
END $$;
