import { GoogleGenAI } from '@google/genai';
import { InventoryItem } from '../types/discogs';

export interface PricingAdvice {
  recommendedPrice: number;
  marketPosition: 'Aggressive' | 'Balanced' | 'Premium';
  confidence: 'High' | 'Medium' | 'Low';
  rationale: string;
  conditionTips: string;
  speedOfSaleEstimate: string;
}

export async function getSmartPricingAdvice(item: InventoryItem): Promise<PricingAdvice> {
  const apiKey = (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_GEMINI_API_KEY || '';

  const prompt = `You are an elite Discogs vinyl store appraiser and record dealer.
Analyze this inventory item and provide optimal pricing advice for maximum sell-through and profit:
- Artist: ${item.artist}
- Title: ${item.title}
- Year: ${item.year}
- Format: ${item.format}
- Media Condition: ${item.mediaCondition}
- Sleeve Condition: ${item.sleeveCondition}
- Current Listing Price: $${item.price}
- Original Cost: $${item.originalCost}
- Marketplace Stats:
  * Lowest Price for release: $${item.marketStats.lowest}
  * Median Sold Price: $${item.marketStats.median}
  * Highest Sold Price: $${item.marketStats.highest}
  * Active copies for sale on Discogs: ${item.marketStats.numForSale}
  * Discogs Wantlist count: ${item.marketStats.wantCount}
  * Have count: ${item.marketStats.haveCount}

Return a valid JSON object strictly matching this schema with NO markdown wrapping:
{
  "recommendedPrice": number,
  "marketPosition": "Aggressive" | "Balanced" | "Premium",
  "confidence": "High" | "Medium" | "Low",
  "rationale": "2-3 concise sentences explaining why this price maximizes store profit and competitiveness.",
  "conditionTips": "1 sentence specific condition comment addition to improve buyer trust on Discogs.",
  "speedOfSaleEstimate": "e.g. Under 7 days / 2-4 weeks / 1-3 months"
}`;

  try {
    if (apiKey) {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      const text = response.text || '';
      const cleanJson = text.replace(/```json/gi, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson);
      return {
        recommendedPrice: Number(parsed.recommendedPrice) || item.marketStats.median,
        marketPosition: parsed.marketPosition || 'Balanced',
        confidence: parsed.confidence || 'High',
        rationale: parsed.rationale || 'Priced competitively aligned with historical median sales.',
        conditionTips: parsed.conditionTips || 'Highlight play grading and sleeve corner preservation.',
        speedOfSaleEstimate: parsed.speedOfSaleEstimate || '2-4 weeks',
      };
    }
  } catch (err) {
    console.warn('Gemini AI advisor fallback used:', err);
  }

  // Domain-grounded algorithmic calculation fallback:
  const isHighDemand = item.marketStats.wantCount > item.marketStats.haveCount * 0.8;
  const isScarce = item.marketStats.numForSale < 20;
  
  let recPrice = item.marketStats.median;
  let position: 'Aggressive' | 'Balanced' | 'Premium' = 'Balanced';
  let speed = '2-4 weeks';

  if (isScarce && isHighDemand) {
    recPrice = Number((item.marketStats.median * 1.12).toFixed(2));
    position = 'Premium';
    speed = '1-2 weeks (high collector demand)';
  } else if (item.marketStats.numForSale > 75) {
    recPrice = Number((item.marketStats.lowest > 0 ? item.marketStats.lowest - 0.50 : item.marketStats.median * 0.9).toFixed(2));
    position = 'Aggressive';
    speed = 'Under 7 days';
  }

  // Ensure above cost
  recPrice = Math.max(recPrice, item.originalCost * 1.35);

  return {
    recommendedPrice: Number(recPrice.toFixed(2)),
    marketPosition: position,
    confidence: 'High',
    rationale: `Given ${item.marketStats.numForSale} active competitive copies and ${item.marketStats.wantCount.toLocaleString()} collectors wanting this title, this price balances immediate discoverability with strong margins.`,
    conditionTips: `Specify matrix runout details and ultrasonic cleaning to justify buyer confidence at this tier.`,
    speedOfSaleEstimate: speed,
  };
}
