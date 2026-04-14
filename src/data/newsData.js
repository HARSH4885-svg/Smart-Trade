import { stocks } from './stocks';

const sentiments = ['positive', 'negative', 'neutral'];
const headlines = {
  positive: [
    "reports record-breaking quarterly earnings",
    "announces strategic partnership with industry leader",
    "unveils revolutionary new product line",
    "receives analyst upgrade following strong performance",
    "expands operations into emerging markets"
  ],
  negative: [
    "faces regulatory scrutiny over data privacy",
    "reports lower than expected revenue for Q3",
    "announces workforce reduction to cut costs",
    "hit by supply chain disruptions in key regions",
    "shares dip following cautious outlook from CEO"
  ],
  neutral: [
    "to participate in upcoming investor conference",
    "announces routine board of directors meeting",
    "maintains steady growth in core business segments",
    "updates guidance for fiscal year 2024",
    "continues focus on long-term sustainability goals"
  ]
};

const generateNews = (stock) => {
  const news = [];
  for (let i = 0; i < 5; i++) {
    const sentiment = sentiments[Math.floor(Math.random() * sentiments.length)];
    const headlineBase = headlines[sentiment][Math.floor(Math.random() * headlines[sentiment].length)];
    const sentimentScore = sentiment === 'positive' ? 0.4 + Math.random() * 0.6 : 
                           sentiment === 'negative' ? -0.4 - Math.random() * 0.6 : 
                           -0.3 + Math.random() * 0.6;

    news.push({
      id: `${stock.id}-news-${i}`,
      headline: `${stock.name} ${headlineBase}`,
      source: ["Reuters", "Bloomberg", "CNBC", "MarketWatch", "Wall Street Journal"][Math.floor(Math.random() * 5)],
      timestamp: new Date(Date.now() - Math.random() * 1000000000).toISOString(),
      sentiment,
      sentimentScore: parseFloat(sentimentScore.toFixed(2))
    });
  }
  return news;
};

export const newsData = stocks.reduce((acc, stock) => {
  acc[stock.id] = generateNews(stock);
  return acc;
}, {});
