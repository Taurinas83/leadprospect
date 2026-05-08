import { browserService, BrowserSearchResult } from './browser-automation';
import { MimioAIService } from './mimio-ai';
import { db } from '@/lib/db';

export interface LeadSearchRequest {
  niche: string;
  location?: string;
  leadType?: 'pessoa_juridica' | 'pessoa_fisica';
  maxLeads?: number;
  userId: string;
}

export interface LeadSearchResult {
  success: boolean;
  leadsFound: number;
  leads: any[];
  errors: string[];
}

export class LeadProspectingAgent {
  private mimioAI: MimioAIService;

  constructor(apiKey: string) {
    this.mimioAI = new MimioAIService(apiKey);
  }

  async execute(request: LeadSearchRequest): Promise<LeadSearchResult> {
    const result: LeadSearchResult = {
      success: false,
      leadsFound: 0,
      leads: [],
      errors: [],
    };

    try {
      console.log(`[Agent] Starting prospecting for niche: ${request.niche}`);

      const queries = await this.mimioAI.generateSearchQueries(
        request.niche,
        request.location,
        request.leadType
      );

      console.log(`[Agent] Generated ${queries.length} search queries`);

      const allResults: BrowserSearchResult[] = [];

      for (const query of queries) {
        try {
          const results = await browserService.searchGoogle(query, 5);
          allResults.push(...results);
          
          await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (error) {
          console.error(`[Agent] Query failed: ${query}`, error);
          result.errors.push(`Failed query: ${query}`);
        }
      }

      console.log(`[Agent] Found ${allResults.length} raw results`);

      const uniqueLeads = this.deduplicateResults(allResults);
      console.log(`[Agent] ${uniqueLeads.length} unique leads after deduplication`);

      const processedLeads = [];
      let savedCount = 0;

      for (const leadData of uniqueLeads.slice(0, request.maxLeads || 20)) {
        try {
          const enrichedLead = await this.mimioAI.extractLeadInfo(
            JSON.stringify(leadData),
            `${request.niche} ${request.location || ''}`
          );

          const validatedLead = await this.mimioAI.validateAndEnrichLead({
            ...leadData,
            ...enrichedLead,
          });

          const savedLead = await this.saveLeadToCRM(validatedLead, request);
          
          if (savedLead) {
            processedLeads.push(savedLead);
            savedCount++;
          }

          await new Promise(resolve => setTimeout(resolve, 1000));

        } catch (error) {
          console.error('[Agent] Failed to process lead:', error);
          result.errors.push(`Failed to process: ${leadData.name}`);
        }
      }

      await this.saveSearchHistory(request, savedCount);

      result.success = true;
      result.leadsFound = savedCount;
      result.leads = processedLeads;

      console.log(`[Agent] Completed: ${savedCount} leads saved`);

    } catch (error) {
      console.error('[Agent] Critical error:', error);
      result.errors.push(`Critical error: ${error.message}`);
    } finally {
      await browserService.close();
    }

    return result;
  }

  private deduplicateResults(results: BrowserSearchResult[]): BrowserSearchResult[] {
    const seen = new Set<string>();
    const unique: BrowserSearchResult[] = [];

    for (const result of results) {
      const key = (result.url || result.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      
      if (!seen.has(key) && result.name) {
        seen.add(key);
        unique.push(result);
      }
    }

    return unique;
  }

  private async saveLeadToCRM(leadData: any, request: LeadSearchRequest) {
    try {
      if (!leadData.name && !leadData.company) {
        return null;
      }

      const existingLead = await db.lead.findFirst({
        where: {
          OR: [
            { email: leadData.email },
            { phone: leadData.phone },
            { website: leadData.website },
          ],
        },
      });

      if (existingLead) {
        console.log(`[Agent] Lead already exists: ${leadData.name}`);
        return existingLead;
      }

      const score = this.calculateLeadScore(leadData);

      const newLead = await db.lead.create({
        data: {
          name: leadData.name || leadData.company || 'Desconhecido',
          company: leadData.company || leadData.name || '',
          email: leadData.email || null,
          phone: leadData.phone || null,
          whatsapp: leadData.whatsapp || null,
          website: leadData.website || leadData.url || null,
          instagram: leadData.instagram || null,
          linkedin: leadData.linkedin || null,
          address: leadData.address || null,
          niche: request.niche.toLowerCase(),
          leadType: request.leadType || 'pessoa_juridica',
          status: 'novo',
          source: 'ai_agent',
          score: score,
          notes: leadData.description || null,
          userId: request.userId,
        },
      });

      console.log(`[Agent] Saved lead: ${newLead.name}`);
      return newLead;

    } catch (error) {
      console.error('[Agent] Failed to save lead:', error);
      return null;
    }
  }

  private calculateLeadScore(lead: any): number {
    let score = 0;

    if (lead.email) score += 20;
    if (lead.phone || lead.whatsapp) score += 20;
    if (lead.website) score += 15;
    if (lead.linkedin) score += 15;
    if (lead.instagram) score += 10;
    if (lead.address) score += 10;
    if (lead.description) score += 10;

    return Math.min(score, 100);
  }

  private async saveSearchHistory(request: LeadSearchRequest, resultsCount: number) {
    try {
      await db.searchHistory.create({
        data: {
          query: `${request.niche} ${request.location || ''}`,
          niche: request.niche,
          location: request.location || null,
          leadType: request.leadType || 'pessoa_juridica',
          results: resultsCount,
        },
      });
    } catch (error) {
      console.error('[Agent] Failed to save search history:', error);
    }
  }
}
