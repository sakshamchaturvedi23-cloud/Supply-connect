import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenerativeAI } from '@google/generative-ai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

import { createClient } from '@supabase/supabase-js';

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function analyzeArticleWithAI(title, description) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `
      You are an expert global supply chain analyst and startup venture capitalist. 
      Analyze this news article:
      Title: "${title}"
      Description: "${description}"

      Return ONLY a strict JSON object with these exact keys:
      {
        "category": "Choose STRICTLY one from [AI Chips & Core Tech Hardware, Price Spikes & Raw Material Inflation, Corporate Policy & Supply Shifts, Logistics & Freight Volatility]",
        "severity": "Choose one from [Low, Medium, High, Critical]",
        "location": "Extract or infer location (e.g. India / Global, Taiwan, Red Sea, etc.)",
        "stocking_advice": "1 brief impact statement on global giants / macro level.",
        "startup_opportunity": "1 brief ripple effect or action directive for local shopkeepers, retailers, or small vendors."
      }
    `;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    // Clean and parse JSON response from AI
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

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const feedUrls = [
  'https://techcrunch.com/feed/',
  'https://www.cnbc.com/id/10001147/device/rss/rss.html',
  'https://www.livemint.com/rss/companies',
  'https://www.livemint.com/rss/technology',
  'https://gcaptain.com/feed/'
];

// 🔍 Deep Multi-Tag Image Extractor from RSS XML with updated categories mapping
const getImageContent = (itemXml, title) => {
  // 1. Check enclosure tag
  const enclosureMatch = itemXml.match(/<enclosure[^>]*url="([^"]+)"/i) || itemXml.match(/<enclosure[^>]*href="([^"]+)"/i);
  if (enclosureMatch) return enclosureMatch[1];

  // 2. Check media:content or media:thumbnail
  const mediaMatch = itemXml.match(/<media:content[^>]*url="([^"]+)"/i) || itemXml.match(/<media:thumbnail[^>]*url="([^"]+)"/i);
  if (mediaMatch) return mediaMatch[1];

  // 3. Check for <img> tag inside description
  const imgMatch = itemXml.match(/<img[^>]+src="([^">]+)"/i);
  if (imgMatch) return imgMatch[1];

  // 4. Smart Keyword-based Unsplash Image mapping aligned with new core categories
  const lowerTitle = title.toLowerCase();
  if (lowerTitle.includes('chip') || lowerTitle.includes('nvidia') || lowerTitle.includes('semiconductor') || lowerTitle.includes('processor') || lowerTitle.includes('tech')) {
    return 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80';
  } else if (lowerTitle.includes('port') || lowerTitle.includes('ship') || lowerTitle.includes('cargo') || lowerTitle.includes('freight') || lowerTitle.includes('logistics')) {
    return 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=800&q=80';
  } else if (lowerTitle.includes('inflation') || lowerTitle.includes('price') || lowerTitle.includes('cost') || lowerTitle.includes('spike') || lowerTitle.includes('raw material')) {
    return 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=800&q=80';
  }

  // General professional fallback
  return 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=800&q=80';
};

async function runIngestion() {
  console.log('🚀 Starting dynamic ingestion with core disruption categories...');

  let allParsedItems = [];

  for (const feedUrl of feedUrls) {
    try {
      console.log(`📡 Fetching: ${feedUrl}`);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 7000);

      const response = await fetch(feedUrl, {
        signal: controller.signal,
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) continue;
      const xmlText = await response.text();
      
      // Parse RSS items
      const itemMatches = xmlText.match(/<item>([\s\S]*?)<\/item>/gi) || [];
      for (const itemXml of itemMatches.slice(0, 4)) { // Top 4 items per feed
        const titleMatch = itemXml.match(/<title>([\s\S]*?)<\/title>/i);
        const descMatch = itemXml.match(/<description>([\s\S]*?)<\/description>/i);
        
        const rawTitle = titleMatch ? titleMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').trim() : '';
        const rawDesc = descMatch ? descMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').trim().replace(/<[^>]*>/g, '') : '';

        if (!rawTitle) continue;

        // Analyze via Gemini AI with new structured categories
        console.log(`🤖 Analyzing with AI: "${rawTitle.substring(0, 40)}..."`);
        const aiAnalysis = await analyzeArticleWithAI(rawTitle, rawDesc);
        if (!aiAnalysis) continue;

        const imageUrl = getImageContent(itemXml, rawTitle);

        allParsedItems.push({
          title: rawTitle,
          description: rawDesc || 'Global macroeconomic supply chain update.',
          category: aiAnalysis.category,
          severity: aiAnalysis.severity,
          location: aiAnalysis.location,
          impact: `Global Giants: ${aiAnalysis.stocking_advice} Local Shopkeepers & Small Businesses: ${aiAnalysis.startup_opportunity}`,
          image_url: imageUrl,
          created_at: new Date().toISOString()
        });
      }
    } catch (err) {
      console.error(`❌ Error or Timeout fetching feed:`, err.message);
    }
  }

  console.log(`💾 Inserting ${allParsedItems.length} processed items into Supabase...`);

  for (const item of allParsedItems) {
    const { data: existing } = await supabase
      .from('disruptions')
      .select('id')
      .eq('title', item.title)
      .single();

    if (existing) {
      await supabase.from('disruptions').update({ 
        image_url: item.image_url,
        impact: item.impact,
        category: item.category 
      }).eq('title', item.title);
      continue;
    }

    await supabase.from('disruptions').insert([item]);
  }

  console.log('🎉 Ingestion completed successfully with streamlined categories!');
}

runIngestion();
