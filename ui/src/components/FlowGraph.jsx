import { motion } from "framer-motion";
import { byKey } from "../data/agents";

// node centres on a 900x430 canvas
const POS = {
  MarketResearcher: [150, 64],
  CompetitorResearcher: [150, 200],
  RiskResearcher: [150, 336],
  Analyst: [470, 200],
  Critic: [760, 200],
};
const W = 168, H = 62;

const EDGES = [
  ["MarketResearcher", "Analyst"],
  ["CompetitorResearcher", "Analyst"],
  ["RiskResearcher", "Analyst"],
  ["Analyst", "Critic"],
];

function edgePath(a, b) {
  const [ax, ay] = POS[a], [bx, by] = POS[b];
  const sx = ax + W / 2, ex = bx - W / 2;
  const mx = (sx + ex) / 2;
  return `M ${sx} ${ay} C ${mx} ${ay}, ${mx} ${by}, ${ex} ${by}`;
}
// Critic -> Analyst loop (curved below)
function loopPath() {
  const [ax, ay] = POS.Analyst, [cx, cy] = POS.Critic;
  const sx = cx - W / 2, ex = ax + W / 2;
  return `M ${sx} ${cy + 20} C ${(sx + ex) / 2} ${cy + 120}, ${(sx + ex) / 2} ${ay + 120}, ${ex} ${ay + 20}`;
}

export default function FlowGraph({ status = {}, active }) {
  return (
    <div className="flow-wrap">
      <svg viewBox="0 0 900 460" style={{ width: "100%", height: "auto" }}>
        <defs>
          <linearGradient id="eg" x1="0" x2="1">
            <stop offset="0" stopColor="#4f8cff" />
            <stop offset="1" stopColor="#a855f7" />
          </linearGradient>
        </defs>

        {/* edges */}
        {EDGES.map(([a, b], i) => {
          const live = status[a] === "done" || status[a] === "active";
          return (
            <path key={i} d={edgePath(a, b)} fill="none"
              stroke={live ? "url(#eg)" : "rgba(255,255,255,0.1)"} strokeWidth={live ? 2.4 : 1.4}>
              {live && <animate attributeName="stroke-dashoffset" from="24" to="0" dur="0.8s" repeatCount="indefinite" />}
            </path>
          );
        })}
        {/* loop edge */}
        <path d={loopPath()} fill="none" strokeDasharray="5 6"
          stroke={status.Critic ? "rgba(62,230,160,0.7)" : "rgba(255,255,255,0.1)"} strokeWidth="1.8" />
        <text x={470} y={POS.Analyst[1] + 150} textAnchor="middle" className="node-sub" fontSize="11"
          fill="rgba(154,163,196,0.8)">critic loops back ↺</text>

        {/* parallel bracket label */}
        <text x={150} y={24} textAnchor="middle" className="node-sub" fontSize="11" fill="rgba(154,163,196,0.8)">
          3 researchers · parallel
        </text>

        {/* nodes */}
        {Object.keys(POS).map((k) => {
          const [x, y] = POS[k];
          const a = byKey[k];
          const st = status[k] || "idle";
          const isActive = active === k || st === "active";
          const done = st === "done";
          return (
            <g key={k} transform={`translate(${x - W / 2}, ${y - H / 2})`}>
              <motion.rect
                width={W} height={H} rx={14}
                initial={{ opacity: 0.5 }}
                animate={{
                  opacity: st === "idle" ? 0.5 : 1,
                  scale: isActive ? 1.04 : 1,
                }}
                style={{ originX: 0.5, originY: 0.5 }}
                transition={{ type: "spring", stiffness: 300, damping: 18 }}
                fill="rgba(255,255,255,0.05)"
                stroke={isActive ? a.color : done ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.1)"}
                strokeWidth={isActive ? 2.2 : 1.2}
              />
              {isActive && (
                <motion.rect width={W} height={H} rx={14} fill="none" stroke={a.color} strokeWidth="2.2"
                  animate={{ opacity: [0.9, 0.2, 0.9] }} transition={{ duration: 1.2, repeat: Infinity }} />
              )}
              <circle cx={22} cy={H / 2} r={11} fill={a.color} opacity={st === "idle" ? 0.4 : 1} />
              <text x={22} y={H / 2 + 5} textAnchor="middle" fontSize="13">{a.emoji}</text>
              <text x={42} y={H / 2 - 4} className="node-label" fontSize="14">{a.name}</text>
              <text x={42} y={H / 2 + 14} className="node-sub" fontSize="10.5">{a.tier} · {a.role}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
