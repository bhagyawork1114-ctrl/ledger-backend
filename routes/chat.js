const express = require('express');
const { callClaude } = require('../claude');
const reportStore = require('../reportStore');

const router = express.Router();

// POST /api/chat  { reportId, question, history? }
router.post('/', async (req, res) => {
  try {
    const { reportId, question, history } = req.body || {};
    if (!reportId || !question) {
      return res.status(400).json({ error: 'reportId and question are required.' });
    }
    const report = reportStore.get(reportId);
    if (!report) {
      return res.status(404).json({ error: 'Report not found — it may have expired. Please re-analyze the document.' });
    }

    const recent = Array.isArray(history)
      ? history.slice(-6).map((m) => `${m.role === 'user' ? 'Q' : 'A'}: ${m.content}`).join('\n')
      : '';

    const system = `You are answering questions about a specific company's annual report, using only the text below. Be concise (2-4 sentences), factual, and reference concrete figures when relevant. If the answer isn't in the document, say so plainly. Never give buy, sell, or hold advice — explain instead that you provide analysis, not recommendations, if asked.

REPORT TEXT:
${report.text}

RECENT CONVERSATION:
${recent}`;

    const answer = await callClaude(system, question, 500);
    res.json({ answer });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Unexpected server error while answering the question.' });
  }
});

module.exports = router;
