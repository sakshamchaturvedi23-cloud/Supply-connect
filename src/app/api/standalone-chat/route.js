import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(req) {
  try {
    const { messages } = await req.json();

    const systemPrompt = `You are Supply Connect AI, an independent, autonomous general supply chain and enterprise intelligence assistant. 
Converse naturally, professionally, and intelligently like ChatGPT or Claude. 
Help users navigate global supply chains, logistics, trade policies, and general business queries. 
Keep your responses articulate, sharp, well-structured, and action-oriented.`;

    const formattedMessages = [
      { role: 'system', content: systemPrompt },
      ...(messages || []).map(m => ({
        role: m.sender === 'user' ? 'user' : 'assistant',
        content: m.text || m.content
      }))
    ];

    const response = await fetch(process.env.LLM_API_URL ?? 'http://localhost:3001/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.FREELLM_API_KEY || process.env.LLM_API_KEY}`
      },
      body: JSON.stringify({
        model: process.env.IMPACT_MODELS || 'auto',
        temperature: 0.7,
        messages: formattedMessages
      })
    });

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || 'I am ready to assist you.';

    return NextResponse.json({ success: true, reply });
  } catch (err) {
    console.error('Standalone Chat API Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
