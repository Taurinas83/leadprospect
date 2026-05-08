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
