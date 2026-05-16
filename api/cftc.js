export default async function handler(req, res) {
  const { dataset, ...query } = req.query;
  
  const params = new URLSearchParams(query).toString();
  const url = `https://publicreporting.cftc.gov/resource/${dataset}.json${params ? '?' + params : ''}`;
  
  try {
    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' }
    });
    
    if (!response.ok) throw new Error(`CFTC error: ${response.status}`);
    
    const data = await response.json();
    
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 's-maxage=3600');
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
