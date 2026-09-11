/**
 * Persistent Storage Engine for Fiverr Intelligence
 * Preserves historical records, master rankings, and research queues.
 */

import fs from 'node:fs';
import path from 'node:path';
import { VerifiedSearchAnalysis, MasterRankRecord } from '../core/types.js';
import { MasterRankingManager } from '../core/ranking.js';

interface StorageSchema {
  version: string;
  analyses: Record<string, VerifiedSearchAnalysis>;
  history: Array<{
    keyword: string;
    analyzedAt: string;
    Tns: number;
    Tno: number;
    Nso: number;
    average: number;
    opportunity: string;
  }>;
  researchQueue: Array<{
    keyword: string;
    addedAt: string;
    sourceKeyword?: string;
    status: 'pending' | 'analyzed' | 'ignored';
  }>;
}

export class FiverrStorage {
  private filePath: string;
  private rankingManager: MasterRankingManager;
  private state: StorageSchema;

  constructor(storageDir?: string) {
    const dir = storageDir || path.resolve(process.cwd(), 'data');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    this.filePath = path.join(dir, 'intelligence_store.json');
    this.rankingManager = new MasterRankingManager();
    this.state = this.loadState();

    // Hydrate ranking manager from persistent storage
    for (const analysis of Object.values(this.state.analyses)) {
      if (analysis.status === 'VERIFIED') {
        this.rankingManager.addOrUpdate(analysis);
      }
    }
  }

  private loadState(): StorageSchema {
    if (fs.existsSync(this.filePath)) {
      try {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        return JSON.parse(raw);
      } catch (err) {
        console.error('[Storage] Error loading store, initializing fresh state:', err);
      }
    }

    const initial: StorageSchema = {
      version: '1.0.0',
      analyses: {},
      history: [],
      researchQueue: []
    };
    this.saveState(initial);
    return initial;
  }

  private saveState(data: StorageSchema): void {
    const tempPath = `${this.filePath}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempPath, this.filePath);
  }

  public saveAnalysis(analysis: VerifiedSearchAnalysis): MasterRankRecord[] {
    const key = analysis.keyword.toLowerCase().trim();
    this.state.analyses[key] = analysis;

    // Append to historical timeline
    this.state.history.push({
      keyword: analysis.keyword,
      analyzedAt: analysis.analyzedAt,
      Tns: analysis.Tns,
      Tno: analysis.Tno,
      Nso: analysis.Nso,
      average: analysis.average,
      opportunity: analysis.strategicOpportunity
    });

    // Auto-update research queue if this keyword was in queue
    const queueItem = this.state.researchQueue.find(q => q.keyword.toLowerCase() === key);
    if (queueItem) {
      queueItem.status = 'analyzed';
    }

    // Auto-discover candidate keywords into research queue
    for (const discovered of analysis.discoveredKeywords) {
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

  public getRankings(): MasterRankRecord[] {
    return this.rankingManager.getRankingTable();
  }

  public getAnalysis(keyword: string): VerifiedSearchAnalysis | undefined {
    return this.state.analyses[keyword.toLowerCase().trim()];
  }

  public getAllAnalyses(): VerifiedSearchAnalysis[] {
    return Object.values(this.state.analyses);
  }

  public getQueue() {
    return this.state.researchQueue;
  }

  public addToQueue(keyword: string, sourceKeyword?: string) {
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

  public getHistory(keyword?: string) {
    if (keyword) {
      const k = keyword.toLowerCase().trim();
      return this.state.history.filter(h => h.keyword.toLowerCase() === k);
    }
    return this.state.history;
  }
}
