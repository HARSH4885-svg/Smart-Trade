import express from "express";
import dotenv from "dotenv";
import { stocks as mockStocks } from "../src/data/stocks.js";

dotenv.config();

const app = express();

// Simple in-memory cache for stock quotes
const quoteCache = new Map<string, { data: any, timestamp: number }>();
const CACHE_TTL = 60 * 1000; // 1 minute cache

let isApiKeyInvalid = false;

const isPlaceholder = (key: string | undefined) => {
  if (!key) return true;
  const k = key.toLowerCase();
  return k === "" || k.includes("your_api_key") || k.includes("placeholder");
};

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("💥 Express Error:", err);
  res.status(500).json({ error: "Internal Server Error", details: err.message });
});

// API routes
app.get("/api/status", (req, res) => {
  const apiKey = process.env.FINNHUB_API_KEY;
  res.json({
    apiKeyConfigured: !!(apiKey && apiKey.trim() !== "" && !apiKey.includes("YOUR_API_KEY") && !isApiKeyInvalid),
    environment: process.env.NODE_ENV || 'development',
    isApiKeyInvalid
  });
});

app.get("/api/stocks/:symbol", async (req, res) => {
  const { symbol } = req.params;
  const upperSymbol = symbol.toUpperCase();
  const rawApiKey = process.env.FINNHUB_API_KEY;
  
  // Simulation Mode Fallback
  if (isApiKeyInvalid || !rawApiKey || isPlaceholder(rawApiKey)) {
    const mockStock = mockStocks.find(s => s.id === upperSymbol);
    if (mockStock) {
      const volatility = 0.001;
      const change = mockStock.currentPrice * (Math.random() * volatility * 2 - volatility);
      return res.json({
        symbol: upperSymbol,
        currentPrice: mockStock.currentPrice + change,
        change: mockStock.change + change,
        changePercent: mockStock.changePercent,
        high: mockStock.high,
        low: mockStock.low,
        open: mockStock.open,
        previousClose: mockStock.previousClose,
        timestamp: Date.now(),
        isSimulated: true
      });
    }
    return res.status(404).json({ error: "Stock not found in simulation" });
  }

  const apiKey = rawApiKey.trim();

  // Check cache
  const cached = quoteCache.get(upperSymbol);
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
    return res.json(cached.data);
  }

  try {
    const url = `https://finnhub.io/api/v1/quote?symbol=${upperSymbol}`;
    const response = await fetch(url, {
      headers: { 'X-Finnhub-Token': apiKey }
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        isApiKeyInvalid = true;
        const mockStock = mockStocks.find(s => s.id === upperSymbol);
        if (mockStock) return res.json({ ...mockStock, isSimulated: true, timestamp: Date.now() });
      }
      if (response.status === 429) return res.status(429).json({ error: "Rate limit exceeded" });
      
      const mockStock = mockStocks.find(s => s.id === upperSymbol);
      if (mockStock) return res.json({ ...mockStock, isSimulated: true, timestamp: Date.now() });
      return res.status(response.status).json({ error: `API error: ${response.status}` });
    }

    const data = await response.json();
    if (!data || data.c === 0 || data.c === null) {
      const mockStock = mockStocks.find(s => s.id === upperSymbol);
      if (mockStock) return res.json({ ...mockStock, isSimulated: true, timestamp: Date.now() });
      return res.status(404).json({ error: "No data returned" });
    }

    const result = {
      symbol: upperSymbol,
      currentPrice: data.c,
      change: data.d,
      changePercent: data.dp,
      high: data.h,
      low: data.l,
      open: data.o,
      previousClose: data.pc,
      timestamp: Date.now()
    };

    quoteCache.set(upperSymbol, { data: result, timestamp: Date.now() });
    res.json(result);
  } catch (error) {
    const mockStock = mockStocks.find(s => s.id === upperSymbol);
    if (mockStock) return res.json({ ...mockStock, isSimulated: true, timestamp: Date.now() });
    res.status(500).json({ error: "Failed to fetch stock data" });
  }
});

app.get("/api/stocks/:symbol/news", async (req, res) => {
  const { symbol } = req.params;
  const apiKey = process.env.FINNHUB_API_KEY;

  if (isApiKeyInvalid || !apiKey || isPlaceholder(apiKey)) return res.json([]);

  try {
    const to = new Date().toISOString().split('T')[0];
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - 30);
    const from = fromDate.toISOString().split('T')[0];

    const response = await fetch(
      `https://finnhub.io/api/v1/company-news?symbol=${symbol}&from=${from}&to=${to}&token=${apiKey}`
    );

    if (response.status === 401) {
      isApiKeyInvalid = true;
      return res.status(401).json({ error: "Invalid API Key" });
    }

    const data = await response.json();
    if (Array.isArray(data)) {
      const news = data.slice(0, 10).map((item: any) => ({
        id: item.id,
        headline: item.headline,
        summary: item.summary,
        source: item.source,
        url: item.url,
        timestamp: item.datetime * 1000,
        sentiment: 'neutral'
      }));
      res.json(news);
    } else {
      res.json([]);
    }
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch news" });
  }
});

app.get("/api/stocks/:symbol/history", async (req, res) => {
  const { symbol } = req.params;
  const { resolution = 'D' } = req.query;
  const rawApiKey = process.env.FINNHUB_API_KEY;

  if (isApiKeyInvalid || !rawApiKey || isPlaceholder(rawApiKey)) return res.json([]);
  const apiKey = rawApiKey.trim();

  try {
    const to = Math.floor(Date.now() / 1000);
    let from;
    if (resolution === '1' || resolution === '5') from = to - (2 * 24 * 60 * 60);
    else if (resolution === '15' || resolution === '30') from = to - (7 * 24 * 60 * 60);
    else if (resolution === '60') from = to - (30 * 24 * 60 * 60);
    else from = to - (30 * 24 * 60 * 60);

    const url = `https://finnhub.io/api/v1/stock/candle?symbol=${symbol.toUpperCase()}&resolution=${resolution}&from=${from}&to=${to}&token=${apiKey}`;
    const response = await fetch(url);
    
    if (response.status === 403) {
      const shortFrom = to - (7 * 24 * 60 * 60);
      const retryUrl = `https://finnhub.io/api/v1/stock/candle?symbol=${symbol.toUpperCase()}&resolution=D&from=${shortFrom}&to=${to}&token=${apiKey}`;
      const retryResponse = await fetch(retryUrl);
      if (retryResponse.ok) {
        const retryData = await retryResponse.json();
        if (retryData.s === 'ok') {
          return res.json(retryData.t.map((time: number, i: number) => ({
            date: new Date(time * 1000).toISOString(),
            open: retryData.o[i],
            high: retryData.h[i],
            low: retryData.l[i],
            close: retryData.c[i],
            volume: retryData.v[i]
          })));
        }
      }
      return res.json({ error: "limited", message: "Historical data restricted" });
    }

    if (!response.ok) {
      if (response.status === 401) isApiKeyInvalid = true;
      return res.status(response.status).json({ error: `API error: ${response.status}` });
    }

    const data = await response.json();
    if (data.s === 'ok') {
      const history = data.t.map((time: number, i: number) => ({
        date: new Date(time * 1000).toISOString(),
        open: data.o[i],
        high: data.h[i],
        low: data.l[i],
        close: data.c[i],
        volume: data.v[i]
      }));
      res.json(history);
    } else {
      res.status(404).json({ error: "No data found", status: data.s });
    }
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch history" });
  }
});

export default app;
