/**
 * Fiverr Intelligence Engine - Zero-Dependency HTTP Server & API
 * Serves the Ingestion API, Master Rankings, and Web Dashboard.
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FiverrSearchProcessor } from '../core/parser.js';
import { FiverrStorage } from './storage.js';

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;
const publicDir = path.resolve(process.cwd(), 'public');

const processor = new FiverrSearchProcessor({ minimumOrderThreshold: 30 });
const storage = new FiverrStorage();

// Pure empty initial state - zero invented or pre-seeded data


function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  res.end(JSON.stringify(data));
}

const server = http.createServer((req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  const pathname = parsedUrl.pathname;

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    return res.end();
  }

  // API Routes
  if (pathname === '/api/v1/health' && req.method === 'GET') {
    return sendJson(res, 200, { status: 'healthy', version: '1.0.0', time: new Date().toISOString() });
  }

  if (pathname === '/api/v1/rankings' && req.method === 'GET') {
    const rankings = storage.getRankings();
    return sendJson(res, 200, { success: true, count: rankings.length, rankings });
  }

  if (pathname === '/api/v1/analyses' && req.method === 'GET') {
    const analyses = storage.getAllAnalyses();
    return sendJson(res, 200, { success: true, count: analyses.length, analyses });
  }

  if (pathname.startsWith('/api/v1/analyses/') && req.method === 'GET') {
    const keyword = decodeURIComponent(pathname.replace('/api/v1/analyses/', ''));
    const analysis = storage.getAnalysis(keyword);
    if (!analysis) {
      return sendJson(res, 404, { success: false, message: `Keyword '${keyword}' not found in database.` });
    }
    return sendJson(res, 200, { success: true, analysis });
  }

  if (pathname === '/api/v1/queue' && req.method === 'GET') {
    const queue = storage.getQueue();
    return sendJson(res, 200, { success: true, count: queue.length, queue });
  }

  if (pathname === '/api/v1/queue' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const { keyword, sourceKeyword } = JSON.parse(body);
        if (!keyword) {
          return sendJson(res, 400, { success: false, message: 'Keyword is required.' });
        }
        storage.addToQueue(keyword, sourceKeyword);
        return sendJson(res, 200, { success: true, message: `Keyword '${keyword}' added to queue.` });
      } catch (e) {
        return sendJson(res, 400, { success: false, message: 'Invalid JSON body.' });
      }
    });
    return;
  }

  if (pathname === '/api/v1/ingest' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const capture = JSON.parse(body);
        if (!capture || !capture.searchQuery) {
          return sendJson(res, 400, { success: false, message: 'searchQuery is required.' });
        }

        const analysis = processor.process(capture);

        if (analysis.status === 'INSUFFICIENT_DATA') {
          return sendJson(res, 422, {
            success: false,
            status: 'INSUFFICIENT_DATA',
            message: 'Insufficient verified Fiverr data. Analysis withheld.',
            validationErrors: analysis.validationErrors
          });
        }

        const updatedRankings = storage.saveAnalysis(analysis);
        const myRank = updatedRankings.find(r => r.keyword.toLowerCase() === analysis.keyword.toLowerCase())?.rank || 1;

        return sendJson(res, 200, {
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
      } catch (err) {
        return sendJson(res, 500, { success: false, message: err.message });
      }
    });
    return;
  }

  // Serve static files from public/
  let filePath = path.join(publicDir, pathname === '/' ? 'index.html' : pathname);
  if (!fs.existsSync(filePath)) {
    filePath = path.join(publicDir, 'index.html');
  }

  const ext = path.extname(filePath);
  const contentTypes = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png'
  };

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(500);
      res.end('Error loading dashboard assets.');
    } else {
      res.writeHead(200, { 'Content-Type': contentTypes[ext] || 'text/plain' });
      res.end(content);
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n========================================================`);
  console.log(`🚀 FIVERR KEYWORD INTELLIGENCE ENGINE RUNNING`);
  console.log(`📍 Web Dashboard: http://0.0.0.0:${PORT}`);
  console.log(`📡 Ingestion API: http://0.0.0.0:${PORT}/api/v1/ingest`);
  console.log(`========================================================\n`);
});
