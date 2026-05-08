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
