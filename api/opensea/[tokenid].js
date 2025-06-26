const rateLimit = new Map();

// Smart logging configuration
const logLevel = process.env.NODE_ENV === 'production' ? 'minimal' : 'detailed';

// Initialize global metrics
if (!global.requestMetrics) {
  global.requestMetrics = {
    totalRequests: 0,
    uniqueIPs: new Set(),
    errorCount: 0,
    rateLimitHits: 0,
    invalidRequests: 0,
    lastReset: Date.now()
  };
}

export default async function handler(req, res) {
  const clientIP = req.headers['x-forwarded-for']?.split(',')[0] || req.connection.remoteAddress;
  const { tokenid } = req.query;
  const timestamp = new Date().toISOString();
  const requestStart = Date.now();
  
  // Update metrics
  global.requestMetrics.totalRequests++;
  global.requestMetrics.uniqueIPs.add(clientIP);
  
  // Security events tracking
  const securityEvents = {
    suspiciousIP: false,
    rapidRequests: false,
    invalidTokens: false,
    rateLimitHit: false
  };

  // 1. CORS - Restrict to your domain only
  const allowedOrigins = [
    'https://royalty.h80h.xyz',
    'https://royalty-iota.vercel.app/',
    'https://localhost:3000',
    'http://localhost:3000' // for development
  ];
  
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // 2. Only allow GET requests
  if (req.method !== 'GET') {
    global.requestMetrics.errorCount++;
    
    // SMART LOGGING: Method not allowed
    if (logLevel === 'minimal') {
      console.warn(`⚠️ Invalid method: ${req.method} - ${clientIP} - ${timestamp}`);
    }
    if (logLevel === 'detailed') {
      console.log(`❌ Method ${req.method} not allowed - ${clientIP} - ${timestamp}`);
    }
    
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 3. Rate limiting (simple in-memory)
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxRequests = 10; // 10 requests per minute
  
  if (rateLimit.has(clientIP)) {
    const clientData = rateLimit.get(clientIP);
    if (now - clientData.resetTime < windowMs) {
      if (clientData.count >= maxRequests) {
        global.requestMetrics.rateLimitHits++;
        securityEvents.rateLimitHit = true;
        securityEvents.rapidRequests = true;
        
        // SMART LOGGING: Rate limit exceeded
        if (logLevel === 'minimal') {
          console.warn(`⚠️ Rate limit: ${clientIP} - ${tokenid || 'no-token'} - ${timestamp}`);
        }
        if (logLevel === 'detailed') {
          console.log(`🚫 Rate limit exceeded - ${clientIP} - Requests: ${clientData.count}/${maxRequests} - ${timestamp}`);
        }
        
        return res.status(429).json({ 
          error: 'Too many requests. Please try again later.' 
        });
      }
      clientData.count++;
    } else {
      rateLimit.set(clientIP, { count: 1, resetTime: now });
    }
  } else {
    rateLimit.set(clientIP, { count: 1, resetTime: now });
  }

  // 4. Input validation
  if (!tokenid) {
    global.requestMetrics.errorCount++;
    global.requestMetrics.invalidRequests++;
    securityEvents.invalidTokens = true;
    
    // SMART LOGGING: Missing token ID
    if (logLevel === 'minimal') {
      console.warn(`⚠️ Invalid request: Missing tokenid - ${clientIP} - ${timestamp}`);
    }
    if (logLevel === 'detailed') {
      console.log(`❌ Missing tokenid parameter - ${clientIP} - ${timestamp}`);
    }
    
    return res.status(400).json({ error: 'Token ID is required' });
  }
  
  // Validate tokenid is numeric and reasonable length
  if (!/^\d+$/.test(tokenid) || tokenid.length > 10) {
    global.requestMetrics.errorCount++;
    global.requestMetrics.invalidRequests++;
    securityEvents.invalidTokens = true;
    
    // SMART LOGGING: Invalid token format
    if (logLevel === 'minimal') {
      console.warn(`⚠️ Invalid request: Bad tokenid format - ${clientIP} - ${tokenid} - ${timestamp}`);
    }
    if (logLevel === 'detailed') {
      console.log(`❌ Invalid tokenid format: ${tokenid} - ${clientIP} - ${timestamp}`);
    }
    
    return res.status(400).json({ error: 'Invalid token ID format' });
  }

  // DETAILED LOGGING: Log successful requests
  if (logLevel === 'detailed') {
    console.log(`📝 Request: ${clientIP} - ${tokenid} - ${timestamp}`);
    console.log(`📊 User-Agent: ${req.headers['user-agent']}`);
    console.log(`🌐 Origin: ${req.headers.origin}`);
  }

  // 5. Add request timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

  const url = `https://api.opensea.io/api/v2/chain/base/contract/0xEe7D1B184be8185Adc7052635329152a4d0cdEfA/nfts/${tokenid}`;

  const options = {
    method: 'GET',
    headers: {
      'accept': 'application/json', 
      'x-api-key': process.env.OPENSEA_API_KEY,
      'User-Agent': 'royalty/1.0' // Identify your app
    },
    signal: controller.signal
  };

  try {
    const response = await fetch(url, options);
    clearTimeout(timeoutId);
    const responseTime = Date.now() - requestStart;
    
    if (!response.ok) {
      throw new Error(`OpenSea API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // SMART LOGGING: Successful API response
    if (logLevel === 'detailed') {
      console.log(`✅ API Success: ${tokenid} - ${responseTime}ms - ${clientIP} - ${timestamp}`);
    }
    
    // 6. Sanitize response data
    const sanitizedData = {
      nft: {
        name: data.nft?.name || 'Unknown',
        description: data.nft?.description || '',
        image_url: data.nft?.image_url || '',
        traits: data.nft?.traits || [],
        metadata: {
          attributes: data.nft?.metadata?.attributes || []
        }
      }
    };
    
    res.status(200).json(sanitizedData);
    
  } catch (error) {
    clearTimeout(timeoutId);
    global.requestMetrics.errorCount++;
    const responseTime = Date.now() - requestStart;
    
    // SMART LOGGING: API Errors
    if (logLevel === 'minimal') {
      console.error(`❌ API Error: ${clientIP} - ${tokenid} - ${error.message} - ${timestamp}`);
    }
    if (logLevel === 'detailed') {
      console.error(`❌ API Error Details: ${tokenid} - ${error.message} - ${responseTime}ms - ${clientIP} - ${timestamp}`);
      console.error(`🔍 Error Stack: ${error.stack}`);
    }
    
    // Don't expose internal errors
    if (error.name === 'AbortError') {
      res.status(408).json({ error: 'Request timeout' });
    } else {
      res.status(500).json({ error: 'Failed to fetch NFT data' });
    }
  }

  // SECURITY-FOCUSED LOGGING: Only log security events
  if (securityEvents.suspiciousIP || securityEvents.rapidRequests || securityEvents.invalidTokens || securityEvents.rateLimitHit) {
    console.warn(`🚨 Security Event: ${JSON.stringify(securityEvents)} - ${clientIP} - ${tokenid || 'no-token'} - ${timestamp}`);
  }

  // AGGREGATED METRICS: Log summary every 100 requests (low storage, high value)
  if (global.requestMetrics.totalRequests % 100 === 0) {
    console.log(`📊 Metrics Summary:`);
    console.log(`   Total Requests: ${global.requestMetrics.totalRequests}`);
    console.log(`   Unique IPs: ${global.requestMetrics.uniqueIPs.size}`);
    console.log(`   Errors: ${global.requestMetrics.errorCount}`);
    console.log(`   Rate Limit Hits: ${global.requestMetrics.rateLimitHits}`);
    console.log(`   Invalid Requests: ${global.requestMetrics.invalidRequests}`);
    console.log(`   Timestamp: ${timestamp}`);
  }

  // Reset metrics daily to prevent memory buildup
  const resetInterval = 24 * 60 * 60 * 1000; // 24 hours
  if (Date.now() - global.requestMetrics.lastReset > resetInterval) {
    console.log(`🔄 Daily metrics reset - Previous: ${global.requestMetrics.totalRequests} requests, ${global.requestMetrics.uniqueIPs.size} unique IPs`);
    global.requestMetrics = {
      totalRequests: 0,
      uniqueIPs: new Set(),
      errorCount: 0,
      rateLimitHits: 0,
      invalidRequests: 0,
      lastReset: Date.now()
    };
  }
};