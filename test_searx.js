async function testSearx() {
  const url = "https://searx.be/search?q=dentistas+instagram+whatsapp+sao+paulo&format=json";
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    console.log(`Found ${data.results?.length} results.`);
    console.log(data.results?.[0]);
  } catch (err) {
    console.error(err);
  }
}
testSearx();
