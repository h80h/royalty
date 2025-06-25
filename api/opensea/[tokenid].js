export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { tokenid } = req.query;
  
  const url = `https://api.opensea.io/api/v2/chain/base/contract/0xEe7D1B184be8185Adc7052635329152a4d0cdEfA/nfts/${tokenid}`;

  const options = {
    method: 'GET',
    headers: {
      'accept': 'application/json', 
      'x-api-key': process.env.OPENSEA_API_KEY
    }
  };

  try {
    const response = await fetch(url, options);
    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ Error: error.message });
  }
}