/**
 * Complete Search Result Processor & Parser
 * Converts raw search capture into verified analytical intelligence.
 */

import { RawSearchCapture, VerifiedSearchAnalysis } from './types.js';
import { FiverrDataValidator } from './validator.js';
import { FiverrCalculator, CalculatorConfig } from './calculator.js';

export class FiverrSearchProcessor {
  private validator: FiverrDataValidator;
  private calculator: FiverrCalculator;

  constructor(config: CalculatorConfig = {}) {
    this.validator = new FiverrDataValidator();
    this.calculator = new FiverrCalculator(config);
  }

  /**
   * Processes a raw search capture and derives verified analytical intelligence.
   */
  public process(capture: RawSearchCapture): VerifiedSearchAnalysis {
    const validation = this.validator.validate(capture);
    const id = `analysis_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    if (!validation.isValid) {
      return {
        id,
        keyword: capture.searchQuery,
        searchUrl: capture.searchUrl,
        analyzedAt: capture.capturedAt,
        status: 'INSUFFICIENT_DATA',
        validationErrors: validation.errors,
        Tns: validation.sanitizedTns,
        Nsf: validation.uniqueListings.length,
        Nfc: 0,
        Nso: 0,
        Tno: 0,
        average: 0,
        calculationFormula: 'Insufficient verified Fiverr data',
        firstFiveRows: {
          listingCount: 0,
          Nso: 0,
          Tno: 0,
          average: 0,
          calculationFormula: 'Insufficient data'
        },
        sellerLevels: {
          topRated: { count: 0, percentage: 0 },
          level2: { count: 0, percentage: 0 },
          level1: { count: 0, percentage: 0 },
          newSeller: { count: 0, percentage: 0 },
          unknown: { count: 0, percentage: 0 }
        },
        orderThresholdPassed: false,
        configuredThreshold: 30,
        competition: 'Low',
        demand: 'Low',
        liquidity: 'Low',
        marketBehavior: 'Distributed',
        marketBehaviorEvidence: 'No verified data available.',
        strategicOpportunity: 'Insufficient Data',
        strategicReason: validation.errors.join('; '),
        activeSellers: [],
        listings: validation.uniqueListings,
        discoveredKeywords: []
      };
    }

    const { sanitizedTns, uniqueListings } = validation;
    const Nsf = uniqueListings.length;

    // 1. Fiverr Choice Count
    const Nfc = uniqueListings.filter(l => l.isFiverrChoice).length;

    // 2. Orders In Queue & Active Sellers
    const activeListings = uniqueListings.filter(l => l.ordersInQueue !== null && l.ordersInQueue > 0);
    const Nso = activeListings.length;
    const Tno = activeListings.reduce((sum, l) => sum + (l.ordersInQueue || 0), 0);

    // Reconcile math
    const reconciliation = this.validator.reconcileMath(uniqueListings, Tno, Nso);
    if (!reconciliation.isReconciled) {
      throw new Error(reconciliation.mismatchDetails);
    }

    // 3. Exact Average: (Tno * Nso) / Tns
    const { average, formulaStr } = this.calculator.computeAverage(Tno, Nso, sanitizedTns);

    // 4. First 5 Rows Analysis
    const firstFiveRows = this.calculator.computeFirstFiveRows(uniqueListings, sanitizedTns);

    // 5. Seller Level Distribution
    const sellerLevels = this.calculator.computeSellerLevels(uniqueListings);

    // 6. Market Behavior & Concentration
    const { marketBehavior, evidence, activeSellers } = this.calculator.computeMarketConcentration(uniqueListings, Tno);

    // 7. Market Classifications
    const competition = this.calculator.classifyCompetition(sanitizedTns);
    const demand = this.calculator.classifyDemand(Tno);
    const liquidity = this.calculator.classifyLiquidity(average);

    // 8. Strategic Opportunity
    const { opportunity, reason } = this.calculator.evaluateStrategicOpportunity(
      Tno,
      average,
      marketBehavior,
      sanitizedTns,
      Nso
    );

    // 9. Keyword Discovery
    const discoveredKeywords = this.calculator.discoverKeywords(uniqueListings, capture.searchQuery);

    return {
      id,
      keyword: capture.searchQuery,
      searchUrl: capture.searchUrl,
      analyzedAt: capture.capturedAt,
      status: 'VERIFIED',
      validationErrors: [],
      Tns: sanitizedTns,
      Nsf,
      Nfc,
      Nso,
      Tno,
      average,
      calculationFormula: formulaStr,
      firstFiveRows,
      sellerLevels,
      orderThresholdPassed: Tno >= 30,
      configuredThreshold: 30,
      competition,
      demand,
      liquidity,
      marketBehavior,
      marketBehaviorEvidence: evidence,
      strategicOpportunity: opportunity,
      strategicReason: reason,
      activeSellers,
      listings: uniqueListings,
      discoveredKeywords
    };
  }
}
