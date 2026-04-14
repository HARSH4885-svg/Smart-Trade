/**
 * Mock Analysis Service - Returns randomized financial analysis without API calls
 */

const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

/**
 * Simple hash function for cache keys
 */
const getCacheKey = (prompt) => {
  return `ai_cache_${prompt.substring(0, 100).replace(/[^a-z0-9]/gi, '_')}`;
};

/**
 * Get data from cache
 */
const getFromCache = (key) => {
  try {
    const cached = localStorage.getItem(key);
    if (!cached) return null;
    
    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp > CACHE_TTL) {
      localStorage.removeItem(key);
      return null;
    }
    return data;
  } catch (e) {
    return null;
  }
};

/**
 * Save data to cache
 */
const saveToCache = (key, data) => {
  try {
    localStorage.setItem(key, JSON.stringify({
      data,
      timestamp: Date.now()
    }));
  } catch (e) {
    console.warn("Failed to save to cache:", e);
  }
};

export const getStockPrediction = async (stockData, history) => {
  const cacheKey = getCacheKey(`prediction_${stockData.id}`);
  const cached = getFromCache(cacheKey);
  if (cached) return cached;

  try {
    const response = await fetch('/api/ai/predict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stockData, history })
    });

    if (response.ok) {
      const result = await response.json();
      saveToCache(cacheKey, result);
      return result;
    }
  } catch (error) {
    console.warn("AI Prediction failed, using mock data:", error);
  }

  // Mock Fallback
  const trends = ["upward", "downward", "sideways"];
  const recommendations = ["Strong Buy", "Buy", "Hold", "Sell", "Strong Sell"];
  const riskScores = ["Low", "Medium", "High"];
  
  const trend = trends[Math.floor(Math.random() * trends.length)];
  const currentPrice = stockData.currentPrice;
  
  const predictions = [];
  for (let i = 1; i <= 7; i++) {
    const date = new Date();
    date.setDate(date.getDate() + i);
    const volatility = currentPrice * 0.02;
    const change = trend === "upward" ? Math.random() * volatility : 
                   trend === "downward" ? -Math.random() * volatility : 
                   (Math.random() - 0.5) * volatility;
    
    const lastPrice = i === 1 ? currentPrice : predictions[i-2].price;
    predictions.push({
      date: date.toISOString().split('T')[0],
      price: parseFloat((lastPrice + change).toFixed(2))
    });
  }

  const result = {
    trend,
    confidence: Math.floor(Math.random() * 40) + 60,
    recommendation: recommendations[Math.floor(Math.random() * recommendations.length)],
    riskScore: riskScores[Math.floor(Math.random() * riskScores.length)],
    predictions,
    author: "SmartTrade Engine (Simulated)",
    analysis: `${stockData.name} (${stockData.id}) is showing ${trend} momentum. (Note: AI Service not configured, using simulated analysis).`
  };

  saveToCache(cacheKey, result);
  return result;
};

export const getMarketOutlook = async (stocks) => {
  const cacheKey = "market_outlook_local";
  const cached = getFromCache(cacheKey);
  if (cached) return cached;

  try {
    const response = await fetch('/api/ai/outlook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stocks })
    });

    if (response.ok) {
      const result = await response.json();
      saveToCache(cacheKey, result);
      return result;
    }
  } catch (error) {
    console.warn("AI Outlook failed, using mock data:", error);
  }

  // Mock Fallback
  const sentiments = ["Bullish", "Bearish", "Neutral"];
  const sentiment = sentiments[Math.floor(Math.random() * sentiments.length)];
  
  const result = {
    sentiment,
    summary: `The market is currently in a ${sentiment.toLowerCase()} phase. (Note: AI Service not configured, using simulated analysis).`,
    topSectors: ["Technology", "Energy", "Healthcare"].sort(() => 0.5 - Math.random()).slice(0, 2),
    risks: ["Inflation concerns", "Geopolitical tension"],
    opportunities: ["AI integration", "Green energy"],
    aiScore: Math.floor(Math.random() * 100),
    proTip: "Consider rebalancing your portfolio if volatility persists."
  };

  saveToCache(cacheKey, result);
  return result;
};

export const analyzeNewsSentiment = async (headlines) => {
  try {
    const response = await fetch('/api/ai/sentiment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ headlines })
    });

    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.warn("AI Sentiment failed, using mock data:", error);
  }

  // Mock Fallback
  const results = headlines.map(headline => {
    const score = (Math.random() * 2) - 1;
    const sentiment = score > 0.2 ? "positive" : score < -0.2 ? "negative" : "neutral";
    
    return {
      headline,
      sentiment,
      score: parseFloat(score.toFixed(2)),
      explanation: `Simulated analysis: This headline suggests a ${sentiment} impact.`
    };
  });

  return { results };
};
