import { useMemo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useNavigate } from "react-router-dom";

// Split "A, B, C" → ["A", "B", "C"]
function splitValues(value) {
  if (!value) return [];
  return String(value)
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

/**
 * Build distribution rows: [{ name, value }]
 * - Counts each sector occurrence (multi-sector use cases contribute to multiple buckets)
 * - Optionally groups long tail into "Other"
 */
function buildSectorDistribution(items, topN = 10) {
  const counts = new Map();

  (items || []).forEach((uc) => {
    splitValues(uc.Sectors).forEach((sector) => {
      counts.set(sector, (counts.get(sector) || 0) + 1);
    });
  });

  const rows = Array.from(counts.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  if (topN && rows.length > topN) {
    const head = rows.slice(0, topN);
    const tail = rows.slice(topN);
    const otherValue = tail.reduce((sum, r) => sum + r.value, 0);
    return [...head, { name: "Other", value: otherValue }];
  }

  return rows;
}

/**
 * Custom label:
 * - Percentage inside slice
 * - Sector name outside slice (left/right aligned)
 */
function makeDualLabelRenderer({ showLeaderLine = false, minPercentForLabels = 0.04 }) {
  return function renderDualLabel(props) {
    const { cx, cy, midAngle, outerRadius, percent, name } = props;

    if (typeof percent !== "number" || percent < minPercentForLabels) return null;

    const RADIAN = Math.PI / 180;

    const rInside = outerRadius * 0.6;
    const xInside = cx + rInside * Math.cos(-midAngle * RADIAN);
    const yInside = cy + rInside * Math.sin(-midAngle * RADIAN);

    const rOutside = outerRadius * 1.05;
    const xOutside = cx + rOutside * Math.cos(-midAngle * RADIAN);
    const yOutside = cy + rOutside * Math.sin(-midAngle * RADIAN);

    const textAnchor = xOutside > cx ? "start" : "end";

    const rLineStart = outerRadius * 1.02;
    const xLineStart = cx + rLineStart * Math.cos(-midAngle * RADIAN);
    const yLineStart = cy + rLineStart * Math.sin(-midAngle * RADIAN);

    return (
      <g>
        {showLeaderLine ? (
          <line
            x1={xLineStart}
            y1={yLineStart}
            x2={xOutside}
            y2={yOutside}
            stroke="#9ca3af"
            strokeWidth={1}
          />
        ) : null}

        <text
          x={xInside}
          y={yInside}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="#111827"
          fontSize={12}
          fontWeight={600}
        >
          {(percent * 100).toFixed(1)}%
        </text>

        <text
          x={xOutside}
          y={yOutside}
          textAnchor={textAnchor}
          dominantBaseline="middle"
          fill="#374151"
          fontSize={12}
        >
          {name}
        </text>
      </g>
    );
  };
}

const COLORS = [
  "#9ecae1",
  "#fdae6b",
  "#a1d99b",
  "#fc9272",
  "#bcbddc",
  "#c7e9c0",
  "#fdd0a2",
  "#c6dbef",
  "#d9d9d9",
  "#bdbdbd",
  "#ccebc5",
  "#f2b6cf",
];

export default function UseCaseSectorPie({
  items,
  title = "Distribution of Use Cases by Sector",
  topN = 10,
  height = 520,
  showLegend = false,
  showLeaderLine = false,
  minPercentForLabels = 0.04,
}) {
  const navigate = useNavigate();

  const data = useMemo(() => buildSectorDistribution(items, topN), [items, topN]);
  const total = useMemo(() => data.reduce((s, r) => s + r.value, 0), [data]);

  const renderDualLabel = useMemo(
    () => makeDualLabelRenderer({ showLeaderLine, minPercentForLabels }),
    [showLeaderLine, minPercentForLabels]
  );

  function handleSliceClick(slice) {
    const sector = slice?.name;
    if (!sector) return;

    // Optional: ignore "Other" clicks
    if (sector === "Other") return;

    // ✅ IMPORTANT: set the query param key to whatever your Library reads.
    // Common patterns:
    //  - /library?sector=Education
    //  - /library?Sectors=Education
    //  - /library?Sectors=Education%2CHealth
    //
    // I’m using "Sectors" here because your data field is uc.Sectors.
    const params = new URLSearchParams();
    params.set("Sectors", sector);

    navigate(`/library?${params.toString()}`);
  }

  return (
    <div style={{ width: "100%" }}>
      {title ? (
        <div style={{ textAlign: "center", marginBottom: "0.75rem" }}>
          <h2 style={{ margin: 0 }}>{title}</h2>
          <div style={{ fontSize: "0.9rem", opacity: 0.75 }}>
            Total sector-tags counted: {total}
          </div>
        </div>
      ) : null}

      <div style={{ width: "100%", height }}>
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={Math.min(190, Math.max(120, height * 0.35))}
              labelLine={false}
              label={renderDualLabel}
              onClick={handleSliceClick}
              style={{ cursor: "pointer" }}
            >
              {data.map((entry, idx) => (
                <Cell
                  key={entry.name || idx}
                  fill={COLORS[idx % COLORS.length]}
                  style={{ cursor: entry?.name === "Other" ? "default" : "pointer" }}
                />
              ))}
            </Pie>

            <Tooltip
              formatter={(val, name) => [val, name]}
              contentStyle={{ borderRadius: 10 }}
            />
            {showLegend ? <Legend /> : null}
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
