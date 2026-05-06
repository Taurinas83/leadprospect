async function searchDDGLite(query) {
  const body = new URLSearchParams({ q: query, kl: 'br-pt' });
  const response = await fetch('https://lite.duckduckgo.com/lite/', {
    method: 'POST',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
    },
    body: body.toString()
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch from DDG Lite');
  }
  
  const html = await response.text();
  
  const results = [];
  // <a rel="nofollow" href="LINK">TITLE</a> ... <td class='result-snippet'>SNIPPET</td>
  const regex = /<a[^>]+class="result-url"[^>]+href="([^"]+)"[^>]*>(.*?)<\/a>.*?<td class='result-snippet'[^>]*>(.*?)<\/td>/gs;
  
  let match;
  while ((match = regex.exec(html)) !== null) {
    let url = match[1].replace(/&amp;/g, '&');
    if (url.startsWith('//')) {
      url = 'https:' + url;
    }
    const title = match[2].replace(/<[^>]+>/g, '').trim();
    const snippet = match[3].replace(/<[^>]+>/g, '').trim();
    results.push({ name: title, url, snippet });
  }
  return results;
}

searchDDGLite("dentistas instagram whatsapp em sao paulo").then(console.log).catch(console.error);
