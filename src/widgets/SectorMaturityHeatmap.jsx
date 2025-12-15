import { useMemo } from "react";
import { useNavigate } from "react-router-dom";

// Split "A, B, C" → ["A", "B", "C"]
function splitValues(value) {
  if (!value) return [];
  return String(value)
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

function normalizeMaturity(m) {
  const s = (m || "").trim();
  if (!s) return "Unknown";
  return s;
}

// Simple blue-ish color scale (0..max)
function colorFor(value, max) {
  if (!max || value <= 0) return "#f7f7f7"; // near-white for zeros
  const t = value / max; // 0..1
  // Interpolate between light and dark
  const light = { r: 230, g: 242, b: 255 };
  const dark = { r: 23, g: 58, b: 140 };

  const r = Math.round(light.r + (dark.r - light.r) * t);
  const g = Math.round(light.g + (dark.g - light.g) * t);
  const b = Math.round(light.b + (dark.b - light.b) * t);

  return `rgb(${r}, ${g}, ${b})`;
}

export default function SectorMaturityHeatmap({
  items,
  title = "Heatmap: Use Cases by Sector and Maturity Level",
  // Optional: force column order if you want exactly these two
  maturityOrder = ["Conceptual/Research", "Pilot/Testing", "Production/Scale", "Unknown"],
}) {
  const navigate = useNavigate();

  const { sectors, maturities, matrix, maxValue } = useMemo(() => {
    const sectorSet = new Set();
    const maturitySet = new Set();

    // counts[sector][maturity] = n
    const counts = new Map();

    (items || []).forEach((uc) => {
      const maturity = normalizeMaturity(uc.MaturityLevel);

      // If maturity is missing, ignore this record (your original behavior)
      if (!uc.MaturityLevel) return;

      const sectorsList = splitValues(uc.Sectors);
      if (!sectorsList.length) return;

      maturitySet.add(maturity);

      sectorsList.forEach((sec) => {
        sectorSet.add(sec);
        if (!counts.has(sec)) counts.set(sec, new Map());
        const row = counts.get(sec);
        row.set(maturity, (row.get(maturity) || 0) + 1);
      });
    });

    // Build sector list (sorted)
    const sectorList = Array.from(sectorSet).sort((a, b) => a.localeCompare(b));

    // Build maturity list:
    // - Use provided order for those present
    // - Append any unexpected maturities at the end
    const present = Array.from(maturitySet);
    const ordered = maturityOrder.filter((m) => present.includes(m));
    const extras = present.filter((m) => !maturityOrder.includes(m)).sort();
    const maturityList = [...ordered, ...extras];

    // Matrix
    let max = 0;
    const mat = sectorList.map((sec) => {
      const row = counts.get(sec) || new Map();
      const values = maturityList.map((m) => row.get(m) || 0);
      values.forEach((v) => (max = Math.max(max, v)));
      return { sector: sec, values };
    });

    return {
      sectors: sectorList,
      maturities: maturityList,
      matrix: mat,
      maxValue: max,
    };
  }, [items, maturityOrder]);

  // Layout sizing
  const cellW = 150;
  const cellH = 32;
  const leftLabelW = 260;
  const topLabelH = 50;
  const colorbarW = 18;
  const gap = 10;

  const width = leftLabelW + maturities.length * cellW + gap + colorbarW + 30;
  const height = topLabelH + sectors.length * cellH + 30;

  function goToFilteredLibrary(sector, maturity) {
    if (!sector || !maturity) return;

    // Optional: don't navigate on 0 cells
    // (you can remove this if you want 0 to also navigate)
    const params = new URLSearchParams();
    params.set("sector", sector);
    params.set("maturity", maturity);

    navigate(`/library?${params.toString()}`);
  }

  return (
    <div style={{ width: "100%", overflowX: "auto" }}>
      <div style={{ width, margin: "0 auto" }}>
        <div style={{ textAlign: "center", fontWeight: 700, marginBottom: 10 }}>
          {title}
        </div>

        <svg width={width} height={height} style={{ background: "#ffffff" }}>
          {/* Column headers */}
          {maturities.map((m, j) => (
            <text
              key={m}
              x={leftLabelW + j * cellW + cellW / 2}
              y={topLabelH - 18}
              textAnchor="middle"
              fontSize="12"
              fill="#111827"
            >
              {m}
            </text>
          ))}

          {/* Axis labels */}
          <text
            x={leftLabelW + (maturities.length * cellW) / 2}
            y={topLabelH - 2}
            textAnchor="middle"
            fontSize="12"
            fill="#374151"
          >
            Maturity Level
          </text>

          <text
            x={18}
            y={topLabelH + (sectors.length * cellH) / 2}
            textAnchor="middle"
            fontSize="12"
            fill="#374151"
            transform={`rotate(-90 18 ${topLabelH + (sectors.length * cellH) / 2})`}
          >
            Sector
          </text>

          {/* Rows */}
          {matrix.map((row, i) => {
            const y = topLabelH + i * cellH;
            return (
              <g key={row.sector}>
                {/* Row label */}
                <text
                  x={leftLabelW - 10}
                  y={y + cellH / 2 + 4}
                  textAnchor="end"
                  fontSize="12"
                  fill="#111827"
                >
                  {row.sector}
                </text>

                {/* Cells */}
                {row.values.map((val, j) => {
                  const maturity = maturities[j];
                  const x = leftLabelW + j * cellW;
                  const fill = colorFor(val, maxValue);
                  const textColor = val > maxValue * 0.55 ? "#ffffff" : "#111827";

                  const clickable = val > 0; // only make >0 clickable (change if you want)

                  return (
                    <g
                      key={`${row.sector}-${maturity}`}
                      role={clickable ? "button" : undefined}
                      tabIndex={clickable ? 0 : undefined}
                      aria-label={
                        clickable
                          ? `Filter use cases: Sector ${row.sector}, Maturity ${maturity}`
                          : undefined
                      }
                      onClick={
                        clickable
                          ? () => goToFilteredLibrary(row.sector, maturity)
                          : undefined
                      }
                      onKeyDown={
                        clickable
                          ? (e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                goToFilteredLibrary(row.sector, maturity);
                              }
                            }
                          : undefined
                      }
                      style={{ cursor: clickable ? "pointer" : "default" }}
                    >
                      <rect
                        x={x}
                        y={y}
                        width={cellW}
                        height={cellH}
                        fill={fill}
                        stroke="#e5e7eb"
                      />
                      <text
                        x={x + cellW / 2}
                        y={y + cellH / 2 + 4}
                        textAnchor="middle"
                        fontSize="12"
                        fill={textColor}
                        fontWeight={600}
                        style={{ pointerEvents: "none" }} // ensure clicks go to the <g>
                      >
                        {val}
                      </text>
                    </g>
                  );
                })}
              </g>
            );
          })}

          {/* Colorbar */}
          <g
            transform={`translate(${leftLabelW + maturities.length * cellW + gap}, ${topLabelH})`}
          >
            <defs>
              <linearGradient id="heatbar" x1="0" y1="1" x2="0" y2="0">
                <stop offset="0%" stopColor={colorFor(0, maxValue)} />
                <stop offset="100%" stopColor={colorFor(maxValue, maxValue)} />
              </linearGradient>
            </defs>

            <rect
              x={0}
              y={0}
              width={colorbarW}
              height={sectors.length * cellH}
              fill="url(#heatbar)"
              stroke="#e5e7eb"
            />

            <text x={colorbarW + 8} y={12} fontSize="12" fill="#111827">
              {maxValue}
            </text>
            <text
              x={colorbarW + 8}
              y={sectors.length * cellH - 2}
              fontSize="12"
              fill="#111827"
            >
              0
            </text>
          </g>
        </svg>
      </div>
    </div>
  );
}
