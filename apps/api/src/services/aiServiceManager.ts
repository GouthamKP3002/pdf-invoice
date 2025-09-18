// src/services/aiServiceManager.ts
import { extractDataWithGemini } from './geminiService.js';
import { extractDataWithGroq } from './groqService.js';

interface ExtractedData {
  vendor: {
    name: string;
    address?: string;
    taxId?: string;
  };
  invoice: {
    number: string;
    date: string;
    currency?: string;
    subtotal?: number;
    taxPercent?: number;
    total?: number;
    poNumber?: string;
    poDate?: string;
    lineItems: Array<{
      description: string;
      unitPrice: number;
      quantity: number;
      total: number;
    }>;
  };
}

class AIServiceManager {
  private geminiRetryCount = 0;
  private groqRetryCount = 0;
  private readonly maxRetries = 3;
  private readonly retryDelay = 2000; // 2 seconds

  async extractData(text: string, preferredModel: 'gemini' | 'groq' = 'gemini'): Promise<ExtractedData> {
    console.log(`🤖 Starting extraction with preferred model: ${preferredModel.toUpperCase()}`);
    
    if (preferredModel === 'gemini') {
      const geminiResult = await this.tryGemini(text);
      if (geminiResult.success && geminiResult.data) {
        return geminiResult.data;
      }
      
      console.log('🔄 Gemini failed, trying Groq as fallback...');
      const groqResult = await this.tryGroq(text);
      if (groqResult.success && groqResult.data) {
        return groqResult.data;
      }
    } else {
      const groqResult = await this.tryGroq(text);
      if (groqResult.success && groqResult.data) {
        return groqResult.data;
      }
      
      console.log('🔄 Groq failed, trying Gemini as fallback...');
      const geminiResult = await this.tryGemini(text);
      if (geminiResult.success && geminiResult.data) {
        return geminiResult.data;
      }
    }
    
    console.log('❌ Both AI services failed, using mock data');
    return this.generateMockInvoiceData();
  }

  private async tryGemini(text: string, attempt: number = 1): Promise<{ success: boolean; data: ExtractedData | null; error?: string }> {
    try {
      console.log(`🔷 Attempting Gemini extraction (attempt ${attempt}/${this.maxRetries})`);
      const data = await extractDataWithGemini(text);
      
      if (this.validateExtractedData(data)) {
        console.log('✅ Gemini extraction successful');
        this.geminiRetryCount = 0; // Reset on success
        return { success: true, data };
      } else {
        console.log('⚠️ Gemini returned invalid data structure');
        return { success: false, data: null, error: 'Invalid data structure' };
      }
    } catch (error: any) {
      console.error(`❌ Gemini attempt ${attempt} failed:`, error.message);
      
      // Check if it's a rate limit error
      if (error.status === 429) {
        const retryAfter = this.extractRetryDelay(error.message) || this.retryDelay;
        console.log(`⏳ Rate limited. Waiting ${retryAfter}ms before retry...`);
        
        if (attempt < this.maxRetries) {
          await this.delay(retryAfter);
          return this.tryGemini(text, attempt + 1);
        } else {
          return { success: false, data: null, error: 'Rate limit exceeded, max retries reached' };
        }
      }
      
      // For other errors, don't retry
      return { success: false, data: null, error: error.message };
    }
  }

  private async tryGroq(text: string, attempt: number = 1): Promise<{ success: boolean; data: ExtractedData | null; error?: string }> {
    try {
      console.log(`🟦 Attempting Groq extraction (attempt ${attempt}/${this.maxRetries})`);
      const data = await extractDataWithGroq(text);
      
      if (this.validateExtractedData(data)) {
        console.log('✅ Groq extraction successful');
        this.groqRetryCount = 0; // Reset on success
        return { success: true, data };
      } else {
        console.log('⚠️ Groq returned invalid data structure');
        return { success: false, data: null, error: 'Invalid data structure' };
      }
    } catch (error: any) {
      console.error(`❌ Groq attempt ${attempt} failed:`, error.message);
      
      // Check if it's a rate limit error
      if (error.status === 429 || error.message.includes('rate limit')) {
        console.log(`⏳ Groq rate limited. Waiting ${this.retryDelay}ms before retry...`);
        
        if (attempt < this.maxRetries) {
          await this.delay(this.retryDelay);
          return this.tryGroq(text, attempt + 1);
        } else {
          return { success: false, data: null, error: 'Rate limit exceeded, max retries reached' };
        }
      }
      
      // For other errors, don't retry
      return { success: false, data: null, error: error.message };
    }
  }

  private validateExtractedData(data: any): data is ExtractedData {
    return (
      data &&
      data.vendor &&
      typeof data.vendor.name === 'string' &&
      data.vendor.name.trim().length > 0 &&
      data.invoice &&
      typeof data.invoice.number === 'string' &&
      data.invoice.number.trim().length > 0 &&
      typeof data.invoice.date === 'string' &&
      data.invoice.date.trim().length > 0 &&
      Array.isArray(data.invoice.lineItems)
    );
  }

  private extractRetryDelay(errorMessage: string): number | null {
    const match = errorMessage.match(/"retryDelay":"(\d+)s"/);
    if (match) {
      return parseInt(match[1]) * 1000; // Convert seconds to milliseconds
    }
    return null;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private generateMockInvoiceData(): ExtractedData {
    return {
      vendor: {
        name: 'AI Extraction Failed - Mock Vendor',
        address: '123 Fallback Street, Error City, EC 12345',
        taxId: 'MOCK123456789'
      },
      invoice: {
        number: `MOCK-${Date.now()}`,
        date: new Date().toISOString().split('T')[0],
        currency: 'USD',
        subtotal: 100.00,
        taxPercent: 10,
        total: 110.00,
        poNumber: `PO-MOCK-${Date.now()}`,
        poDate: new Date().toISOString().split('T')[0],
        lineItems: [
          {
            description: 'AI Extraction Failed - Mock Line Item',
            unitPrice: 100.00,
            quantity: 1,
            total: 100.00
          }
        ]
      }
    };
  }
}

export const aiServiceManager = new AIServiceManager();

// Helper function to ensure the manager is properly exported with type safety
export async function extractDataSafely(text: string, model: 'gemini' | 'groq' = 'gemini'): Promise<ExtractedData> {
  return aiServiceManager.extractData(text, model);
}