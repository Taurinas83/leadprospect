async function searchDDG(query) {
  const params = new URLSearchParams({ q: query });
  const response = await fetch(`https://html.duckduckgo.com/html/?${params}`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
  });
  const html = await response.text();
  
  // parse html using simple regex
  // The results have class "result__body"
  const results = [];
  const regex = /<a class="result__url" href="([^"]+)".*?>(.*?)<\/a>.*?<a class="result__snippet[^>]*>(.*?)<\/a>/gs;
  let match;
  while ((match = regex.exec(html)) !== null) {
    // clean up html tags
    const url = match[1].replace(/&amp;/g, '&');
    // DDG sometimes uses redirect urls like //duckduckgo.com/l/?uddg=...
    let finalUrl = url;
    if (url.includes('uddg=')) {
      const urlMatch = url.match(/uddg=([^&]+)/);
      if (urlMatch) {
        finalUrl = decodeURIComponent(urlMatch[1]);
      }
    }
    
    const title = match[2].replace(/<[^>]+>/g, '').trim();
    const snippet = match[3].replace(/<[^>]+>/g, '').trim();
    results.push({ name: title, url: finalUrl, snippet });
  }
  return results;
}

searchDDG("dentistas instagram whatsapp em sao paulo").then(console.log).catch(console.error);
