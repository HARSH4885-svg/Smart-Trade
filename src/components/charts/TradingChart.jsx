import React, { useEffect, useRef } from 'react';
import { createChart, ColorType, CandlestickSeries, HistogramSeries, AreaSeries, LineSeries } from 'lightweight-charts';

const TradingChart = ({ data, type = 'candlestick', colors = {}, crosshairMode = 1 }) => {
  const {
    backgroundColor = 'transparent',
    lineColor = '#3B82F6',
    textColor = '#9CA3AF',
    areaTopColor = 'rgba(59, 130, 246, 0.4)',
    areaBottomColor = 'rgba(59, 130, 246, 0)',
  } = colors;

  const chartContainerRef = useRef();
  const chartRef = useRef();
  const seriesRef = useRef();
  const volumeSeriesRef = useRef();
  const smaSeriesRef = useRef();
  const predictionSeriesRef = useRef();

  useEffect(() => {
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: backgroundColor },
        textColor,
        fontSize: 12,
        fontFamily: 'Inter, sans-serif',
      },
      grid: {
        vertLines: { color: 'rgba(31, 41, 55, 0.2)' },
        horzLines: { color: 'rgba(31, 41, 55, 0.2)' },
      },
      crosshair: {
        mode: crosshairMode,
        vertLine: { width: 1, color: '#3B82F6', style: 3, labelBackgroundColor: '#3B82F6' },
        horzLine: { width: 1, color: '#3B82F6', style: 3, labelBackgroundColor: '#3B82F6' },
      },
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
      timeScale: {
        borderColor: 'rgba(255, 255, 255, 0.1)',
        timeVisible: true,
        secondsVisible: true,
      },
    });

    chartRef.current = chart;

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ 
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight
        });
      }
    };
    window.addEventListener('resize', handleResize);

    const resizeObserver = new ResizeObserver(handleResize);
    if (chartContainerRef.current) {
      resizeObserver.observe(chartContainerRef.current);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
      chart.remove();
    };
  }, [backgroundColor, textColor, crosshairMode]); // Only re-create if these core layout options change

  useEffect(() => {
    if (!chartRef.current) return;

    const chart = chartRef.current;
    
    // Update markers if provided
    if (seriesRef.current && colors.markers && typeof seriesRef.current.setMarkers === 'function') {
      const uniqueMarkers = colors.markers
        .filter((m, i, arr) => arr.findIndex(t => t.time === m.time) === i)
        .sort((a, b) => a.time - b.time);
      seriesRef.current.setMarkers(uniqueMarkers);
    }
  }, [colors.markers]);

  useEffect(() => {
    if (!chartRef.current) return;

    const chart = chartRef.current;
    const toTimestamp = (item) => {
      if (!item) return null;
      if (typeof item.time === 'number') return item.time;
      if (!item.date) return null;
      const ts = Math.floor(new Date(item.date).getTime() / 1000);
      return isNaN(ts) ? null : ts;
    };

    // Clear existing series
    [seriesRef, volumeSeriesRef, smaSeriesRef, predictionSeriesRef].forEach(ref => {
      if (ref.current) {
        try {
          chart.removeSeries(ref.current);
        } catch (e) {
          console.warn('Error removing series:', e);
        }
        ref.current = null;
      }
    });

    const uniqueData = (dataArray) => {
      const seen = new Set();
      return dataArray
        .map(item => {
          if (!item) return null;
          const time = toTimestamp(item);
          if (time === null) return null;
          return { ...item, time };
        })
        .filter(item => {
          if (!item || seen.has(item.time)) return false;
          seen.add(item.time);
          return true;
        })
        .sort((a, b) => a.time - b.time);
    };

    if (type === 'candlestick') {
      const mainSeries = chart.addSeries(CandlestickSeries, {
        upColor: '#00ff9d',
        downColor: '#ff3e3e',
        borderVisible: false,
        wickUpColor: '#00ff9d',
        wickDownColor: '#ff3e3e',
      });
      seriesRef.current = mainSeries;

      const volumeSeries = chart.addSeries(HistogramSeries, {
        color: 'rgba(255, 255, 255, 0.1)',
        priceFormat: { type: 'volume' },
        priceScaleId: '',
      });
      volumeSeriesRef.current = volumeSeries;

      volumeSeries.priceScale().applyOptions({
        scaleMargins: { top: 0.8, bottom: 0 },
      });

      const processedData = uniqueData(data);

      const formattedData = processedData.map(item => ({
        time: item.time,
        open: Number(item.open ?? 0),
        high: Number(item.high ?? 0),
        low: Number(item.low ?? 0),
        close: Number(item.close ?? 0),
      }));

      const volumeData = processedData.map(item => ({
        time: item.time,
        value: Number(item.volume || 0),
        color: (item.close ?? 0) >= (item.open ?? 0) ? 'rgba(0, 255, 157, 0.2)' : 'rgba(255, 62, 62, 0.2)',
      }));

      if (formattedData.length > 0) {
        mainSeries.setData(formattedData);
      }
      if (volumeData.length > 0) {
        volumeSeries.setData(volumeData);
      }

      // Initial markers
      if (colors.markers && mainSeries && typeof mainSeries.setMarkers === 'function') {
        const uniqueMarkers = colors.markers
          .filter((m, i, arr) => arr.findIndex(t => t.time === m.time) === i)
          .sort((a, b) => a.time - b.time);
        mainSeries.setMarkers(uniqueMarkers);
      }

      // SMA
      if (colors.showSMA) {
        const smaData = formattedData.map((d, i, arr) => {
          if (i < 19) return null;
          const sum = arr.slice(i - 19, i + 1).reduce((acc, val) => acc + val.close, 0);
          return { time: d.time, value: sum / 20 };
        }).filter(d => d !== null);

        const smaSeries = chart.addSeries(LineSeries, { color: '#ffcc00', lineWidth: 2, priceLineVisible: false });
        smaSeries.setData(smaData);
        smaSeriesRef.current = smaSeries;
      }

      // AI Prediction
      if (colors.mlPredictions && colors.showML) {
        const predictionSeries = chart.addSeries(LineSeries, { color: '#00d4ff', lineWidth: 2, lineStyle: 2, priceLineVisible: false });
        const predictionData = colors.mlPredictions.map(p => ({
          time: toTimestamp(p),
          value: p.price
        })).filter(p => p.time !== null).sort((a, b) => a.time - b.time);
        predictionSeries.setData(predictionData);
        predictionSeriesRef.current = predictionSeries;
      }
    } else {
      const mainSeries = chart.addSeries(AreaSeries, {
        lineColor,
        topColor: areaTopColor,
        bottomColor: areaBottomColor,
        lineWidth: 2,
      });
      seriesRef.current = mainSeries;

      const formattedData = uniqueData(data).map(item => ({
        time: item.time,
        value: Number(item.value ?? item.close ?? 0),
      }));

      mainSeries.setData(formattedData);

      // Initial markers
      if (colors.markers && mainSeries && typeof mainSeries.setMarkers === 'function') {
        const uniqueMarkers = colors.markers
          .filter((m, i, arr) => arr.findIndex(t => t.time === m.time) === i)
          .sort((a, b) => a.time - b.time);
        mainSeries.setMarkers(uniqueMarkers);
      }
    }

    chart.timeScale().fitContent();

    // Handle crosshair movement
    if (colors.onCrosshairMove) {
      const unsubscribe = chart.subscribeCrosshairMove((param) => {
        if (param.time && seriesRef.current) {
          const price = param.seriesData.get(seriesRef.current);
          if (price) {
            colors.onCrosshairMove({
              time: param.time,
              price: price.close ?? price.value ?? 0,
              open: price.open,
              high: price.high,
              low: price.low,
              close: price.close,
            });
          }
        } else {
          colors.onCrosshairMove(null);
        }
      });
      return () => chart.unsubscribeCrosshairMove(unsubscribe);
    }
  }, [data, type, colors.showSMA, colors.showML, colors.mlPredictions]);

  return <div ref={chartContainerRef} className="w-full h-full" />;
};

export default TradingChart;
