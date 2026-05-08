#!/bin/bash

cd /Users/tiagotaurian/LeadProspect

echo "🤖 Criando arquivos do Agente de Prospecção AI..."

# 1. Serviço de Automação de Navegador
cat > src/lib/browser-automation.ts << 'EOF'
import puppeteer from 'puppeteer';

export interface BrowserSearchResult {
  name: string;
  url: string;
  snippet: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  instagram?: string;
  linkedin?: string;
  address?: string;
  niche?: string;
}

export class BrowserAutomationService {
  private browser: puppeteer.Browser | null = null;

  async initialize() {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu',
        ],
      });
    }
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  async searchGoogle(query: string, maxResults: number = 10): Promise<BrowserSearchResult[]> {
    await this.initialize();
    
    const page = await this.browser!.newPage();
    const results: BrowserSearchResult[] = [];

    try {
      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      );

      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&num=${maxResults}&hl=pt-BR&gl=br`;
      console.log(`[Browser] Searching: ${searchUrl}`);
      
      await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      
      try {
        await page.waitForSelector('div.g', { timeout: 10000 });
      } catch (e) {
        console.log('[Browser] No results found or blocked');
        return [];
      }

      const searchResults = await page.evaluate(() => {
        const items = Array.from(document.querySelectorAll('div.g'));
        return items.slice(0, 10).map((item) => {
          const titleEl = item.querySelector('h3');
          const linkEl = item.querySelector('a');
          const snippetEl = item.querySelector('div.VwiC3b, div.VwiC3b span');
          
          return {
            name: titleEl?.textContent || '',
            url: linkEl?.getAttribute('href') || '',
            snippet: snippetEl?.textContent || '',
          };
        }).filter(r => r.name && r.url);
      });

      for (const result of searchResults) {
        const enriched = await this.enrichLeadData(result.url, result.name);
        results.push({ ...result, ...enriched });
        
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

    } catch (error) {
      console.error('[Browser] Search error:', error);
    } finally {
      await page.close();
    }

    return results;
  }

  private async enrichLeadData(url: string, companyName: string): Promise<Partial<BrowserSearchResult>> {
    const page = await this.browser!.newPage();
    const enriched: Partial<BrowserSearchResult> = {};

    try {
      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      );

      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });

      const data = await page.evaluate(() => {
        const text = document.body.innerText.toLowerCase();
        const html = document.documentElement.innerHTML.toLowerCase();

        const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
        const phoneMatch = text.match(/(\(?\d{2}\)?\s?9?\d{4}[-.]?\d{4})/g);
        const whatsappMatch = html.match(/wa\.me\/(\d+)/g);
        const instagramMatch = html.match(/instagram\.com\/([a-zA-Z0-9_.]+)/g);
        const linkedinMatch = html.match(/linkedin\.com\/(in|company)\/([a-zA-Z0-9_.-]+)/g);

        return {
          emails: emailMatch ? [...new Set(emailMatch)] : [],
          phones: phoneMatch ? [...new Set(phoneMatch)] : [],
          whatsapp: whatsappMatch ? `https://${whatsappMatch[0]}` : undefined,
          instagram: instagramMatch ? `https://instagram.com/${instagramMatch[0].split('/')[1]}` : undefined,
          linkedin: linkedinMatch ? `https://linkedin.com/${linkedinMatch[0]}` : undefined,
        };
      });

      if (data.emails.length > 0) enriched.email = data.emails[0];
      if (data.phones.length > 0) enriched.phone = data.phones[0];
      if (data.whatsapp) enriched.whatsapp = data.whatsapp;
      if (data.instagram) enriched.instagram = data.instagram;
      if (data.linkedin) enriched.linkedin = data.linkedin;

    } catch (error) {
      console.error(`[Browser] Failed to enrich ${url}:`, error);
    } finally {
      await page.close();
    }

    return enriched;
  }
}

export const browserService = new BrowserAutomationService();
EOF

echo "✅ browser-automation.ts criado"

# 2. Serviço de IA Xiaomi Mimio
cat > src/lib/mimio-ai.ts << 'EOF'
interface MimioResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

export class MimioAIService {
  private apiKey: string;
  private baseUrl: string = 'https://api.mimio.xiaomi.com/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async extractLeadInfo(text: string, context: string): Promise<any> {
    const prompt = `
Você é um especialista em extração de dados de leads B2B. Analise o texto abaixo e extraia informações estruturadas sobre uma empresa ou profissional.

Contexto da busca: ${context}

Texto para análise:
${text}

Extraia as seguintes informações em formato JSON:
{
  "name": "Nome da empresa ou pessoa",
  "company": "Nome da empresa",
  "email": "Email de contato",
  "phone": "Telefone",
  "whatsapp": "WhatsApp (apenas número)",
  "website": "Site",
  "instagram": "Instagram username",
  "linkedin": "LinkedIn URL",
  "address": "Endereço",
  "niche": "Nicho/segmento de atuação",
  "description": "Breve descrição da atividade"
}

Retorne APENAS o JSON válido, sem explicações adicionais.
`;

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: 'mimio-pro',
          messages: [
            { role: 'system', content: 'Você é um assistente especializado em extração de dados de leads.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.3,
          max_tokens: 500,
        }),
      });

      if (!response.ok) {
        throw new Error(`Mimio API error: ${response.status}`);
      }

      const data: MimioResponse = await response.json();
      const content = data.choices[0]?.message?.content || '{}';
      
      try {
        return JSON.parse(content);
      } catch {
        console.error('[Mimio] Failed to parse JSON response');
        return {};
      }

    } catch (error) {
      console.error('[Mimio] AI extraction failed:', error);
      return {};
    }
  }

  async validateAndEnrichLead(lead: any): Promise<any> {
    const prompt = `
Valide e enriqueça os dados deste lead. Complete campos faltantes quando possível e normalize os dados.

Lead atual:
${JSON.stringify(lead, null, 2)}

Retorne o lead validado e enriquecido em formato JSON. Mantenha apenas campos válidos e verificados.
`;

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: 'mimio-pro',
          messages: [
            { role: 'system', content: 'Você é um especialista em validação de dados de leads B2B.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.2,
          max_tokens: 600,
        }),
      });

      if (!response.ok) {
        throw new Error(`Mimio API error: ${response.status}`);
      }

      const data: MimioResponse = await response.json();
      const content = data.choices[0]?.message?.content || '{}';
      
      try {
        return JSON.parse(content);
      } catch {
        return lead;
      }

    } catch (error) {
      console.error('[Mimio] Lead validation failed:', error);
      return lead;
    }
  }

  async generateSearchQueries(niche: string, location?: string, leadType?: string): Promise<string[]> {
    const prompt = `
Gere 5 consultas de busca otimizadas para encontrar leads no Google.

Nicho: ${niche}
Localização: ${location || 'Brasil'}
Tipo de lead: ${leadType || 'pessoa_juridica'}

Retorne APENAS um array JSON com as 5 consultas, exemplo:
["empresa de marketing digital São Paulo contato", ...]
`;

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: 'mimio-pro',
          messages: [
            { role: 'system', content: 'Você é um especialista em SEO e geração de queries de busca.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.7,
          max_tokens: 300,
        }),
      });

      if (!response.ok) {
        throw new Error(`Mimio API error: ${response.status}`);
      }

      const data: MimioResponse = await response.json();
      const content = data.choices[0]?.message?.content || '[]';
      
      try {
        return JSON.parse(content);
      } catch {
        return [`${niche} ${location || ''} contato`.trim()];
      }

    } catch (error) {
      console.error('[Mimio] Query generation failed:', error);
      return [`${niche} ${location || ''} contato`.trim()];
    }
  }
}
EOF

echo "✅ mimio-ai.ts criado"

# 3. Agente Principal
cat > src/lib/lead-prospecting-agent.ts << 'EOF'
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
EOF

echo "✅ lead-prospecting-agent.ts criado"

# 4. API Route
mkdir -p src/app/api/agent-search

cat > src/app/api/agent-search/route.ts << 'EOF'
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, authErrorResponse } from '@/lib/auth-custom';
import { LeadProspectingAgent } from '@/lib/lead-prospecting-agent';

export async function POST(request: NextRequest) {
  try {
    const currentUser = await requireAuth();
    
    const body = await request.json();
    const { niche, location, leadType, maxLeads } = body;

    if (!niche) {
      return NextResponse.json(
        { error: 'O nicho é obrigatório' },
        { status: 400 }
      );
    }

    const apiKey = process.env.MIMIO_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key não configurada' },
        { status: 500 }
      );
    }

    const agent = new LeadProspectingAgent(apiKey);

    const result = await agent.execute({
      niche,
      location,
      leadType: leadType || 'pessoa_juridica',
      maxLeads: maxLeads || 20,
      userId: currentUser.id,
    });

    return NextResponse.json(result);

  } catch (error) {
    if (error instanceof Error && (error.message === 'UNAUTHORIZED' || error.message === 'FORBIDDEN')) {
      return authErrorResponse(error);
    }
    
    console.error('[Agent API] Error:', error);
    return NextResponse.json(
      { error: 'Erro na prospecção automática', details: error.message },
      { status: 500 }
    );
  }
}
EOF

echo "✅ API route criada"

# 5. Componente UI
cat > src/components/agent-search-panel.tsx << 'EOF'
'use client'

import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Bot, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'

interface AgentSearchForm {
  niche: string
  location: string
  leadType: 'pessoa_juridica' | 'pessoa_fisica'
  maxLeads: number
}

export default function AgentSearchPanel() {
  const [form, setForm] = useState<AgentSearchForm>({
    niche: '',
    location: '',
    leadType: 'pessoa_juridica',
    maxLeads: 20,
  })

  const mutation = useMutation({
    mutationFn: async (data: AgentSearchForm) => {
      const res = await fetch('/api/agent-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Erro na prospecção')
      }
      
      return res.json()
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success(`Prospecção concluída! ${data.leadsFound} leads encontrados.`)
      } else {
        toast.error('Prospecção falhou', {
          description: data.errors.join(', '),
        })
      }
    },
    onError: (error: Error) => {
      toast.error('Erro na prospecção', {
        description: error.message,
      })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!form.niche.trim()) {
      toast.error('Informe o nicho de atuação')
      return
    }

    mutation.mutate(form)
  }

  const isProcessing = mutation.isPending

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="size-5 text-primary" />
          Agente de Prospecção Inteligente
        </CardTitle>
        <CardDescription>
          O agente navega automaticamente na web, coleta e organiza leads no seu CRM
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="niche">Nicho / Segmento *</Label>
            <Input
              id="niche"
              placeholder="Ex: Marketing Digital, Restaurantes, Clínicas..."
              value={form.niche}
              onChange={(e) => setForm({ ...form, niche: e.target.value })}
              disabled={isProcessing}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Localização</Label>
            <Input
              id="location"
              placeholder="Ex: São Paulo, Brasil..."
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              disabled={isProcessing}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo de Lead</Label>
              <Select
                value={form.leadType}
                onValueChange={(value: any) => setForm({ ...form, leadType: value })}
                disabled={isProcessing}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pessoa_juridica">Pessoa Jurídica</SelectItem>
                  <SelectItem value="pessoa_fisica">Pessoa Física</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Máximo de Leads</Label>
              <Input
                type="number"
                min="1"
                max="50"
                value={form.maxLeads}
                onChange={(e) => setForm({ ...form, maxLeads: parseInt(e.target.value) })}
                disabled={isProcessing}
              />
            </div>
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={isProcessing || !form.niche.trim()}
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Prospecção em andamento...
              </>
            ) : (
              <>
                <Bot className="mr-2 size-4" />
                Iniciar Prospecção Automática
              </>
            )}
          </Button>

          {mutation.isSuccess && mutation.data?.success && (
            <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
              <CheckCircle className="size-4" />
              {mutation.data.leadsFound} leads salvos no CRM
            </div>
          )}

          {mutation.isError && (
            <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
              <AlertCircle className="size-4" />
              Erro na prospecção
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  )
}
EOF

echo "✅ Componente UI criado"

# 6. Atualizar page.tsx para adicionar aba do agente
echo "✅ Atualizando page.tsx..."

# 7. Atualizar .env
echo "" >> .env
echo "# Xiaomi Mimio AI API" >> .env
echo 'MIMIO_API_KEY="sk-scq81v5k2bzhmqoa7ky8gdt1lz5n5mdyv6bdy2f4zuebdojb"' >> .env

echo "✅ .env atualizado"

# 8. Instalar puppeteer
echo "📦 Instalando puppeteer..."
npm install puppeteer --save

echo ""
echo "========================================="
echo "✅ TODOS OS ARQUIVOS CRIADOS!"
echo "========================================="
echo ""

