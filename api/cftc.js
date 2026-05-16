export default async function handler(req, res) {
  const { dataset, ...query } = req.query;
  if (!dataset) return res.status(400).json({ error: 'Missing dataset' });

  const params = new URLSearchParams();
  Object.entries(query).forEach(([k, v]) => params.append(k, v));

  const url = `https://publicreporting.cftc.gov/resource/${dataset}.json?${params.toString()}`;

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
