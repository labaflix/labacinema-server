const express = require('express');
const router = express.Router();

router.use(function (_req, res) {
  res.status(501).json({ error: 'LabaFlix coming soon - Phase 4' });
});

module.exports = router;
