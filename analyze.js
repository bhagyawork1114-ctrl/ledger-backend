const express = require('express');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const pdfParse = require('pdf-parse');
const { callClaude, extractJSON, prepareText, SYS_EXTRACT, SYS_SUMMARY } = require('../claude');
const reportStore = require('../reportStore');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 30 * 1024 * 1024 } });

// POST /api/analyze
// multipart/form-data with a "report" file field, OR a JSON body { text: "..." }
router.post('/', upload.single('report'), async (req, res) => {
  try {
    let text = '';

    if (req.file) {
      const parsed = await pdfParse(req.file.buffer);
      text = parsed.text || '';
    } else if (req.body && req.body.text) {
      text = req.body.text;
    } else {
      return res.status(400).json({ error: 'Send a PDF as "report" or a JSON body with "text".' });
    }

    if (text.trim().length < 200) {
      return res.status(422).json({
        error: 'Could not extract enough readable text from this document. It may be a scanned image PDF — try a text-based one, or paste the text directly.',
      });
    }

    const prepared = prepareText(text);

    let analysis;
    try {
      const raw = await callClaude(SYS_EXTRACT, prepared, 1000);
      analysis = extractJSON(raw);
    } catch (e) {
      return res.status(502).json({ error: 'Could not analyze this document: ' + e.message });
    }

    let summary = '';
    try {
      summary = await callClaude(SYS_SUMMARY, prepared, 400);
    } catch (e) {
      summary = 'Business summary unavailable right now.';
    }

    const reportId = uuidv4();
    reportStore.save(reportId, { text: prepared, analysis, summary });

    res.json({ reportId, analysis, summary });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Unexpected server error while analyzing the report.' });
  }
});

module.exports = router;
