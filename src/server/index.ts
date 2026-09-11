/**
 * Fiverr Intelligence Engine - Express Server & Analytics Web Application
 * Serves the Ingestion API, Master Ranking endpoints, and the Web Dashboard.
 */

import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FiverrSearchProcessor } from '../core/parser.js';
import { FiverrStorage } from './storage.js';
import { RawSearchCapture } from '../core/types.js';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '15mb' }));

// Static Assets
const publicDir = path.resolve(process.cwd(), 'public');
app.use(express.static(publicDir));

// Domain Services
const processor = new FiverrSearchProcessor({ minimumOrderThreshold: 30 });
const storage = new FiverrStorage();

// Pure empty initial state - zero invented data


// -------------------------------------------------------------
// REST API ROUTES
// -------------------------------------------------------------

// Health Check
app.get('/api/v1/health', (req: Request, res: Response) => {
  res.json({ status: 'healthy', version: '1.0.0', time: new Date().toISOString() });
});

// Master Ranking Table (Highest Average = Rank #1)
app.get('/api/v1/rankings', (req: Request, res: Response) => {
  const rankings = storage.getRankings();
  res.json({ success: true, count: rankings.length, rankings });
});

// All Analyses
app.get('/api/v1/analyses', (req: Request, res: Response) => {
  const analyses = storage.getAllAnalyses();
  res.json({ success: true, count: analyses.length, analyses });
});

// Single Keyword Analysis Detail
app.get('/api/v1/analyses/:keyword', (req: Request, res: Response) => {
  const keyword = req.params.keyword;
  const analysis = storage.getAnalysis(keyword);
  if (!analysis) {
    return res.status(404).json({ success: false, message: `Keyword '${keyword}' not found in database.` });
  }
  res.json({ success: true, analysis });
});

// Research Queue
app.get('/api/v1/queue', (req: Request, res: Response) => {
  const queue = storage.getQueue();
  res.json({ success: true, count: queue.length, queue });
});

app.post('/api/v1/queue', (req: Request, res: Response) => {
  const { keyword, sourceKeyword } = req.body;
  if (!keyword) {
    return res.status(400).json({ success: false, message: 'Keyword is required.' });
  }
  storage.addToQueue(keyword, sourceKeyword);
  res.json({ success: true, message: `Keyword '${keyword}' added to research queue.` });
});

// Historical Tracking
app.get('/api/v1/history/:keyword', (req: Request, res: Response) => {
  const history = storage.getHistory(req.params.keyword);
  res.json({ success: true, history });
});

// Ingest Search Capture (from Chrome Extension or Manual Evidence Import)
app.post('/api/v1/ingest', (req: Request, res: Response) => {
  try {
    const capture = req.body as RawSearchCapture;

    if (!capture || !capture.searchQuery) {
      return res.status(400).json({
        success: false,
        message: 'Invalid capture payload: searchQuery is required.'
      });
    }

    const analysis = processor.process(capture);

    if (analysis.status === 'INSUFFICIENT_DATA') {
      return res.status(422).json({
        success: false,
        status: 'INSUFFICIENT_DATA',
        message: 'Insufficient verified Fiverr data. Analysis withheld.',
        validationErrors: analysis.validationErrors
      });
    }

    // Save and update Master Rankings
    const updatedRankings = storage.saveAnalysis(analysis);
    const myRank = updatedRankings.find(r => r.keyword.toLowerCase() === analysis.keyword.toLowerCase())?.rank || 1;

    res.json({
      success: true,
      rank: myRank,
      keyword: analysis.keyword,
      Tns: analysis.Tns,
      Tno: analysis.Tno,
      Nso: analysis.Nso,
      average: analysis.average,
      strategicOpportunity: analysis.strategicOpportunity,
      analysis
    });
  } catch (err: any) {
    console.error('[API Ingest] Processing error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to process Fiverr search capture.',
      error: err.message
    });
  }
});

// Fallback to Dashboard
app.get('*', (req: Request, res: Response) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

// Start Server
app.listen(PORT, () => {
  console.log(`\n========================================================`);
  console.log(`🚀 FIVERR KEYWORD INTELLIGENCE ENGINE RUNNING`);
  console.log(`📍 Web Dashboard: http://localhost:${PORT}`);
  console.log(`📡 Ingestion API: http://localhost:${PORT}/api/v1/ingest`);
  console.log(`========================================================\n`);
});
