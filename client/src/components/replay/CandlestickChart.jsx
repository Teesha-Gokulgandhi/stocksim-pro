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

  // Format date string nicely for canvas scale (compact on mobile)
  const formatScaleDate = useCallback((dateStr, compact) => {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString("en-US", compact
          ? { month: "short", day: "numeric" }
          : { month: "short", day: "numeric", year: "2-digit" });
      }
    } catch (e) {}
    if (compact) {
      return String(dateStr).replace(/,?\s*\d{4}/, "").trim();
    }
    return String(dateStr);
  }, []);

  // Draw chart on canvas
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || revealedCandles.length === 0) return;

    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const width = canvas.parentElement.clientWidth;
    const isMobile = width < 600;
    const height = isMobile ? 350 : 460;

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
    const paddingRight = isMobile ? 66 : 78;
    const paddingBottom = 28;
    const paddingTop = isMobile ? 12 : 18;
    const paddingLeft = isMobile ? 8 : 14;

    const chartWidth = width - paddingRight - paddingLeft;
    const volumeChartHeight = isMobile ? 38 : 52;
    const priceChartHeight = height - paddingBottom - paddingTop - volumeChartHeight - 12;
    const volumeChartY = paddingTop + priceChartHeight + 10;

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
    const gridSteps = isMobile ? 4 : 5;
    ctx.font = isMobile ? "10px 'JetBrains Mono', monospace" : "11px 'JetBrains Mono', monospace";
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
        width - paddingRight + (isMobile ? 5 : 8),
        y + 4
      );
    }

    // Volume baseline & watermark
    ctx.strokeStyle = isLight ? "rgba(0, 0, 0, 0.08)" : "rgba(255, 255, 255, 0.06)";
    ctx.beginPath();
    ctx.moveTo(paddingLeft, volumeChartY + volumeChartHeight);
    ctx.lineTo(width - paddingRight, volumeChartY + volumeChartHeight);
    ctx.stroke();

    ctx.fillStyle = isLight ? "rgba(0, 0, 0, 0.25)" : "rgba(255, 255, 255, 0.18)";
    ctx.font = "8px 'JetBrains Mono', monospace";
    ctx.textAlign = "left";
    ctx.fillText("VOLUME", paddingLeft + 4, volumeChartY + 12);

    // Draw Volume Bars
    const candleWidth = chartWidth / windowCandles.length;
    const barWidth = Math.max(1.5, candleWidth * 0.65);

    windowCandles.forEach((c, idx) => {
      const x = getX(idx);
      const isUp = c.close >= c.open;
      const volTop = getVolY(c.volume);
      const volBottom = volumeChartY + volumeChartHeight;
      const volHeight = Math.max(1, volBottom - volTop);

      ctx.fillStyle = isUp
        ? (isLight ? "rgba(0, 192, 118, 0.4)" : "rgba(0, 192, 118, 0.35)")
        : (isLight ? "rgba(255, 59, 87, 0.4)" : "rgba(255, 59, 87, 0.35)");

      ctx.fillRect(x - barWidth / 2, volTop, barWidth, volHeight);
    });

    // Draw 9 & 21 EMA curves if enabled
    if (showEMA && windowCandles.length > 0) {
      const windowEMA9 = emaData.ema9.slice(startIndex);
      const windowEMA21 = emaData.ema21.slice(startIndex);

      // Draw 9 EMA (Cyan)
      if (windowEMA9.length > 1) {
        ctx.beginPath();
        ctx.strokeStyle = "#38bdf8";
        ctx.lineWidth = 1.8;
        windowEMA9.forEach((val, idx) => {
          if (val == null) return;
          const x = getX(idx);
          const y = getY(val);
          if (idx === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();
      }

      // Draw 21 EMA (Amber)
      if (windowEMA21.length > 1) {
        ctx.beginPath();
        ctx.strokeStyle = "#fbbf24";
        ctx.lineWidth = 1.8;
        windowEMA21.forEach((val, idx) => {
          if (val == null) return;
          const x = getX(idx);
          const y = getY(val);
          if (idx === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();
      }
    }

    // Draw Candlesticks
    windowCandles.forEach((c, idx) => {
      const x = getX(idx);
      const isUp = c.close >= c.open;
      const openY = getY(c.open);
      const closeY = getY(c.close);
      const highY = getY(c.high);
      const lowY = getY(c.low);

      const top = Math.min(openY, closeY);
      const bottom = Math.max(openY, closeY);
      const bodyHeight = Math.max(1.5, bottom - top);

      const candleColor = isUp ? "#00c076" : "#ff3b57";

      // Wick
      ctx.strokeStyle = candleColor;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(x, highY);
      ctx.lineTo(x, lowY);
      ctx.stroke();

      // Body
      ctx.fillStyle = candleColor;
      ctx.fillRect(x - barWidth / 2, top, barWidth, bodyHeight);
    });

    // Draw active position entry line if currently holding
    if (currentPosition && currentPosition.avgPrice) {
      const entryY = getY(currentPosition.avgPrice);
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = "#f59e0b";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(paddingLeft, entryY);
      ctx.lineTo(width - paddingRight, entryY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Position badge on right
      ctx.fillStyle = "#f59e0b";
      ctx.fillRect(width - paddingRight, entryY - 9, paddingRight, 18);
      ctx.fillStyle = "#000000";
      ctx.font = "bold 9px 'JetBrains Mono', monospace";
      ctx.textAlign = "left";
      ctx.fillText(`ENTRY`, width - paddingRight + 4, entryY + 3.5);
    }

    // Draw live price horizontal tracker tag for latest revealed candle
    const lastCandle = windowCandles[windowCandles.length - 1];
    if (lastCandle) {
      const lastY = getY(lastCandle.close);
      const isUp = lastCandle.close >= lastCandle.open;
      const tagColor = isUp ? "#00c076" : "#ff3b57";

      // Dashed line across chart
      ctx.setLineDash([2, 3]);
      ctx.strokeStyle = tagColor;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(paddingLeft, lastY);
      ctx.lineTo(width - paddingRight, lastY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Solid tracker pill on right axis
      ctx.fillStyle = tagColor;
      ctx.fillRect(width - paddingRight, lastY - 11, paddingRight, 22);
      ctx.fillStyle = "#ffffff";
      ctx.font = isMobile ? "bold 10px 'JetBrains Mono', monospace" : "bold 11px 'JetBrains Mono', monospace";
      ctx.textAlign = "left";
      ctx.fillText(`${currencySymbol}${lastCandle.close.toFixed(2)}`, width - paddingRight + 5, lastY + 4);
    }

    // Draw Completed Trade Entry / Exit Markers
    trades.forEach((trade) => {
      // Check if buy index is in viewport window
      if (trade.buyIndex >= startIndex && trade.buyIndex < startIndex + windowCandles.length) {
        const localIdx = trade.buyIndex - startIndex;
        const x = getX(localIdx);
        const candle = windowCandles[localIdx];
        if (candle) {
          const y = getY(candle.low);
          ctx.save();
          ctx.shadowColor = "rgba(0, 192, 118, 0.6)";
          ctx.shadowBlur = 8;
          ctx.fillStyle = "#00c076";
          ctx.beginPath();
          ctx.arc(x, y + 14, 8, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();

          ctx.fillStyle = "#ffffff";
          ctx.font = "bold 9px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("B", x, y + 17);
        }
      }

      // Check if sell index is in viewport window
      if (trade.sellIndex >= startIndex && trade.sellIndex < startIndex + windowCandles.length) {
        const localIdx = trade.sellIndex - startIndex;
        const x = getX(localIdx);
        const candle = windowCandles[localIdx];
        if (candle) {
          const y = getY(candle.high);
          const isGain = trade.pnl >= 0;
          ctx.save();
          ctx.shadowColor = isGain ? "rgba(0, 192, 118, 0.6)" : "rgba(255, 59, 87, 0.6)";
          ctx.shadowBlur = 8;
          ctx.fillStyle = isGain ? "#00c076" : "#ff3b57";
          ctx.beginPath();
          ctx.arc(x, y - 14, 8, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();

          ctx.fillStyle = "#ffffff";
          ctx.font = "bold 9px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("S", x, y - 10.5);
        }
      }
    });

    // Draw date labels on bottom axis with collision prevention threshold
    ctx.font = isMobile ? "10px 'JetBrains Mono', monospace" : "11px 'JetBrains Mono', monospace";
    ctx.textAlign = "center";

    const minLabelDistance = isMobile ? 70 : 100;
    let lastDrawnX = -999;

    windowCandles.forEach((c, idx) => {
      const x = getX(idx);
      // Ensure tick and text stay comfortably inside chart lane
      if (x >= paddingLeft + 16 && x <= width - paddingRight - 20) {
        if (x - lastDrawnX >= minLabelDistance) {
          lastDrawnX = x;

          // Tick mark
          ctx.strokeStyle = isLight ? "rgba(0, 0, 0, 0.12)" : "rgba(255, 255, 255, 0.12)";
          ctx.beginPath();
          ctx.moveTo(x, height - paddingBottom);
          ctx.lineTo(x, height - paddingBottom + 4);
          ctx.stroke();

          ctx.fillStyle = isLight ? "#475569" : "#64748b";
          ctx.fillText(formatScaleDate(c.displayDate || c.date, isMobile), x, height - 9);
        }
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
      ctx.fillStyle = isLight ? "#2563eb" : "#7c3aed";
      ctx.fillRect(width - paddingRight, hy - 10, paddingRight, 20);
      ctx.fillStyle = "#ffffff";
      ctx.font = isMobile ? "bold 10px 'JetBrains Mono', monospace" : "bold 11px 'JetBrains Mono', monospace";
      ctx.textAlign = "left";
      ctx.fillText(`${currencySymbol}${hoverCandle.close.toFixed(2)}`, width - paddingRight + 5, hy + 4);

      // Floating date tag on bottom scale
      ctx.fillStyle = isLight ? "#e2e8f0" : "#1e293b";
      const dateText = formatScaleDate(hoverCandle.displayDate || hoverCandle.date, isMobile);
      const textWidth = ctx.measureText(dateText).width + 14;
      ctx.fillRect(hx - textWidth / 2, height - paddingBottom + 2, textWidth, 18);
      ctx.fillStyle = isLight ? "#0f172a" : "#c4b5fd";
      ctx.textAlign = "center";
      ctx.fillText(dateText, hx, height - 11);
    }
  }, [revealedCandles, showEMA, emaData, currentPosition, trades, hoverIndex, currencySymbol, theme, formatScaleDate]);

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
    const isMobile = rect.width < 600;
    const paddingLeft = isMobile ? 8 : 14;
    const paddingRight = isMobile ? 66 : 78;
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

  const handleTouchMove = (e) => {
    if (!e.touches || e.touches.length === 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const isMobile = rect.width < 600;
    const paddingLeft = isMobile ? 8 : 14;
    const paddingRight = isMobile ? 66 : 78;
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
          {/* Row 1 on mobile: Primary Playback Actions */}
          <div className="toolbar-playback-cluster">
            <button
              type="button"
              className="player-icon-btn reset"
              onClick={onReset}
              title="Restart session from initial bar"
              aria-label="Restart session"
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

          <div className="toolbar-divider" />

          {/* Row 2 on mobile: Secondary Controls (Speed, EMA, Progress) */}
          <div className="toolbar-secondary-cluster">
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

            {/* Progress Mini Scrubber */}
            <div className="toolbar-progress-chip" title={`Candle ${visibleCount} of ${totalCandles} (${progressPct}%)`}>
              <span className="progress-num">{visibleCount}/{totalCandles}</span>
              <div className="progress-mini-track">
                <div className="progress-mini-fill" style={{ width: `${progressPct}%` }} />
              </div>
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
          onTouchMove={handleTouchMove}
          onTouchEnd={handleMouseLeave}
        />
      </div>
    </div>
  );
}

export default CandlestickChart;
