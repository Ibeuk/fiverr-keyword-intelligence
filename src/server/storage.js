/**
 * Persistent Storage Engine for Fiverr Intelligence (ESM)
 */

import fs from 'node:fs';
import path from 'node:path';
import { MasterRankingManager } from '../core/ranking.js';

export class FiverrStorage {
  constructor(storageDir) {
    const dir = storageDir || path.resolve(process.cwd(), 'data');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    this.filePath = path.join(dir, 'intelligence_store.json');
    this.rankingManager = new MasterRankingManager();
    this.state = this.loadState();

    for (const analysis of Object.values(this.state.analyses || {})) {
      if (analysis.status === 'VERIFIED') {
        this.rankingManager.addOrUpdate(analysis);
      }
    }
  }

  loadState() {
    if (fs.existsSync(this.filePath)) {
      try {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        return JSON.parse(raw);
      } catch (err) {
        console.error('[Storage] Error loading store, initializing fresh state:', err);
      }
    }

    const initial = {
      version: '1.0.0',
      analyses: {},
      history: [],
      researchQueue: []
    };
    this.saveState(initial);
    return initial;
  }

  saveState(data) {
    const tempPath = `${this.filePath}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempPath, this.filePath);
  }

  saveAnalysis(analysis) {
    const key = analysis.keyword.toLowerCase().trim();
    this.state.analyses[key] = analysis;

    this.state.history.push({
      keyword: analysis.keyword,
      analyzedAt: analysis.analyzedAt,
      Tns: analysis.Tns,
      Tno: analysis.Tno,
      Nso: analysis.Nso,
      average: analysis.average,
      opportunity: analysis.strategicOpportunity
    });

    const queueItem = this.state.researchQueue.find(q => q.keyword.toLowerCase() === key);
    if (queueItem) {
      queueItem.status = 'analyzed';
    }

    for (const discovered of (analysis.discoveredKeywords || [])) {
      const discKey = discovered.toLowerCase().trim();
      const existsInAnalyses = !!this.state.analyses[discKey];
      const existsInQueue = this.state.researchQueue.some(q => q.keyword.toLowerCase() === discKey);
      if (!existsInAnalyses && !existsInQueue) {
        this.state.researchQueue.push({
          keyword: discovered,
          addedAt: new Date().toISOString(),
          sourceKeyword: analysis.keyword,
          status: 'pending'
        });
      }
    }

    this.saveState(this.state);
    return this.rankingManager.addOrUpdate(analysis);
  }

  getRankings() {
    return this.rankingManager.getRankingTable();
  }

  getAnalysis(keyword) {
    return this.state.analyses[keyword.toLowerCase().trim()];
  }

  getAllAnalyses() {
    return Object.values(this.state.analyses);
  }

  getQueue() {
    return this.state.researchQueue;
  }

  addToQueue(keyword, sourceKeyword) {
    const clean = keyword.trim();
    if (!this.state.researchQueue.some(q => q.keyword.toLowerCase() === clean.toLowerCase())) {
      this.state.researchQueue.push({
        keyword: clean,
        addedAt: new Date().toISOString(),
        sourceKeyword,
        status: 'pending'
      });
      this.saveState(this.state);
    }
  }

  getHistory(keyword) {
    if (keyword) {
      const k = keyword.toLowerCase().trim();
      return this.state.history.filter(h => h.keyword.toLowerCase() === k);
    }
    return this.state.history;
  }
}
