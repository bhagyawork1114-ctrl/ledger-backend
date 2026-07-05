const MODEL = 'claude-sonnet-4-6';

/**
 * Calls the Anthropic Messages API. The API key lives only on this server —
 * it is never sent to the mobile app.
 */
async function callClaude(system, userText, maxTokens = 1000) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not set on the server. Add it to backend/.env');
  }
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: userText }],
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Claude API error ${res.status}: ${errText}`);
  }
  const data = await res.json();
  return (data.content || []).map((b) => b.text || '').join('\n').trim();
}

/** Pulls the first well-formed {...} object out of a model response. */
function extractJSON(raw) {
  let t = raw.trim();
  t = t.replace(/^```json/i, '').replace(/^```/, '').replace(/```$/, '').trim();
  const start = t.indexOf('{');
  const end = t.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('No JSON object found in model response');
  return JSON.parse(t.slice(start, end + 1));
}

/** Keeps very long reports (300+ pages) within a sane request size by keeping
 * the front (business/MD&A) and back (financial statements/notes) sections,
 * which is where the useful content usually lives. */
function prepareText(full) {
  const MAX = 300000;
  if (full.length <= MAX) return full;
  return full.slice(0, 180000) + '\n\n...[middle of document omitted for length]...\n\n' + full.slice(-120000);
}

const SYS_EXTRACT = `You are a meticulous financial analyst extracting structured data from a company's annual report. Read the report text and respond with ONLY one valid JSON object — no markdown fences, no commentary before or after. Shape exactly:
{"company_name":string,"sector":string,"currency_unit":string,"years":[string,...up to 5, oldest first],"revenue":[number,...same length as years],"net_profit":[number,...],"roe":[number,...percent],"roce":[number,...percent],"debt_to_equity":[number,...],"operating_cash_flow":[number,...],"current_ratio":number|null,"interest_coverage":number|null,"operating_margin":number|null,"net_margin":number|null,"promoter_holding_change":string|null,"risks":[{"title":string,"note":string under 16 words}] (max 4),"governance_notes":string under 28 words|null,"fundamentals_trend":"Improving"|"Stable"|"Weakening","fundamentals_reason":string under 18 words,"competitive_positioning":string under 40 words|null}
Use null when a figure genuinely cannot be found — never invent numbers. Keep all arrays the same length as "years". Be concise so the whole response fits comfortably in a short reply. Never include a buy, sell, or hold recommendation anywhere in the output — this is descriptive analysis only.`;

const SYS_SUMMARY = `You are a financial analyst. In 3-4 plain-English sentences, explain what this company actually does: its core business, main products or services, and how it earns revenue. No jargon, no financial figures, no investment recommendation. Return only the summary paragraph, nothing else.`;

module.exports = { callClaude, extractJSON, prepareText, SYS_EXTRACT, SYS_SUMMARY };
