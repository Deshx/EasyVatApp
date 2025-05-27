import { db } from '../firebase/firebase';
import { doc, getDoc, setDoc, updateDoc, runTransaction } from 'firebase/firestore';

export interface InvoiceCounter {
  count: number;
  year: number;
  vatNumber: string;
  lastUpdated: Date;
}

export class InvoiceIdService {
  private static readonly COUNTER_COLLECTION = 'invoiceCounters';
  
  /**
   * Generate a standardized invoice ID in the format: EV-[VAT_NUMBER]-YYYY-0001
   * @param vatNumber - The VAT number of the filling station
   * @returns Promise<string> - The generated invoice ID
   */
  static async generateInvoiceId(vatNumber: string): Promise<string> {
    const currentYear = new Date().getFullYear();
    const cleanVatNumber = this.cleanVatNumber(vatNumber);
    
    // Create a unique document ID for this VAT number and year combination
    const counterId = `${cleanVatNumber}-${currentYear}`;
    
    try {
      // Use a transaction to ensure atomicity when incrementing counter
      const invoiceId = await runTransaction(db, async (transaction) => {
        const counterRef = doc(db, this.COUNTER_COLLECTION, counterId);
        const counterDoc = await transaction.get(counterRef);
        
        let count = 1;
        
        if (counterDoc.exists()) {
          const counterData = counterDoc.data() as InvoiceCounter;
          count = counterData.count + 1;
          
          // Update the existing counter
          transaction.update(counterRef, {
            count,
            lastUpdated: new Date()
          });
        } else {
          // Create a new counter for this VAT number and year
          const newCounter: InvoiceCounter = {
            count: 1,
            year: currentYear,
            vatNumber: cleanVatNumber,
            lastUpdated: new Date()
          };
          
          transaction.set(counterRef, newCounter);
        }
        
        // Format the count with leading zeros (4 digits)
        const formattedCount = count.toString().padStart(4, '0');
        
        // Return the complete invoice ID
        return `EV-${cleanVatNumber}-${currentYear}-${formattedCount}`;
      });
      
      return invoiceId;
    } catch (error) {
      console.error('Error generating invoice ID:', error);
      throw new Error('Failed to generate invoice ID');
    }
  }
  
  /**
   * Clean and format VAT number for use in invoice ID
   * @param vatNumber - Raw VAT number
   * @returns string - Cleaned VAT number
   */
  private static cleanVatNumber(vatNumber: string): string {
    // Remove common suffixes like "- 7000" and whitespace
    let cleaned = vatNumber.replace(/\s*-\s*7000\s*$/i, '').trim();
    
    // Remove any remaining spaces and special characters except hyphens and alphanumeric
    cleaned = cleaned.replace(/[^a-zA-Z0-9-]/g, '');
    
    // Ensure it's not empty
    if (!cleaned) {
      throw new Error('Invalid VAT number provided');
    }
    
    return cleaned.toUpperCase();
  }
  
  /**
   * Get the current counter for a specific VAT number and year
   * @param vatNumber - The VAT number
   * @param year - The year (defaults to current year)
   * @returns Promise<number> - Current counter value
   */
  static async getCurrentCount(vatNumber: string, year?: number): Promise<number> {
    const targetYear = year || new Date().getFullYear();
    const cleanVatNumber = this.cleanVatNumber(vatNumber);
    const counterId = `${cleanVatNumber}-${targetYear}`;
    
    try {
      const counterRef = doc(db, this.COUNTER_COLLECTION, counterId);
      const counterDoc = await getDoc(counterRef);
      
      if (counterDoc.exists()) {
        const counterData = counterDoc.data() as InvoiceCounter;
        return counterData.count;
      }
      
      return 0; // No invoices yet for this VAT number and year
    } catch (error) {
      console.error('Error getting current count:', error);
      throw new Error('Failed to get current invoice count');
    }
  }
  
  /**
   * Reset counter for a specific VAT number and year (admin use only)
   * @param vatNumber - The VAT number
   * @param year - The year
   * @param newCount - The new count to set
   */
  static async resetCounter(vatNumber: string, year: number, newCount: number = 0): Promise<void> {
    const cleanVatNumber = this.cleanVatNumber(vatNumber);
    const counterId = `${cleanVatNumber}-${year}`;
    
    try {
      const counterRef = doc(db, this.COUNTER_COLLECTION, counterId);
      const counterData: InvoiceCounter = {
        count: newCount,
        year,
        vatNumber: cleanVatNumber,
        lastUpdated: new Date()
      };
      
      await setDoc(counterRef, counterData);
    } catch (error) {
      console.error('Error resetting counter:', error);
      throw new Error('Failed to reset invoice counter');
    }
  }
  
  /**
   * Validate if an invoice ID follows the correct format
   * @param invoiceId - The invoice ID to validate
   * @returns boolean - True if valid format
   */
  static validateInvoiceIdFormat(invoiceId: string): boolean {
    // Pattern: EV-[VAT_NUMBER]-YYYY-0001
    const pattern = /^EV-[A-Z0-9-]+-\d{4}-\d{4}$/;
    return pattern.test(invoiceId);
  }
  
  /**
   * Extract components from an invoice ID
   * @param invoiceId - The invoice ID to parse
   * @returns object with vatNumber, year, and sequence
   */
  static parseInvoiceId(invoiceId: string): { vatNumber: string; year: number; sequence: number } | null {
    if (!this.validateInvoiceIdFormat(invoiceId)) {
      return null;
    }
    
    const parts = invoiceId.split('-');
    if (parts.length < 4) {
      return null;
    }
    
    // EV-VAT_NUMBER-YEAR-SEQUENCE
    // The VAT number might contain hyphens, so we need to handle this carefully
    const prefix = parts[0]; // "EV"
    const sequence = parseInt(parts[parts.length - 1]); // Last part is sequence
    const year = parseInt(parts[parts.length - 2]); // Second to last is year
    
    // Everything between prefix and year/sequence is the VAT number
    const vatNumber = parts.slice(1, parts.length - 2).join('-');
    
    return {
      vatNumber,
      year,
      sequence
    };
  }
} 