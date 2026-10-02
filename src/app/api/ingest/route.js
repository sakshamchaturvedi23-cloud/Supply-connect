import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function analyzeArticleWithAI(title, description) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `
      You are an elite Chief Supply Chain Risk Officer and Venture Capitalist. 
      Analyze this news article:
      Title: "${title}"
      Description: "${description}"

      CRITICAL INSTRUCTION: 
      Determine if this article represents a genuine supply chain disruption, geopolitical trade risk, port congestion, severe weather logistics impact, critical raw material/chip shortage, or major macroeconomic market shock.
      If it is routine corporate news, executive appointments (CEO/board changes), earnings fluff, marketing announcements, or general non-critical noise, set "is_disruption" to false.

      Return ONLY a strict JSON object with these exact keys:
      {
        "is_disruption": true or false,
        "category": "Choose one from [AI Chips, Stocks, Corporate Decisions, Ports, Weather, Price Spikes, Logistics]",
        "severity": "Choose one from [Low, Medium, High, Critical]",
        "location": "Extract or infer location (e.g. India / Global, Taiwan, Red Sea, etc.)",
        "stocking_advice": "1 brief, highly actionable procurement/stocking directive for supply chain managers.",
        "startup_opportunity": "1 specific B2B software or tech startup opportunity addressing this disruption."
      }
    `;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return null;
  } catch (err) {
    console.error('AI Analysis failed:', err);
    return null;
  }
}

const getImageContent = (itemXml, title) => {
  const enclosureMatch = itemXml.match(/<enclosure[^>]*url="([^"]+)"/i) || itemXml.match(/<enclosure[^>]*href="([^"]+)"/i);
  if (enclosureMatch) return enclosureMatch[1];

  const mediaMatch = itemXml.match(/<media:content[^>]*url="([^"]+)"/i) || itemXml.match(/<media:thumbnail[^>]*url="([^"]+)"/i);
  if (mediaMatch) return mediaMatch[1];

  const imgMatch = itemXml.match(/<img[^>]+src="([^">]+)"/i);
  if (imgMatch) return imgMatch[1];

  const lowerTitle = title.toLowerCase();
  if (lowerTitle.includes('chip') || lowerTitle.includes('nvidia') || lowerTitle.includes('semiconductor')) {
    return 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80';
  } else if (lowerTitle.includes('port') || lowerTitle.includes('ship') || lowerTitle.includes('cargo')) {
    return 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=800&q=80';
  } else if (lowerTitle.includes('stock') || lowerTitle.includes('market') || lowerTitle.includes('inflation')) {
    return 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=800&q=80';
  }

  return 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=800&q=80';
};

// Original article URL from an RSS <item> (<link>…</link>) or Atom <entry> (<link href="…"/>).
const getArticleLink = (itemXml) => {
  const rss = itemXml.match(/<link>([\s\S]*?)<\/link>/i);
  const atom = itemXml.match(/<link[^>]*href="([^"]+)"/i);
  const raw = (rss ? rss[1] : atom ? atom[1] : '').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim();
  return /^https?:\/\//i.test(raw) ? raw : null;
};

// Inserts a row; if the source_url column doesn't exist yet (migration not run), retries without it.
async function insertDisruption(supabase, row) {
  let { error } = await supabase.from('disruptions').insert([row]);
  if (error && /source_url/i.test(error.message || '')) {
    const { source_url, ...rest } = row; // eslint-disable-line @typescript-eslint/no-unused-vars
    ({ error } = await supabase.from('disruptions').insert([rest]));
  }
  return error;
}

export async function GET() {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  try {
    const feedUrls = [
      'https://techcrunch.com/feed/',
      'https://www.livemint.com/rss/companies',
      'https://gcaptain.com/feed/'
    ];

    let rawArticles = [];

    // 1. Fast parallel fetch of all RSS feeds
    await Promise.all(feedUrls.map(async (baseFeedUrl) => {
      try {
        const feedUrl = `${baseFeedUrl}?t=${Date.now()}`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(feedUrl, {
          signal: controller.signal,
          cache: 'no-store',
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
        });
        clearTimeout(timeoutId);

        if (!response.ok) return;
        const xmlText = await response.text();
        const itemMatches = xmlText.match(/<item>([\s\S]*?)<\/item>|<entry>([\s\S]*?)<\/entry>/g) || [];

        // Limit to top 2 items per feed for lightning-fast sync
        for (const itemXml of itemMatches.slice(0, 2)) {
          const getTagContent = (tag) => {
            const match = itemXml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\/${tag}>`, 'i'));
            return match ? match[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/<[^>]+>/g, '').trim() : '';
          };

          const title = getTagContent('title');
          const rawDesc = getTagContent('description') || getTagContent('summary');
          if (title && rawDesc) {
            rawArticles.push({ title, rawDesc, itemXml });
          }
        }
      } catch (e) {
        console.error('Feed fetch error:', e.message);
      }
    }));

    let count = 0;

    // 2. Process all articles concurrently using Promise.all for instant AI evaluation
    await Promise.all(rawArticles.map(async ({ title, rawDesc, itemXml }) => {
      try {
        const description = rawDesc.length > 250 ? rawDesc.substring(0, 247) + '...' : rawDesc;

        // Check if already exists in DB
        const { data: existing } = await supabase.from('disruptions').select('id').eq('title', title).single();
        if (existing) return;

        const aiInsights = await analyzeArticleWithAI(title, description);

        if (!aiInsights || !aiInsights.is_disruption) {
          return; // Skip non-disruptions instantly
        }

        const imageUrl = getImageContent(itemXml, title);
        const impact = `Stocking Action: ${aiInsights.stocking_advice} | Startup Opportunity: ${aiInsights.startup_opportunity}`;

        const error = await insertDisruption(supabase, {
          title,
          category: aiInsights.category,
          severity: aiInsights.severity,
          location: aiInsights.location,
          description,
          impact,
          image_url: imageUrl,
          source_url: getArticleLink(itemXml),
        });

        if (!error) count++;
      } catch (err) {
        console.error('Parallel processing item error:', err.message);
      }
    }));

    return NextResponse.json({ success: true, message: `Successfully synced ${count} items in parallel!` });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}



