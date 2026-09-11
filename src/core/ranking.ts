/**
 * Master Ranking Table Manager
 * Rule: Highest Average = Rank #1. Automatically updates and sorts.
 */

import { VerifiedSearchAnalysis, MasterRankRecord } from './types.js';

export class MasterRankingManager {
  private analysisMap = new Map<string, VerifiedSearchAnalysis>();

  /**
   * Adds or updates a keyword analysis and recalculates ranks
   */
  public addOrUpdate(analysis: VerifiedSearchAnalysis): MasterRankRecord[] {
    const key = analysis.keyword.toLowerCase().trim();
    this.analysisMap.set(key, analysis);
    return this.getRankingTable();
  }

  /**
   * Retrieves all rankings strictly sorted by Average descending
   */
  public getRankingTable(): MasterRankRecord[] {
    const all = Array.from(this.analysisMap.values());

    // Sort rule: Highest Average first. Secondary sort: Higher Tno, then lower Tns.
    all.sort((a, b) => {
      if (b.average !== a.average) {
        return b.average - a.average;
      }
      if (b.Tno !== a.Tno) {
        return b.Tno - a.Tno;
      }
      return a.Tns - b.Tns;
    });

    return all.map((item, index) => ({
      rank: index + 1,
      keyword: item.keyword,
      Tns: item.Tns,
      Tno: item.Tno,
      Nso: item.Nso,
      average: item.average,
      opportunity: item.strategicOpportunity,
      analyzedAt: item.analyzedAt,
      status: item.status
    }));
  }

  public getAnalysis(keyword: string): VerifiedSearchAnalysis | undefined {
    return this.analysisMap.get(keyword.toLowerCase().trim());
  }

  public getAllAnalyses(): VerifiedSearchAnalysis[] {
    return Array.from(this.analysisMap.values());
  }

  public removeKeyword(keyword: string): boolean {
    return this.analysisMap.delete(keyword.toLowerCase().trim());
  }

  public clear(): void {
    this.analysisMap.clear();
  }
}
