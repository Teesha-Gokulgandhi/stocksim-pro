import { useRef, useEffect, useState, useMemo, useCallback } from "react";
import {
  FiPlay,
  FiPause,
  FiSkipForward,
  FiRotateCcw,
} from "react-icons/fi";
import "./CandlestickChart.css";
import { useTheme } from "../../context/ThemeContext";

const SPEED_OPTIONS = [
  { label: "0.5x", ms: 2000 },
  { label: "1x", ms: 1000 },
  { label: "2x", ms: 500 },
  { label: "5x", ms: 200 },
];

function CandlestickChart({
  candles = [],
  visibleCount = 0,
  trades = [],
  currentPosition = null,
  currency = "USD",
  isPlaying = false,
  onTogglePlay,
  onStep,
  onReset,
  speedIndex = 1,
  onSetSpeed,
  totalCandles = 0,
  progressPct = 0,
}) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const { theme } = useTheme();
  const [hoverIndex, setHoverIndex] = useState(null);
  const [showEMA, setShowEMA] = useState(true);

  const currencySymbol = currency === "INR" ? "₹" : "$";

  // Sliced candles currently revealed
  const revealedCandles = useMemo(() => {
    return candles.slice(0, visibleCount);
  }, [candles, visibleCount]);

  // Calculate 9 and 21 Exponential Moving Averages (EMA) for technical practice
  const emaData = useMemo(() => {
    if (!showEMA || revealedCandles.length < 5) return { ema9: [], ema21: [] };

    const calcEMA = (period) => {
      const k = 2 / (period + 1);
      const ema = [];
      let prevEMA = revealedCandles[0]?.close || 0;

      for (let i = 0; i < revealedCandles.length; i++) {
        const close = revealedCandles[i].close;
        if (i < period) {
          const sum = revealedCandles.slice(0, i + 1).reduce((a, c) => a + c.close, 0);
          prevEMA = sum / (i + 1);
        } else {
          prevEMA = close * k + prevEMA * (1 - k);
        }
        ema.push(prevEMA);
      }
      return ema;
    };

    return {
      ema9: calcEMA(9),
      ema21: calcEMA(21),
    };
  }, [revealedCandles, showEMA]);

  // Draw chart on canvas
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || revealedCandles.length === 0) return;

    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const width = canvas.parentElement.clientWidth;
    const height = 460;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    ctx.scale(dpr, dpr);

    const isLight = theme === "light";

    // Sleek gradient background adapted to active theme
    const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
    if (isLight) {
      bgGrad.addColorStop(0, "#ffffff");
      bgGrad.addColorStop(1, "#f8fafc");
    } else {
      bgGrad.addColorStop(0, "#090d15");
      bgGrad.addColorStop(1, "#0d131f");
    }
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Layout dimensions
    const paddingRight = 78;
    const paddingBottom = 32;
    const paddingTop = 18;
    const paddingLeft = 14;

    const chartWidth = width - paddingRight - paddingLeft;
    const priceChartHeight = height - paddingBottom - paddingTop - 68;
    const volumeChartY = paddingTop + priceChartHeight + 14;
    const volumeChartHeight = 52;

    // Viewport window: show at least 40 candles or all revealed candles
    const maxVisibleInWindow = Math.min(revealedCandles.length, 90);
    const startIndex = Math.max(0, revealedCandles.length - maxVisibleInWindow);
    const windowCandles = revealedCandles.slice(startIndex);

    if (windowCandles.length === 0) return;

    // Dedicated right scale lane background
    ctx.fillStyle = isLight ? "rgba(0, 0, 0, 0.02)" : "rgba(255, 255, 255, 0.015)";
    ctx.fillRect(width - paddingRight, 0, paddingRight, height - paddingBottom);

    // Dedicated bottom scale lane background
    ctx.fillStyle = isLight ? "rgba(0, 0, 0, 0.03)" : "rgba(255, 255, 255, 0.018)";
    ctx.fillRect(0, height - paddingBottom, width, paddingBottom);

    // Right scale lane vertical separator
    ctx.strokeStyle = isLight ? "rgba(0, 0, 0, 0.08)" : "rgba(255, 255, 255, 0.08)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(width - paddingRight, 0);
    ctx.lineTo(width - paddingRight, height);
    ctx.stroke();

    // Bottom scale lane horizontal separator
    ctx.beginPath();
    ctx.moveTo(0, height - paddingBottom);
    ctx.lineTo(width, height - paddingBottom);
    ctx.stroke();

    // Price bounds
    let minPrice = Infinity;
    let maxPrice = -Infinity;
    let maxVolume = 0;

    windowCandles.forEach((c) => {
      if (c.low < minPrice) minPrice = c.low;
      if (c.high > maxPrice) maxPrice = c.high;
      if (c.volume > maxVolume) maxVolume = c.volume;
    });

    const priceRange = maxPrice - minPrice || 1;
    minPrice -= priceRange * 0.05;
    maxPrice += priceRange * 0.05;

    const getX = (idxInWindow) => {
      const candleWidth = chartWidth / windowCandles.length;
      return paddingLeft + idxInWindow * candleWidth + candleWidth / 2;
    };

    const getY = (price) => {
      return (
        paddingTop +
        priceChartHeight -
        ((price - minPrice) / (maxPrice - minPrice)) * priceChartHeight
      );
    };

    const getVolY = (vol) => {
      if (maxVolume === 0) return volumeChartY + volumeChartHeight;
      return (
        volumeChartY +
        volumeChartHeight -
        (vol / maxVolume) * volumeChartHeight
      );
    };

    // Draw horizontal grid lines & price labels
    const gridSteps = 5;
    ctx.font = "11px 'JetBrains Mono', monospace";
    ctx.textAlign = "left";

    for (let i = 0; i <= gridSteps; i++) {
      const price = minPrice + ((maxPrice - minPrice) * i) / gridSteps;
      const y = getY(price);

      // Subtle dashed grid line
      ctx.setLineDash([3, 4]);
      ctx.strokeStyle = isLight ? "rgba(0, 0, 0, 0.06)" : "rgba(255, 255, 255, 0.035)";
      ctx.beginPath();
      ctx.moveTo(paddingLeft, y);
      ctx.lineTo(width - paddingRight, y);
      ctx.stroke();
      ctx.setLineDash([]);

      // Right axis tick
      ctx.strokeStyle = isLight ? "rgba(0, 0, 0, 0.12)" : "rgba(255, 255, 255, 0.12)";
      ctx.beginPath();
      ctx.moveTo(width - paddingRight, y);
      ctx.lineTo(width - paddingRight + 4, y);
      ctx.stroke();

      // Right axis label
      ctx.fillStyle = isLight ? "#475569" : "#64748b";
      ctx.fillText(
        `${currencySymbol}${price.toFixed(2)}`,
        width - paddingRight + 8,
        y + 4
      );
    }

    // Volume baseline & watermark
    ctx.strokeStyle = isLight ? "rgba(0, 0, 0, 0.08)" : "rgba(255, 255, 255, 0.06)";
    ctx.beginPath();
    ctx.moveTo(paddingLeft, volumeChartY + volumeChartHeight);
    ctx.lineTo(width - paddingRight, volumeChartY + volumeChartHeight);
    ctx.stroke();

    ctx.fillStyle = isLight ? "rgba(0, 0, 0, 0.28)" : "rgba(255, 255, 255, 0.15)";
    ctx.font = "bold 9px 'JetBrains Mono', monospace";
    ctx.fillText("VOLUME", paddingLeft + 4, volumeChartY + 12);

    const candleWidth = Math.max(4, (chartWidth / windowCandles.length) * 0.72);

    // Draw Volume Bars with rich gradient
    windowCandles.forEach((c, idx) => {
      const x = getX(idx);
      const isBullish = c.close >= c.open;
      const volY = getVolY(c.volume);
      const volHeight = Math.max(1, volumeChartY + volumeChartHeight - volY);

      const vGrad = ctx.createLinearGradient(0, volY, 0, volumeChartY + volumeChartHeight);
      if (isBullish) {
        vGrad.addColorStop(0, "rgba(0, 192, 118, 0.38)");
        vGrad.addColorStop(1, "rgba(0, 192, 118, 0.06)");
      } else {
        vGrad.addColorStop(0, "rgba(255, 59, 87, 0.38)");
        vGrad.addColorStop(1, "rgba(255, 59, 87, 0.06)");
      }

      ctx.fillStyle = vGrad;
      ctx.fillRect(x - candleWidth / 2, volY, candleWidth, volHeight);
    });

    // Draw Candlesticks (Wicks & Bodies) with pro styling
    windowCandles.forEach((c, idx) => {
      const x = getX(idx);
      const isBullish = c.close >= c.open;
      const color = isBullish ? "#00c076" : "#ff3b57";
      const borderColor = isBullish ? "#05a666" : "#e62e49";

      const openY = getY(c.open);
      const closeY = getY(c.close);
      const highY = getY(c.high);
      const lowY = getY(c.low);

      // Wick with rounded cap
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.4;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(x, highY);
      ctx.lineTo(x, lowY);
      ctx.stroke();

      // Body with subtle border
      const bodyTop = Math.min(openY, closeY);
      const bodyHeight = Math.max(2, Math.abs(closeY - openY));

      ctx.fillStyle = color;
      ctx.fillRect(x - candleWidth / 2, bodyTop, candleWidth, bodyHeight);

      // Crisp outer 1px border
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 0.8;
      ctx.strokeRect(x - candleWidth / 2, bodyTop, candleWidth, bodyHeight);
    });

    // Draw EMA lines with smooth glow
    if (showEMA) {
      const drawEMALine = (data, strokeStyle, glowColor) => {
        ctx.save();
        ctx.strokeStyle = strokeStyle;
        ctx.lineWidth = 1.8;
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = 4;
        ctx.beginPath();
        let started = false;

        windowCandles.forEach((_, idx) => {
          const globalIdx = startIndex + idx;
          const val = data[globalIdx];
          if (val != null) {
            const x = getX(idx);
            const y = getY(val);
            if (!started) {
              ctx.moveTo(x, y);
              started = true;
            } else {
              ctx.lineTo(x, y);
            }
          }
        });
        ctx.stroke();
        ctx.restore();
      };

      drawEMALine(emaData.ema9, "#38bdf8", "rgba(56, 189, 248, 0.45)"); // 9 EMA Sapphire Blue
      drawEMALine(emaData.ema21, "#fbbf24", "rgba(251, 191, 36, 0.45)"); // 21 EMA Golden Amber
    }

    // Live Close Price Tracker Line & Axis Badge
    const latestCandle = windowCandles[windowCandles.length - 1];
    if (latestCandle) {
      const latestY = getY(latestCandle.close);
      const isBull = latestCandle.close >= latestCandle.open;
      const trackerColor = isBull ? "#00c076" : "#ff3b57";

      // Dotted horizontal tracker line across chart
      ctx.setLineDash([2, 3]);
      ctx.strokeStyle = trackerColor;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(paddingLeft, latestY);
      ctx.lineTo(width - paddingRight, latestY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Glowing Badge on right price scale
      ctx.save();
      ctx.shadowColor = isBull ? "rgba(0, 192, 118, 0.5)" : "rgba(255, 59, 87, 0.5)";
      ctx.shadowBlur = 6;
      ctx.fillStyle = trackerColor;
      ctx.fillRect(width - paddingRight, latestY - 10, paddingRight, 20);
      ctx.restore();

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 11px 'JetBrains Mono', monospace";
      ctx.textAlign = "left";
      ctx.fillText(`${currencySymbol}${latestCandle.close.toFixed(2)}`, width - paddingRight + 6, latestY + 4);
    }

    // Draw Open Position Line if in trade
    if (currentPosition && currentPosition.quantity > 0) {
      const entryY = getY(currentPosition.avgPrice);
      if (entryY >= paddingTop && entryY <= paddingTop + priceChartHeight) {
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = "#38bdf8";
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(paddingLeft, entryY);
        ctx.lineTo(width - paddingRight, entryY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Entry tag on scale
        ctx.fillStyle = "#0284c7";
        ctx.fillRect(width - paddingRight, entryY - 10, paddingRight, 20);
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 10px 'JetBrains Mono', monospace";
        ctx.fillText("ENTRY", width - paddingRight + 8, entryY + 4);
      }
    }

    // Draw Trade Execution Markers with glowing pill badges
    trades.forEach((trade) => {
      const buyIdxInWindow = trade.buyIndex - startIndex;
      if (buyIdxInWindow >= 0 && buyIdxInWindow < windowCandles.length) {
        const x = getX(buyIdxInWindow);
        const y = getY(trade.entryPrice);

        ctx.save();
        ctx.shadowColor = "rgba(0, 192, 118, 0.6)";
        ctx.shadowBlur = 8;
        ctx.fillStyle = "#00c076";
        ctx.beginPath();
        ctx.arc(x, y + 14, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        ctx.fillStyle = "#000000";
        ctx.font = "bold 10px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("B", x, y + 17.5);
      }

      if (trade.sellIndex != null) {
        const sellIdxInWindow = trade.sellIndex - startIndex;
        if (sellIdxInWindow >= 0 && sellIdxInWindow < windowCandles.length) {
          const x = getX(sellIdxInWindow);
          const y = getY(trade.exitPrice);

          const isGain = trade.pnl >= 0;
          ctx.save();
          ctx.shadowColor = isGain ? "rgba(0, 192, 118, 0.6)" : "rgba(255, 59, 87, 0.6)";
          ctx.shadowBlur = 8;
          ctx.fillStyle = isGain ? "#00c076" : "#ff3b57";
          ctx.beginPath();
          ctx.arc(x, y - 14, 9, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();

          ctx.fillStyle = "#ffffff";
          ctx.font = "bold 10px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("S", x, y - 10.5);
        }
      }
    });

    // Draw date labels on bottom axis with ticks
    ctx.font = "11px 'JetBrains Mono', monospace";
    ctx.textAlign = "center";

    const dateStep = Math.max(1, Math.floor(windowCandles.length / 6));
    windowCandles.forEach((c, idx) => {
      if (idx % dateStep === 0 || idx === windowCandles.length - 1) {
        const x = getX(idx);

        // Tick mark
        ctx.strokeStyle = isLight ? "rgba(0, 0, 0, 0.12)" : "rgba(255, 255, 255, 0.12)";
        ctx.beginPath();
        ctx.moveTo(x, height - paddingBottom);
        ctx.lineTo(x, height - paddingBottom + 4);
        ctx.stroke();

        ctx.fillStyle = isLight ? "#475569" : "#64748b";
        ctx.fillText(c.displayDate || c.date, x, height - 10);
      }
    });

    // Crosshair line if hovering
    if (hoverIndex != null && hoverIndex >= 0 && hoverIndex < windowCandles.length) {
      const hoverCandle = windowCandles[hoverIndex];
      const hx = getX(hoverIndex);
      const hy = getY(hoverCandle.close);

      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = isLight ? "rgba(0, 0, 0, 0.25)" : "rgba(255, 255, 255, 0.4)";
      ctx.lineWidth = 1;

      // Vertical line
      ctx.beginPath();
      ctx.moveTo(hx, paddingTop);
      ctx.lineTo(hx, height - paddingBottom);
      ctx.stroke();

      // Horizontal line
      ctx.beginPath();
      ctx.moveTo(paddingLeft, hy);
      ctx.lineTo(width - paddingRight, hy);
      ctx.stroke();
      ctx.setLineDash([]);

      // Floating price tag on right scale
      ctx.fillStyle = "#2563eb";
      ctx.fillRect(width - paddingRight, hy - 10, paddingRight, 20);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 11px 'JetBrains Mono', monospace";
      ctx.textAlign = "left";
      ctx.fillText(`${currencySymbol}${hoverCandle.close.toFixed(2)}`, width - paddingRight + 6, hy + 4);

      // Floating date tag on bottom scale
      ctx.fillStyle = isLight ? "#e2e8f0" : "#1e293b";
      const dateText = hoverCandle.displayDate || hoverCandle.date;
      const textWidth = ctx.measureText(dateText).width + 16;
      ctx.fillRect(hx - textWidth / 2, height - paddingBottom + 2, textWidth, 20);
      ctx.fillStyle = isLight ? "#0f172a" : "#38bdf8";
      ctx.textAlign = "center";
      ctx.fillText(dateText, hx, height - 12);
    }
  }, [revealedCandles, showEMA, emaData, currentPosition, trades, hoverIndex, currencySymbol, theme]);

  useEffect(() => {
    draw();
    const handleResize = () => draw();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [draw]);

  // Handle Mouse Move for crosshair
  const handleMouseMove = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const paddingLeft = 14;
    const paddingRight = 72;
    const chartWidth = rect.width - paddingRight - paddingLeft;

    const maxVisibleInWindow = Math.min(revealedCandles.length, 90);
    const candleWidth = chartWidth / maxVisibleInWindow;
    const idx = Math.floor((x - paddingLeft) / candleWidth);

    if (idx >= 0 && idx < maxVisibleInWindow) {
      setHoverIndex(idx);
    } else {
      setHoverIndex(null);
    }
  };

  const handleMouseLeave = () => {
    setHoverIndex(null);
  };

  // Active or hovered candle for the top header strip
  const activeCandle = useMemo(() => {
    if (revealedCandles.length === 0) return null;
    if (hoverIndex != null) {
      const maxVisibleInWindow = Math.min(revealedCandles.length, 90);
      const startIndex = Math.max(0, revealedCandles.length - maxVisibleInWindow);
      return revealedCandles[startIndex + hoverIndex] || revealedCandles[revealedCandles.length - 1];
    }
    return revealedCandles[revealedCandles.length - 1];
  }, [revealedCandles, hoverIndex]);

  const candleChange = useMemo(() => {
    if (!activeCandle) return { diff: 0, pct: 0, isPositive: true };
    const diff = activeCandle.close - activeCandle.open;
    const pct = activeCandle.open > 0 ? (diff / activeCandle.open) * 100 : 0;
    return { diff, pct, isPositive: diff >= 0 };
  }, [activeCandle]);

  return (
    <div className="candlestick-chart-container" ref={containerRef}>
      {/* Unified Pro Toolbar: Combines Live Price, Playback Controls, and Indicators */}
      <div className="chart-unified-toolbar">
        {/* Left: Price & OHLC Readout */}
        <div className="toolbar-price-group">
          {activeCandle ? (
            <>
              <div className="price-primary">
                <span className="price-date">{activeCandle.displayDate || activeCandle.date}</span>
                <span className="price-value">
                  {currencySymbol}{activeCandle.close.toFixed(2)}
                </span>
                <span className={`price-pct-badge ${candleChange.isPositive ? "gain" : "loss"}`}>
                  {candleChange.isPositive ? "+" : ""}
                  {candleChange.pct.toFixed(2)}%
                </span>
              </div>
              <div className="price-ohlc-stats">
                <span>O: <strong>{activeCandle.open.toFixed(2)}</strong></span>
                <span>H: <strong>{activeCandle.high.toFixed(2)}</strong></span>
                <span>L: <strong>{activeCandle.low.toFixed(2)}</strong></span>
              </div>
            </>
          ) : (
            <span className="price-waiting">Initializing session data...</span>
          )}
        </div>

        {/* Center / Right: Playback Controls, EMA Toggle & Progress */}
        <div className="toolbar-controls-group">
          {/* EMA Indicator Pill */}
          <button
            type="button"
            className={`toolbar-ema-btn ${showEMA ? "active" : ""}`}
            onClick={() => setShowEMA((p) => !p)}
            title="Toggle 9 & 21 EMA Technical Overlays"
          >
            <span className="ema-dot blue" /> 9 EMA
            <span className="ema-dot amber" /> 21 EMA
          </button>

          <div className="toolbar-divider" />

          {/* Candle Playback Controls */}
          <div className="toolbar-playback-cluster">
            <button
              type="button"
              className="player-icon-btn reset"
              onClick={onReset}
              title="Restart session from initial bar"
            >
              <FiRotateCcw />
            </button>

            <button
              type="button"
              className={`player-action-btn ${isPlaying ? "playing" : "idle"}`}
              onClick={onTogglePlay}
            >
              {isPlaying ? (
                <>
                  <FiPause /> <span>Pause</span>
                </>
              ) : (
                <>
                  <FiPlay /> <span>Auto-Play</span>
                </>
              )}
            </button>

            <button
              type="button"
              className="player-action-btn step"
              onClick={onStep}
              disabled={visibleCount >= totalCandles}
              title="Advance exactly 1 bar forward"
            >
              <FiSkipForward /> <span>Next Day</span>
            </button>
          </div>

          {/* Speed Selector */}
          <div className="toolbar-speed-pills">
            {SPEED_OPTIONS.map((opt, idx) => (
              <button
                type="button"
                key={opt.label}
                className={`speed-tab ${speedIndex === idx ? "active" : ""}`}
                onClick={() => onSetSpeed?.(idx)}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Progress Mini Scrubber */}
          <div className="toolbar-progress-chip" title={`Candle ${visibleCount} of ${totalCandles} (${progressPct}%)`}>
            <span className="progress-num">{visibleCount}/{totalCandles}</span>
            <div className="progress-mini-track">
              <div className="progress-mini-fill" style={{ width: `${progressPct}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Canvas Area */}
      <div className="canvas-wrapper">
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        />
      </div>
    </div>
  );
}

export default CandlestickChart;

