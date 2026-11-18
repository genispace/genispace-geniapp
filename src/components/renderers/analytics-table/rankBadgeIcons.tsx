// Rank badge (medal) icons for AnalyticsTable (task #289, req-1109 #26).
// Five pure-SVG styles ported from the approved prototype demo (reqirment/req-1109/demo):
//   rosette = demo option I (rosette medal, selected), trophy = E, crown = F, star = G, ribbon = L.
// Each renders in gold / silver / bronze for ranks 1 / 2 / 3. Pure + dependency-free so the
// workbench copy can be synced verbatim (parity check strips imports).
import React from 'react';

export type RankBadgeStyle = 'rosette' | 'trophy' | 'crown' | 'star' | 'ribbon';

export const RANK_BADGE_STYLES: RankBadgeStyle[] = ['rosette', 'trophy', 'crown', 'star', 'ribbon'];

interface Palette {
  gradient: [string, string];
  stroke: string;
  ribbon: string;
  text: string;
}

const PALETTES: Record<1 | 2 | 3, Palette> = {
  1: { gradient: ['#ffe27a', '#e0a910'], stroke: '#b8860b', ribbon: '#d9a416', text: '#7a5200' },
  2: { gradient: ['#f2f5fa', '#aeb8c9'], stroke: '#8b96a8', ribbon: '#9aa4b5', text: '#4a5468' },
  3: { gradient: ['#f0c19a', '#c07f47'], stroke: '#9c6636', ribbon: '#c98a5e', text: '#6e3f1a' },
};

interface Shape {
  viewBox: string;
  ratio: number; // height / width
  body: (p: Palette, gid: string, rank: number) => React.ReactNode;
}

const medalGradient = (p: Palette, gid: string) => (
  <defs>
    <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor={p.gradient[0]} />
      <stop offset="1" stopColor={p.gradient[1]} />
    </linearGradient>
  </defs>
);

const SHAPES: Record<RankBadgeStyle, Shape> = {
  // Demo option I (selected): pleated rosette with hanging ribbon tails.
  rosette: {
    viewBox: '0 0 34 40',
    ratio: 40 / 34,
    body: (p, gid, rank) => (
      <>
        <path d="M11.5 23.5 7 32.5l4-1.6 2.2 3.4 3-9.2z" fill={p.ribbon} />
        <path d="M22.5 23.5 27 32.5l-4-1.6-2.2 3.4-3-9.4z" fill={p.ribbon} />
        <g fill={`url(#${gid})`} stroke={p.stroke} strokeWidth=".7">
          <circle cx="25.5" cy="16" r="3.4" /><circle cx="23.88" cy="21" r="3.4" />
          <circle cx="19.63" cy="24.08" r="3.4" /><circle cx="14.37" cy="24.08" r="3.4" />
          <circle cx="10.12" cy="21" r="3.4" /><circle cx="8.5" cy="16" r="3.4" />
          <circle cx="10.12" cy="11" r="3.4" /><circle cx="14.37" cy="7.92" r="3.4" />
          <circle cx="19.63" cy="7.92" r="3.4" /><circle cx="23.88" cy="11" r="3.4" />
        </g>
        <circle cx="17" cy="16" r="9" fill={`url(#${gid})`} stroke={p.stroke} />
        <circle cx="17" cy="16" r="6.6" fill="none" stroke="#fff8" />
        <text x="17" y="20" fontSize="9.5" fontWeight="800" textAnchor="middle" fill={p.text}>{rank}</text>
      </>
    ),
  },
  // Demo option E: two-handled champion cup on a base.
  trophy: {
    viewBox: '0 0 34 40',
    ratio: 40 / 34,
    body: (p, gid, rank) => (
      <>
        <path d="M8.5 7H4c.4 4.6 2.3 7.4 6 8.6" fill="none" stroke={p.ribbon} strokeWidth="2.4" />
        <path d="M25.5 7H30c-.4 4.6-2.3 7.4-6 8.6" fill="none" stroke={p.ribbon} strokeWidth="2.4" />
        <path d="M8.5 3h17v9.5c0 5.6-3.8 9.5-8.5 9.5s-8.5-3.9-8.5-9.5V3z" fill={`url(#${gid})`} stroke={p.stroke} />
        <rect x="15.2" y="22" width="3.6" height="5" fill={`url(#${gid})`} stroke={p.stroke} strokeWidth=".8" />
        <path d="M11 28h12l1.6 6H9.4L11 28z" fill={`url(#${gid})`} stroke={p.stroke} strokeWidth=".8" />
        <text x="17" y="15.5" fontSize="9.5" fontWeight="800" textAnchor="middle" fill={p.text}>{rank}</text>
      </>
    ),
  },
  // Demo option F: flat crown.
  crown: {
    viewBox: '0 0 30 26',
    ratio: 26 / 30,
    body: (p, gid, rank) => (
      <>
        <circle cx="2.2" cy="6.4" r="1.7" fill={`url(#${gid})`} stroke={p.stroke} strokeWidth=".7" />
        <circle cx="15" cy="2.2" r="1.7" fill={`url(#${gid})`} stroke={p.stroke} strokeWidth=".7" />
        <circle cx="27.8" cy="6.4" r="1.7" fill={`url(#${gid})`} stroke={p.stroke} strokeWidth=".7" />
        <path d="M3.2 19.5 2 8.2l6.8 5.3L15 4.2l6.2 9.3L28 8.2l-1.2 11.3z" fill={`url(#${gid})`} stroke={p.stroke} strokeWidth=".9" />
        <rect x="3.2" y="19.5" width="23.6" height="4" rx="1.6" fill={`url(#${gid})`} stroke={p.stroke} strokeWidth=".9" />
        <text x="15" y="17" fontSize="9" fontWeight="800" textAnchor="middle" fill={p.text}>{rank}</text>
      </>
    ),
  },
  // Demo option G: five-point star badge.
  star: {
    viewBox: '0 0 30 30',
    ratio: 1,
    body: (p, gid, rank) => (
      <>
        <path
          d="M15 2.6l3.7 7.8 8.5 1-6.3 5.8 1.7 8.4L15 21.4l-7.6 4.2 1.7-8.4-6.3-5.8 8.5-1z"
          fill={`url(#${gid})`}
          stroke={p.stroke}
          strokeLinejoin="round"
        />
        <text x="15" y="19" fontSize="9.5" fontWeight="800" textAnchor="middle" fill={p.text}>{rank}</text>
      </>
    ),
  },
  // Demo option L: striped service ribbon over a hanging round medal.
  ribbon: {
    viewBox: '0 0 26 36',
    ratio: 36 / 26,
    body: (p, gid, rank) => (
      <>
        <rect x="9.5" y="0" width="7" height="8" rx="1.2" fill="#d64545" />
        <rect x="11.7" y="0" width="2.6" height="8" fill="#ffffff55" />
        <rect x="9.5" y="0" width="7" height="8" rx="1.2" fill="none" stroke="#a83a3a" />
        <rect x="12" y="7.5" width="2" height="3.5" fill={p.stroke} />
        <circle cx="13" cy="21.5" r="11.5" fill={`url(#${gid})`} stroke={p.stroke} />
        <circle cx="13" cy="21.5" r="8.5" fill="none" stroke="#fff8" />
        <text x="13" y="25.5" fontSize="11" fontWeight="800" textAnchor="middle" fill={p.text}>{rank}</text>
      </>
    ),
  },
};

export interface RankBadgeIconProps {
  style?: RankBadgeStyle;
  /** Displayed rank; colors come from gold/silver/bronze for 1/2/3 (higher ranks reuse bronze). */
  rank: number;
  /** Icon width in px (height follows the style's aspect ratio). Default 20. */
  size?: number;
  /** Vertical budget in px — width is derived from the style's aspect ratio so the badge renders
   *  as large as the available height allows (per-style widths differ). Wins over `size`. */
  fitHeight?: number;
}

const RankBadgeIcon: React.FC<RankBadgeIconProps> = ({ style = 'rosette', rank, size = 20, fitHeight }) => {
  const medalRank = rank <= 1 ? 1 : rank === 2 ? 2 : 3;
  const p = PALETTES[medalRank];
  const shape = SHAPES[style] ?? SHAPES.rosette;
  const width = fitHeight != null ? Math.max(8, Math.round(fitHeight / shape.ratio)) : size;
  const height = fitHeight != null ? Math.round(fitHeight) : Math.round(size * shape.ratio);
  // Deterministic id: every instance of the same style+rank emits an identical gradient def, so
  // duplicate ids across badges are harmless and snapshots stay stable.
  const gid = `rankbadge-${style}-${medalRank}`;
  return (
    <svg
      width={width}
      height={height}
      viewBox={shape.viewBox}
      role="img"
      aria-label={`rank-${rank}`}
      data-rank-badge={style}
      data-rank={rank}
    >
      {medalGradient(p, gid)}
      {shape.body(p, gid, rank)}
    </svg>
  );
};

export default RankBadgeIcon;
