/**
 * Validation and Data Integrity Rules
 * Strict enforcement: Never invent or assume missing Fiverr data.
 */

import { RawSearchCapture, RawListingInput } from './types.js';

export interface ValidationResult {
  isValid: boolean;
  sanitizedTns: number;
  uniqueListings: RawListingInput[];
  duplicateCount: number;
  hasOrderQueueData: boolean;
  errors: string[];
  warnings: string[];
}

export class FiverrDataValidator {
  /**
   * Sanitizes and parses the raw result count string.
   * Handles: "1,142 results", "1,000+ results", "Showing 1-48 of 2,340 results"
   */
  public parseTns(rawText: string): number {
    if (!rawText) return 0;
    // Look for patterns like "1,142+ results" or "of 2,340 results"
    const ofMatch = rawText.match(/of\s+([\d,]+)\s+results/i);
    if (ofMatch) {
      return parseInt(ofMatch[1].replace(/,/g, ''), 10);
    }

    const cleaned = rawText.replace(/,/g, '');
    const numMatch = cleaned.match(/\d+/);
    if (!numMatch) return 0;
    return parseInt(numMatch[0], 10);
  }

  /**
   * Validates raw capture payload
   */
  public validate(capture: RawSearchCapture): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 1. Validate Keyword
    if (!capture.searchQuery || capture.searchQuery.trim().length === 0) {
      errors.push('Search query is missing or empty.');
    }

    // 2. Validate Tns
    const sanitizedTns = this.parseTns(capture.rawResultCountText);
    if (sanitizedTns <= 0) {
      errors.push('Total Number of Sellers (Tns) could not be verified from Fiverr results header.');
    }

    // 3. De-duplicate Listings
    const seen = new Set<string>();
    const uniqueListings: RawListingInput[] = [];
    let duplicateCount = 0;

    for (const listing of capture.listings) {
      const key = listing.gigId ? `id:${listing.gigId}` : `url:${listing.gigUrl}`;
      if (seen.has(key)) {
        duplicateCount++;
        warnings.push(`Duplicate listing detected and normalized: ${listing.gigTitle} (${listing.sellerUsername})`);
      } else {
        seen.add(key);
        uniqueListings.push(listing);
      }
    }

    if (uniqueListings.length === 0) {
      errors.push('Zero verified listings could be extracted from the first page.');
    }

    // 4. Validate Order Queue Availability
    // If every single listing has ordersInQueue === null, order data was unverified
    const verifiedOrderCount = uniqueListings.filter(l => l.ordersInQueue !== null).length;
    const hasOrderQueueData = verifiedOrderCount > 0;

    if (!hasOrderQueueData) {
      errors.push('Insufficient verified Fiverr data: Order queue indicators are unavailable or could not be verified on the page.');
    } else if (verifiedOrderCount < uniqueListings.length) {
      warnings.push(`Partial order visibility: Orders verified for ${verifiedOrderCount}/${uniqueListings.length} listings.`);
    }

    // 5. Sanity Check: Tns >= Nsf
    if (sanitizedTns > 0 && uniqueListings.length > sanitizedTns) {
      warnings.push(`Discrepancy: First page listings (${uniqueListings.length}) exceeds reported total sellers (${sanitizedTns}). Normalizing Tns to ${uniqueListings.length}.`);
    }

    return {
      isValid: errors.length === 0,
      sanitizedTns: Math.max(sanitizedTns, uniqueListings.length),
      uniqueListings,
      duplicateCount,
      hasOrderQueueData,
      errors,
      warnings
    };
  }

  /**
   * Reconciles calculated totals against raw item records
   */
  public reconcileMath(
    listings: RawListingInput[],
    reportedTno: number,
    reportedNso: number
  ): { isReconciled: boolean; mismatchDetails?: string } {
    const activeListings = listings.filter(l => l.ordersInQueue !== null && l.ordersInQueue > 0);
    const expectedNso = activeListings.length;
    const expectedTno = activeListings.reduce((sum, l) => sum + (l.ordersInQueue || 0), 0);

    if (reportedNso !== expectedNso || reportedTno !== expectedTno) {
      return {
        isReconciled: false,
        mismatchDetails: `Mathematical mismatch: Reported Tno=${reportedTno}, Nso=${reportedNso} vs Verified Tno=${expectedTno}, Nso=${expectedNso}`
      };
    }

    return { isReconciled: true };
  }
}
