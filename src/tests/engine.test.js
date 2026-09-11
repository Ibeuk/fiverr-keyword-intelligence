/**
 * Automated Test Suite for Fiverr Intelligence Engine (ESM)
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { FiverrSearchProcessor } from '../core/parser.js';
import { FiverrCalculator } from '../core/calculator.js';
import { MasterRankingManager } from '../core/ranking.js';

describe('Fiverr Intelligence Engine - Mathematical & Integrity Tests', () => {

  const processor = new FiverrSearchProcessor({ minimumOrderThreshold: 30 });
  const calculator = new FiverrCalculator({ minimumOrderThreshold: 30 });

  test('Benchmark Formula Test: (35 * 7) / 1,100 = 0.22', () => {
    const { average, rawValue, formulaStr } = calculator.computeAverage(35, 7, 1100);
    
    assert.equal(average, 0.22, 'Average must be exactly 0.22');
    assert.ok(Math.abs(rawValue - 0.222727) < 0.0001, 'Raw value must match (245 / 1100)');
    assert.ok(formulaStr.includes('(35 × 7) / 1100'), 'Formula string must be transparent');
  });

  test('30+ Order Opportunity Threshold: Pass vs Fail', () => {
    // 35 orders -> PASS
    const passEval = calculator.evaluateStrategicOpportunity(35, 0.22, 'Distributed', 1100, 7);
    assert.equal(passEval.opportunity, 'Strong');

    // 15 orders -> FAIL (< 30)
    const failEval = calculator.evaluateStrategicOpportunity(15, 0.25, 'Distributed', 500, 3);
    assert.equal(failEval.opportunity, 'Weak');
    assert.ok(failEval.reason.includes('Failed the minimum order threshold of 30'));
  });

  test('End-to-End Search Processing: User Benchmark Scenario', () => {
    const capture = {
      searchQuery: 'KDP ebook formatting',
      searchUrl: 'https://www.fiverr.com/search/gigs?query=KDP+ebook+formatting',
      capturedAt: '2026-09-09T23:55:00Z',
      rawResultCountText: '1,100+ results',
      listings: [
        { position: 1, gigId: 'g1', gigTitle: 'KDP Ebook Formatting Expert', gigUrl: 'https://fiverr.com/sellerA/g1', sellerUsername: 'sellerA', sellerLevel: 'Top Rated Seller', isFiverrChoice: true, isPromoted: false, ordersInQueue: 8, ratingScore: 5.0, ratingCount: 300 },
        { position: 2, gigId: 'g2', gigTitle: 'Kindle Formatting and Paperback', gigUrl: 'https://fiverr.com/sellerB/g2', sellerUsername: 'sellerB', sellerLevel: 'Level 2', isFiverrChoice: false, isPromoted: false, ordersInQueue: 7, ratingScore: 4.9, ratingCount: 150 },
        { position: 3, gigId: 'g3', gigTitle: 'Professional Book Formatting for Amazon', gigUrl: 'https://fiverr.com/sellerC/g3', sellerUsername: 'sellerC', sellerLevel: 'Level 2', isFiverrChoice: false, isPromoted: false, ordersInQueue: 6, ratingScore: 5.0, ratingCount: 80 },
        { position: 4, gigId: 'g4', gigTitle: 'Format KDP Paperback and Ebook', gigUrl: 'https://fiverr.com/sellerD/g4', sellerUsername: 'sellerD', sellerLevel: 'Level 1', isFiverrChoice: false, isPromoted: false, ordersInQueue: 5, ratingScore: 4.8, ratingCount: 40 },
        { position: 5, gigId: 'g5', gigTitle: 'Book Interior Formatting Specialist', gigUrl: 'https://fiverr.com/sellerE/g5', sellerUsername: 'sellerE', sellerLevel: 'Level 1', isFiverrChoice: false, isPromoted: false, ordersInQueue: 4, ratingScore: 4.9, ratingCount: 25 },
        { position: 6, gigId: 'g6', gigTitle: 'Format Kindle Ebook', gigUrl: 'https://fiverr.com/sellerF/g6', sellerUsername: 'sellerF', sellerLevel: 'New Seller', isFiverrChoice: false, isPromoted: false, ordersInQueue: 3, ratingScore: 5.0, ratingCount: 10 },
        { position: 7, gigId: 'g7', gigTitle: 'KDP Book Layout Design', gigUrl: 'https://fiverr.com/sellerG/g7', sellerUsername: 'sellerG', sellerLevel: 'New Seller', isFiverrChoice: false, isPromoted: false, ordersInQueue: 2, ratingScore: 4.7, ratingCount: 5 },
        { position: 8, gigId: 'g8', gigTitle: 'Format Ebook Cheap', gigUrl: 'https://fiverr.com/sellerH/g8', sellerUsername: 'sellerH', sellerLevel: 'Level 1', isFiverrChoice: false, isPromoted: false, ordersInQueue: 0, ratingScore: 4.5, ratingCount: 3 },
        { position: 9, gigId: 'g9', gigTitle: 'Ebook Layout', gigUrl: 'https://fiverr.com/sellerI/g9', sellerUsername: 'sellerI', sellerLevel: 'New Seller', isFiverrChoice: false, isPromoted: false, ordersInQueue: 0, ratingScore: null, ratingCount: 0 },
        { position: 10, gigId: 'g10', gigTitle: 'Quick Kindle Fix', gigUrl: 'https://fiverr.com/sellerJ/g10', sellerUsername: 'sellerJ', sellerLevel: 'New Seller', isFiverrChoice: false, isPromoted: false, ordersInQueue: 0, ratingScore: null, ratingCount: 0 }
      ]
    };

    const analysis = processor.process(capture);

    assert.equal(analysis.status, 'VERIFIED');
    assert.equal(analysis.Tns, 1100, 'Tns must be 1,100');
    assert.equal(analysis.Nsf, 10, 'Nsf must be 10');
    assert.equal(analysis.Nfc, 1, 'Nfc must be 1');
    assert.equal(analysis.Nso, 7, 'Nso must be 7');
    assert.equal(analysis.Tno, 35, 'Tno must be 35');
    assert.equal(analysis.average, 0.22, 'Average must be 0.22');
    assert.equal(analysis.orderThresholdPassed, true, 'Threshold 30+ must pass');
    assert.equal(analysis.strategicOpportunity, 'Strong');
    assert.equal(analysis.marketBehavior, 'Distributed');
  });

  test('Missing Data Guard: Reject when order indicators are unavailable', () => {
    const unverifiedCapture = {
      searchQuery: 'ghostwriting',
      capturedAt: '2026-09-09T23:56:00Z',
      rawResultCountText: '3,500 results',
      listings: [
        { position: 1, gigId: 'u1', gigTitle: 'Ghostwriter 1', gigUrl: '/u1', sellerUsername: 's1', sellerLevel: 'Level 2', isFiverrChoice: false, isPromoted: false, ordersInQueue: null, ratingScore: 5.0, ratingCount: 50 },
        { position: 2, gigId: 'u2', gigTitle: 'Ghostwriter 2', gigUrl: '/u2', sellerUsername: 's2', sellerLevel: 'Level 1', isFiverrChoice: false, isPromoted: false, ordersInQueue: null, ratingScore: 4.8, ratingCount: 20 }
      ]
    };

    const result = processor.process(unverifiedCapture);
    assert.equal(result.status, 'INSUFFICIENT_DATA');
    assert.equal(result.strategicOpportunity, 'Insufficient Data');
    assert.ok(result.validationErrors.some(e => e.includes('Order queue indicators are unavailable')));
  });

  test('De-duplication Guard: Normalizes duplicate gig listings', () => {
    const duplicateCapture = {
      searchQuery: 'logo design',
      capturedAt: '2026-09-09T23:57:00Z',
      rawResultCountText: '500 results',
      listings: [
        { position: 1, gigId: 'dup_1', gigTitle: 'Unique Logo Design', gigUrl: '/dup1', sellerUsername: 'designerA', sellerLevel: 'Level 2', isFiverrChoice: false, isPromoted: true, ordersInQueue: 4, ratingScore: 5.0, ratingCount: 100 },
        { position: 2, gigId: 'dup_1', gigTitle: 'Unique Logo Design', gigUrl: '/dup1', sellerUsername: 'designerA', sellerLevel: 'Level 2', isFiverrChoice: false, isPromoted: false, ordersInQueue: 4, ratingScore: 5.0, ratingCount: 100 }
      ]
    };

    const result = processor.process(duplicateCapture);
    assert.equal(result.Nsf, 1, 'Duplicate must be filtered out');
    assert.equal(result.Tno, 4, 'Tno must not double count');
  });

  test('Master Ranking Table: Auto-sorting by Average descending', () => {
    const ranking = new MasterRankingManager();

    const a1 = processor.process({
      searchQuery: 'KDP formatting',
      capturedAt: '2026-09-09T23:58:00Z',
      rawResultCountText: '1,100 results',
      listings: [
        { position: 1, gigId: 'k1', gigTitle: 'Gig 1', gigUrl: '/k1', sellerUsername: 'user1', sellerLevel: 'Level 2', isFiverrChoice: false, isPromoted: false, ordersInQueue: 35, ratingScore: 5.0, ratingCount: 100 }
      ]
    });

    const a2 = processor.process({
      searchQuery: 'Kindle formatting',
      capturedAt: '2026-09-09T23:58:00Z',
      rawResultCountText: '800 results',
      listings: [
        { position: 1, gigId: 'k2', gigTitle: 'Gig 2', gigUrl: '/k2', sellerUsername: 'user2', sellerLevel: 'Top Rated Seller', isFiverrChoice: true, isPromoted: false, ordersInQueue: 45, ratingScore: 5.0, ratingCount: 200 },
        { position: 2, gigId: 'k2_2', gigTitle: 'Gig 2b', gigUrl: '/k2_2', sellerUsername: 'user2b', sellerLevel: 'Level 2', isFiverrChoice: false, isPromoted: false, ordersInQueue: 20, ratingScore: 4.9, ratingCount: 150 }
      ]
    });

    ranking.addOrUpdate(a1);
    ranking.addOrUpdate(a2);

    const table = ranking.getRankingTable();
    assert.equal(table.length, 2);
    assert.ok(table[0].average >= table[1].average, 'Rank #1 must have higher Average than Rank #2');
    assert.equal(table[0].rank, 1);
    assert.equal(table[1].rank, 2);
  });
});
