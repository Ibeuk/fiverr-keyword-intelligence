/**
 * Validation and Data Integrity Rules
 * Strict enforcement: Never invent or assume missing Fiverr data.
 */

export class FiverrDataValidator {
  parseTns(rawText) {
    if (!rawText) return 0;
    const ofMatch = rawText.match(/of\s+([\d,]+)\s+results/i);
    if (ofMatch) {
      return parseInt(ofMatch[1].replace(/,/g, ''), 10);
    }

    const cleaned = rawText.replace(/,/g, '');
    const numMatch = cleaned.match(/\d+/);
    if (!numMatch) return 0;
    return parseInt(numMatch[0], 10);
  }

  validate(capture) {
    const errors = [];
    const warnings = [];

    if (!capture.searchQuery || capture.searchQuery.trim().length === 0) {
      errors.push('Search query is missing or empty.');
    }

    const sanitizedTns = this.parseTns(capture.rawResultCountText);
    if (sanitizedTns <= 0) {
      errors.push('Total Number of Sellers (Tns) could not be verified from Fiverr results header.');
    }

    const seen = new Set();
    const uniqueListings = [];
    let duplicateCount = 0;

    for (const listing of (capture.listings || [])) {
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

    const verifiedOrderCount = uniqueListings.filter(l => l.ordersInQueue !== null).length;
    const hasOrderQueueData = verifiedOrderCount > 0;

    if (!hasOrderQueueData) {
      errors.push('Insufficient verified Fiverr data: Order queue indicators are unavailable or could not be verified on the page.');
    } else if (verifiedOrderCount < uniqueListings.length) {
      warnings.push(`Partial order visibility: Orders verified for ${verifiedOrderCount}/${uniqueListings.length} listings.`);
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

  reconcileMath(listings, reportedTno, reportedNso) {
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
