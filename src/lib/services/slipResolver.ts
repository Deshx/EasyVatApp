import { FuelPriceHistory } from '@/lib/contexts/FuelPriceHistoryContext';

export interface SlipData {
  rate: string;
  volume: string;
  amount: string;
  date: string;
  needsReview?: boolean;
  productText?: string; // OCR text from the slip that might contain fuel type info
}

export interface ResolvedSlip extends SlipData {
  fuelType?: string;
  fuelTypeName?: string;
  confidence: 'high' | 'medium' | 'low' | 'flagged';
  resolutionMethod: 'price-date-match' | 'product-text-match' | 'manual-review';
  matchDetails?: {
    matchedPriceEntry?: FuelPriceHistory;
    priceMatchAccuracy?: number;
    dateMatchAccuracy?: number;
    textMatchConfidence?: number;
  };
}

export class SlipResolver {
  private priceHistory: FuelPriceHistory[];
  
  constructor(priceHistory: FuelPriceHistory[]) {
    this.priceHistory = priceHistory;
  }

  /**
   * Main resolver function - implements the three-step process
   */
  public resolveSlip(slip: SlipData): ResolvedSlip {
    // Step 1: Try to match using price and date
    const priceDateMatch = this.tryPriceDateMatch(slip);
    if (priceDateMatch.confidence === 'high') {
      return priceDateMatch;
    }

    // Step 2: Fall back to product text matching
    const productTextMatch = this.tryProductTextMatch(slip);
    if (productTextMatch.confidence === 'medium') {
      return productTextMatch;
    }

    // Step 3: Flag for manual review
    return this.flagForReview(slip);
  }

  /**
   * Step 1: Try to match using price and date
   */
  private tryPriceDateMatch(slip: SlipData): ResolvedSlip {
    const slipPrice = parseFloat(slip.rate);
    const slipDate = this.parseSlipDate(slip.date);
    
    if (!slipDate || isNaN(slipPrice)) {
      return this.createResolvedSlip(slip, 'flagged', 'manual-review');
    }

    let bestMatch: FuelPriceHistory | null = null;
    let bestScore = 0;
    let priceAccuracy = 0;
    let dateAccuracy = 0;

    for (const priceEntry of this.priceHistory) {
      const score = this.calculatePriceDateScore(slipPrice, slipDate, priceEntry);
      
      if (score.totalScore > bestScore) {
        bestScore = score.totalScore;
        bestMatch = priceEntry;
        priceAccuracy = score.priceAccuracy;
        dateAccuracy = score.dateAccuracy;
      }
    }

    if (bestMatch && bestScore > 0.8) { // High confidence threshold
      return this.createResolvedSlip(slip, 'high', 'price-date-match', {
        matchedPriceEntry: bestMatch,
        priceMatchAccuracy: priceAccuracy,
        dateMatchAccuracy: dateAccuracy
      });
    }

    if (bestMatch && bestScore > 0.6) { // Medium confidence threshold
      return this.createResolvedSlip(slip, 'medium', 'price-date-match', {
        matchedPriceEntry: bestMatch,
        priceMatchAccuracy: priceAccuracy,
        dateMatchAccuracy: dateAccuracy
      });
    }

    return this.createResolvedSlip(slip, 'low', 'manual-review');
  }

  /**
   * Step 2: Try to match using product text
   */
  private tryProductTextMatch(slip: SlipData): ResolvedSlip {
    if (!slip.productText) {
      return this.createResolvedSlip(slip, 'low', 'manual-review');
    }

    const textLower = slip.productText.toLowerCase();
    const fuelKeywords = this.extractFuelKeywords();
    
    let bestMatch: FuelPriceHistory | null = null;
    let bestConfidence = 0;

    for (const [fuelType, keywords] of Object.entries(fuelKeywords)) {
      const confidence = this.calculateTextMatchConfidence(textLower, keywords);
      
      if (confidence > bestConfidence) {
        bestConfidence = confidence;
        // Find the most recent price entry for this fuel type
        bestMatch = this.findMostRecentPriceEntry(fuelType);
      }
    }

    if (bestMatch && bestConfidence > 0.7) {
      return this.createResolvedSlip(slip, 'medium', 'product-text-match', {
        matchedPriceEntry: bestMatch,
        textMatchConfidence: bestConfidence
      });
    }

    return this.createResolvedSlip(slip, 'low', 'manual-review');
  }

  /**
   * Step 3: Flag for manual review
   */
  private flagForReview(slip: SlipData): ResolvedSlip {
    return this.createResolvedSlip(slip, 'flagged', 'manual-review');
  }

  /**
   * Calculate score for price and date matching
   */
  private calculatePriceDateScore(slipPrice: number, slipDate: Date, priceEntry: FuelPriceHistory): {
    totalScore: number;
    priceAccuracy: number;
    dateAccuracy: number;
  } {
    // Price matching (70% weight)
    const priceDiff = Math.abs(slipPrice - priceEntry.price);
    const priceAccuracy = Math.max(0, 1 - (priceDiff / priceEntry.price));
    
    // Date matching (30% weight)
    let dateAccuracy = 0;
    
    if (this.isDateInRange(slipDate, priceEntry)) {
      dateAccuracy = 1.0; // Perfect match if date is in range
    } else {
      // Calculate proximity to the date range
      const daysDiff = this.calculateDaysFromRange(slipDate, priceEntry);
      dateAccuracy = Math.max(0, 1 - (daysDiff / 30)); // Decay over 30 days
    }
    
    const totalScore = (priceAccuracy * 0.7) + (dateAccuracy * 0.3);
    
    return {
      totalScore,
      priceAccuracy,
      dateAccuracy
    };
  }

  /**
   * Check if date falls within price entry's active period
   */
  private isDateInRange(date: Date, priceEntry: FuelPriceHistory): boolean {
    const startDate = priceEntry.startDate;
    const endDate = priceEntry.endDate || new Date(); // Use current date if no end date
    
    return date >= startDate && date <= endDate;
  }

  /**
   * Calculate days from the nearest edge of the price range
   */
  private calculateDaysFromRange(date: Date, priceEntry: FuelPriceHistory): number {
    const startDate = priceEntry.startDate;
    const endDate = priceEntry.endDate || new Date();
    
    if (date < startDate) {
      return Math.abs((date.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    } else if (date > endDate) {
      return Math.abs((date.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24));
    }
    
    return 0; // Date is within range
  }

  /**
   * Extract fuel type keywords for text matching
   */
  private extractFuelKeywords(): Record<string, string[]> {
    const keywords: Record<string, string[]> = {};
    
    // Group price history by fuel type and extract keywords
    for (const entry of this.priceHistory) {
      if (!keywords[entry.fuelType]) {
        keywords[entry.fuelType] = this.generateKeywordsForFuelType(entry.fuelType);
      }
    }
    
    return keywords;
  }

  /**
   * Generate keywords for a fuel type
   */
  private generateKeywordsForFuelType(fuelType: string): string[] {
    const baseKeywords = [fuelType.toLowerCase()];
    
    // Add common variations
    if (fuelType.toLowerCase().includes('petrol')) {
      baseKeywords.push('petrol', 'gasoline', 'gas', 'unleaded');
    }
    
    if (fuelType.toLowerCase().includes('diesel')) {
      baseKeywords.push('diesel', 'gasoil');
    }
    
    if (fuelType.toLowerCase().includes('95')) {
      baseKeywords.push('95', 'octane 95', 'ron 95');
    }
    
    if (fuelType.toLowerCase().includes('92')) {
      baseKeywords.push('92', 'octane 92', 'ron 92');
    }
    
    if (fuelType.toLowerCase().includes('super')) {
      baseKeywords.push('super', 'premium');
    }
    
    return baseKeywords;
  }

  /**
   * Calculate confidence for text matching
   */
  private calculateTextMatchConfidence(text: string, keywords: string[]): number {
    let matches = 0;
    let totalKeywords = keywords.length;
    
    for (const keyword of keywords) {
      if (text.includes(keyword)) {
        matches++;
      }
    }
    
    return matches / totalKeywords;
  }

  /**
   * Find the most recent price entry for a fuel type
   */
  private findMostRecentPriceEntry(fuelType: string): FuelPriceHistory | null {
    const entries = this.priceHistory
      .filter(entry => entry.fuelType === fuelType)
      .sort((a, b) => b.startDate.getTime() - a.startDate.getTime());
    
    return entries[0] || null;
  }

  /**
   * Parse slip date string to Date object
   */
  private parseSlipDate(dateString: string): Date | null {
    if (!dateString) return null;
    
    try {
      // Handle DD-MM-YY format
      const parts = dateString.split('-');
      if (parts.length === 3) {
        const day = parseInt(parts[0]);
        const month = parseInt(parts[1]) - 1; // Month is 0-indexed
        let year = parseInt(parts[2]);
        
        // Convert 2-digit year to 4-digit
        if (year < 100) {
          const currentYear = new Date().getFullYear();
          const century = Math.floor(currentYear / 100) * 100;
          year = century + year;
        }
        
        return new Date(year, month, day);
      }
    } catch (error) {
      console.error('Error parsing slip date:', error);
    }
    
    return null;
  }

  /**
   * Create a resolved slip object
   */
  private createResolvedSlip(
    slip: SlipData, 
    confidence: ResolvedSlip['confidence'], 
    method: ResolvedSlip['resolutionMethod'],
    matchDetails?: ResolvedSlip['matchDetails']
  ): ResolvedSlip {
    const resolved: ResolvedSlip = {
      ...slip,
      confidence,
      resolutionMethod: method,
      matchDetails
    };

    // Add fuel type info if we have a match
    if (matchDetails?.matchedPriceEntry) {
      resolved.fuelType = matchDetails.matchedPriceEntry.id;
      resolved.fuelTypeName = `${matchDetails.matchedPriceEntry.fuelType} (Rs. ${matchDetails.matchedPriceEntry.price}/L)`;
    }

    return resolved;
  }
} 