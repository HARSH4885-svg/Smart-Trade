import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { stocks as mockStocks } from "./src/data/stocks.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Simple in-memory cache for stock quotes
const quoteCache = new Map<string, { data: any, timestamp: number }>();
const CACHE_TTL = 60 * 1000; // 1 minute cache

let isApiKeyInvalid = false;

async function startServer() {
  const app = express();
  const PORT = 3000;

  const rawApiKey = process.env.FINNHUB_API_KEY;
  const isPlaceholder = (key: string | undefined) => {
    if (!key) return true;
    const k = key.toLowerCase();
    return k === "" || k.includes("your_api_key") || k.includes("placeholder");
  };

  if (rawApiKey && !isPlaceholder(rawApiKey)) {
    console.log("📡 Finnhub API Key detected. Real-time data enabled.");
  } else {
    console.log("🎮 No Finnhub API Key detected. Running in Simulation Mode.");
    isApiKeyInvalid = true;
  }

  // Check if fetch is available
  if (typeof fetch === 'undefined') {
    console.error("❌ global fetch is not defined. This environment may be running an older version of Node.js.");
  } else {
    console.log("✅ global fetch is available.");
  }

  // Global error handler for the app
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("💥 Unhandled Express Error:", err);
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
    
    console.log(`🔍 Request for ${upperSymbol}`);

    // Simulation Mode Fallback
    if (isApiKeyInvalid || !rawApiKey || isPlaceholder(rawApiKey)) {
      const mockStock = mockStocks.find(s => s.id === upperSymbol);
      if (mockStock) {
        // Add some random movement to mock data
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

    // Check cache first
    const cached = quoteCache.get(upperSymbol);
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
      return res.json(cached.data);
    }

    try {
      const url = `https://finnhub.io/api/v1/quote?symbol=${upperSymbol}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

      const response = await fetch(url, {
        headers: {
          'X-Finnhub-Token': apiKey
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorText = await response.text();
        
        if (response.status === 401) {
          if (!isApiKeyInvalid) {
            console.log("ℹ️ Finnhub API Key is invalid. Switching to Simulation Mode.");
            isApiKeyInvalid = true;
          }
          // Return mock data instead of 401 to keep app functional
          const mockStock = mockStocks.find(s => s.id === upperSymbol);
          if (mockStock) {
            return res.json({
              ...mockStock,
              isSimulated: true,
              timestamp: Date.now()
            });
          }
          return res.status(401).json({ 
            error: "Invalid API Key",
            message: "The FINNHUB_API_KEY is invalid."
          });
        }

        if (!isApiKeyInvalid) {
          console.error(`❌ Finnhub API error (${response.status}) for ${symbol}:`, errorText);
        }
        
        if (response.status === 429) {
          return res.status(429).json({ error: "Rate limit exceeded. Please try again in a minute." });
        }
        
        // Fallback to mock data on other API errors
        const mockStock = mockStocks.find(s => s.id === upperSymbol);
        if (mockStock) {
          return res.json({
            ...mockStock,
            isSimulated: true,
            timestamp: Date.now()
          });
        }

        return res.status(response.status).json({ error: `Finnhub API error: ${response.status}` });
      }

      const data = await response.json();
      
      if (!data || data.c === 0 || data.c === null) {
        // Fallback to mock data if no data returned
        const mockStock = mockStocks.find(s => s.id === upperSymbol);
        if (mockStock) {
          return res.json({
            ...mockStock,
            isSimulated: true,
            timestamp: Date.now()
          });
        }
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

      // Update cache
      quoteCache.set(upperSymbol, { data: result, timestamp: Date.now() });

      res.json(result);
    } catch (error) {
      if (!isApiKeyInvalid) {
        console.error(`❌ Fetch error for ${symbol}:`, error);
      }
      
      // Fallback to mock data on network error
      const mockStock = mockStocks.find(s => s.id === upperSymbol);
      if (mockStock) {
        return res.json({
          ...mockStock,
          isSimulated: true,
          timestamp: Date.now()
        });
      }
      
      res.status(500).json({ error: "Failed to fetch stock data" });
    }
  });

  app.get("/api/stocks/:symbol/news", async (req, res) => {
    const { symbol } = req.params;
    const apiKey = process.env.FINNHUB_API_KEY;

    if (isApiKeyInvalid || !apiKey || isPlaceholder(apiKey)) {
      return res.json([]);
    }

    try {
      // Fetch news for the last 30 days
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
        // Map to our app's news format
        const news = data.slice(0, 10).map((item: any) => ({
          id: item.id,
          headline: item.headline,
          summary: item.summary,
          source: item.source,
          url: item.url,
          timestamp: item.datetime * 1000, // Convert to ms
          sentiment: 'neutral' // Finnhub free tier doesn't provide sentiment easily
        }));
        res.json(news);
      } else {
        res.json([]);
      }
    } catch (error) {
      console.error(`Error fetching news for ${symbol}:`, error);
      res.status(500).json({ error: "Failed to fetch news" });
    }
  });

  app.get("/api/stocks/:symbol/history", async (req, res) => {
    const { symbol } = req.params;
    const { resolution = 'D' } = req.query;
    const rawApiKey = process.env.FINNHUB_API_KEY;

    if (isApiKeyInvalid || !rawApiKey || isPlaceholder(rawApiKey)) {
      // Return empty history or mock history if needed
      return res.json([]);
    }
    const apiKey = rawApiKey.trim();

    try {
      const to = Math.floor(Date.now() / 1000);
      let from;
      
      // Adjust 'from' based on resolution to stay within free tier limits and avoid massive payloads
      if (resolution === '1' || resolution === '5') {
        from = to - (2 * 24 * 60 * 60); // 2 days for high res
      } else if (resolution === '15' || resolution === '30') {
        from = to - (7 * 24 * 60 * 60); // 1 week
      } else if (resolution === '60') {
        from = to - (30 * 24 * 60 * 60); // 1 month
      } else {
        from = to - (30 * 24 * 60 * 60); // 1 month for D, W, M (most compatible for free tier)
      }

      const url = `https://finnhub.io/api/v1/stock/candle?symbol=${symbol.toUpperCase()}&resolution=${resolution}&from=${from}&to=${to}&token=${apiKey}`;
      
      const response = await fetch(url);
      
      if (response.status === 403) {
        const errorText = await response.text();
        // Silent fallback for known plan restrictions - no need to clutter logs with warnings for expected behavior
        
        // If 403 happens, try one more time with a very short range (7 days) and 'D' resolution
        // This is the most likely to work on free tier
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

        return res.json({ 
          error: "limited", 
          message: "Historical data restricted on this API plan",
          details: errorText
        });
      }

      if (response.status === 429) {
        return res.status(429).json({ error: "Rate limit exceeded" });
      }

      if (!response.ok) {
        const errorText = await response.text();
        
        if (response.status === 401) {
          if (!isApiKeyInvalid) {
            console.warn(`⚠️ Finnhub History: Invalid API Key for ${symbol}. Switching to simulation mode.`);
            isApiKeyInvalid = true;
          }
          return res.status(401).json({ 
            error: "Invalid API Key",
            message: "The FINNHUB_API_KEY is invalid or missing."
          });
        }

        if (!isApiKeyInvalid) {
          console.error(`❌ Finnhub History error (${response.status}) for ${symbol}:`, errorText);
        }
        return res.status(response.status).json({ error: `Finnhub API error: ${response.status}`, details: errorText });
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
      } else if (data.s === 'no_data') {
        res.status(404).json({ error: "No historical data found for this period", status: data.s });
      } else {
        res.status(500).json({ error: "Finnhub returned an error", status: data.s, msg: data.msg });
      }
    } catch (error) {
      console.error(`Error fetching history for ${symbol}:`, error);
      res.status(500).json({ error: "Failed to fetch history" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error("💥 Failed to start server:", err);
  process.exit(1);
});
