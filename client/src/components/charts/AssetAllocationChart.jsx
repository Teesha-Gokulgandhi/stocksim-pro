import { useMemo } from "react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import "./AssetAllocationChart.css";

const SECTOR_COLORS = [
  "#3B82F6", // Blue
  "#10B981", // Green
  "#8B5CF6", // Purple
  "#F59E0B", // Amber
  "#EC4899", // Pink
  "#06B6D4", // Cyan
  "#F97316", // Orange
  "#6366F1", // Indigo
  "#14B8A6", // Teal
];

function AssetAllocationChart({ holdings = [] }) {
  const { sectorData, totalValue } = useMemo(() => {
    if (!holdings || holdings.length === 0) {
      return { sectorData: [], totalValue: 0 };
    }

    const map = {};
    let total = 0;

    holdings.forEach((h) => {
      const sector = h.sector || "Other";
      const val = h.currentValue || h.invested || 0;
      map[sector] = (map[sector] || 0) + val;
      total += val;
    });

    const data = Object.keys(map).map((sector, index) => {
      const value = map[sector];
      const percent = total > 0 ? (value / total) * 100 : 0;
      return {
        name: sector,
        value: Math.round(value),
        percent: Number(percent.toFixed(1)),
        color: SECTOR_COLORS[index % SECTOR_COLORS.length],
      };
    });

    data.sort((a, b) => b.value - a.value);

    return { sectorData: data, totalValue: total };
  }, [holdings]);

  if (sectorData.length === 0) {
    return null;
  }

  return (
    <div className="allocation-card">
      <div className="allocation-header">
        <div>
          <h3>Sector Allocation</h3>
          <p>Distribution of your stock holdings</p>
        </div>
        <span className="allocation-count">{sectorData.length} Sectors</span>
      </div>

      <div className="allocation-content">
        <div className="allocation-chart-wrapper">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={sectorData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={85}
                paddingAngle={4}
                dataKey="value"
              >
                {sectorData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} stroke="transparent" />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const item = payload[0].payload;
                    return (
                      <div className="allocation-tooltip">
                        <span className="tooltip-dot" style={{ backgroundColor: item.color }} />
                        <div>
                          <strong>{item.name}</strong>
                          <p>
                            ₹{item.value.toLocaleString("en-IN")} ({item.percent}%)
                          </p>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="donut-center-label">
            <span>Portfolio</span>
            <strong>₹{(totalValue / 1000).toFixed(1)}k</strong>
          </div>
        </div>

        <div className="allocation-legend">
          {sectorData.map((item) => (
            <div key={item.name} className="legend-row">
              <div className="legend-left">
                <span className="legend-color-dot" style={{ backgroundColor: item.color }} />
                <span className="legend-name">{item.name}</span>
              </div>
              <div className="legend-right">
                <span className="legend-val">₹{item.value.toLocaleString("en-IN")}</span>
                <span className="legend-pct">{item.percent}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default AssetAllocationChart;
