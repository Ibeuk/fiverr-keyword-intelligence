/**
 * Master Ranking Manager (ESM)
 */

export class MasterRankingManager {
  constructor() {
    this.analysisMap = new Map();
  }

  addOrUpdate(analysis) {
    const key = analysis.keyword.toLowerCase().trim();
    this.analysisMap.set(key, analysis);
    return this.getRankingTable();
  }

  getRankingTable() {
    const all = Array.from(this.analysisMap.values());

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

  getAnalysis(keyword) {
    return this.analysisMap.get(keyword.toLowerCase().trim());
  }

  getAllAnalyses() {
    return Array.from(this.analysisMap.values());
  }

  removeKeyword(keyword) {
    return this.analysisMap.delete(keyword.toLowerCase().trim());
  }

  clear() {
    this.analysisMap.clear();
  }
}
