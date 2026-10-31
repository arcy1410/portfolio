// Vercel serverless function for the tagger prototype.
// GET  /api/tag            -> { ready: true|false }
// POST /api/tag {payees}   -> { results: [{ payee, category, reason }] }
// Uses ANTHROPIC_API_KEY if set, otherwise OPENAI_API_KEY. Keys stay on the server.

const CATS = ["Food & Drinks", "Groceries", "Transport", "Travel", "Bills", "Shopping", "Entertainment", "Medical", "Investments", "Transfers", "Income"];

function buildPrompt(payees) {
  return "You tag Indian bank transactions for a personal finance app.\n" +
    "Allowed categories: " + CATS.join(", ") + ".\n" +
    "Each payee below is the name as printed on a bank statement, which is often a company's registered legal name rather than its consumer brand. " +
    "Pick the best category for each. A private person's name is usually Transfers. If you cannot tell, use \"Untagged\".\n" +
    "Return only a JSON array of objects with keys: payee (copied exactly), category (one allowed category or Untagged), reason (under 12 words, naming the brand if you know it).\n" +
    "Payees:\n" + payees.map(p => "- " + p).join("\n");
}

async function askAnthropic(prompt) {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model: process.env.ANTHROPIC_MODEL || "claude-haiku-5-5", max_tokens: 1500, messages: [{ role: "user", content: prompt }] })
  });
  if (!r.ok) throw new Error("anthropic " + r.status);
  const j = await r.json();
  return (j.content || []).map(c => c.text || "").join("");
}

async function askOpenAI(prompt) {
  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: "Bearer " + process.env.OPENAI_API_KEY },
    body: JSON.stringify({ model: process.env.OPENAI_MODEL || "gpt-4.1-mini", messages: [{ role: "user", content: prompt }] })
  });
  if (!r.ok) throw new Error("openai " + r.status);
  const j = await r.json();
  return j.choices && j.choices[0] && j.choices[0].message ? j.choices[0].message.content : "";
}

module.exports = async (req, res) => {
  const ready = Boolean(process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY);
  res.setHeader("Cache-Control", "no-store");
  if (req.method === "GET") return res.status(200).json({ ready });
  if (req.method !== "POST") return res.status(405).json({ error: "method" });
  if (!ready) return res.status(503).json({ error: "not_configured" });

  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  const payees = Array.isArray(body && body.payees) ? body.payees : [];
  const clean = [...new Set(payees.filter(p => typeof p === "string").map(p => p.trim().slice(0, 60)).filter(Boolean))].slice(0, 25);
  if (!clean.length) return res.status(400).json({ error: "no_payees" });

  try {
    const prompt = buildPrompt(clean);
    const text = process.env.ANTHROPIC_API_KEY ? await askAnthropic(prompt) : await askOpenAI(prompt);
    const arr = JSON.parse(text.slice(text.indexOf("["), text.lastIndexOf("]") + 1));
    const results = (Array.isArray(arr) ? arr : [])
      .filter(o => o && clean.includes(o.payee))
      .map(o => ({ payee: o.payee, category: CATS.includes(o.category) ? o.category : "Untagged", reason: String(o.reason || "").slice(0, 90) }));
    return res.status(200).json({ results });
  } catch (err) {
    return res.status(502).json({ error: "upstream" });
  }
};
