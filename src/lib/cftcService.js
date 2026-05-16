const CFTC_BASE = '/api/cftc';
const DATASET = 'kh3c-gbw2';

export const CONTRACT_MAP = {
  'WHEAT':         { name: 'Wheat',          group: 'Nông sản',   icon: '🌾' },
  'CORN':          { name: 'Corn (Ngô)',      group: 'Nông sản',   icon: '🌽' },
  'SOYBEANS':      { name: 'Soybeans',        group: 'Nông sản',   icon: '🫘' },
  'SOYBEAN OIL':   { name: 'Soybean Oil',    group: 'Nông sản',   icon: '🫙' },
  'SOYBEAN MEAL':  { name: 'Soybean Meal',   group: 'Nông sản',   icon: '🫘' },
  'COTTON':        { name: 'Cotton',          group: 'Nông sản',   icon: '🌿' },
  'COFFEE':        { name: 'Coffee',          group: 'Nông sản',   icon: '☕' },
  'SUGAR':         { name: 'Sugar',           group: 'Nông sản',   icon: '🍬' },
  'COCOA':         { name: 'Cocoa',           group: 'Nông sản',   icon: '🍫' },
  'LIVE CATTLE':   { name: 'Live Cattle',     group: 'Nông sản',   icon: '🐄' },
  'LEAN HOGS':     { name: 'Lean Hogs',       group: 'Nông sản',   icon: '🐷' },
  'FEEDER CATTLE': { name: 'Feeder Cattle',   group: 'Nông sản',   icon: '🐄' },
  'CRUDE OIL':     { name: 'Crude Oil (WTI)', group: 'Năng lượng', icon: '🛢️' },
  'NATURAL GAS':   { name: 'Natural Gas',     group: 'Năng lượng', icon: '🔥' },
  'GASOLINE':      { name: 'Gasoline',        group: 'Năng lượng', icon: '⛽' },
  'HEATING OIL':   { name: 'Heating Oil',     group: 'Năng lượng', icon: '🔥' },
  'GOLD':          { name: 'Gold (Vàng)',      group: 'Kim loại',   icon: '🥇' },
  'SILVER':        { name: 'Silver (Bạc)',     group: 'Kim loại',   icon: '🥈' },
  'COPPER':        { name: 'Copper (Đồng)',    group: 'Kim loại',   icon: '🔶' },
  'PLATINUM':      { name: 'Platinum',         group: 'Kim loại',   icon: '⬜' },
  'PALLADIUM':     { name: 'Palladium',        group: 'Kim loại',   icon: '⬜' },
};

const TARGET_COMMODITIES = Object.keys(CONTRACT_MAP);

export async function fetchCOTData() {
  try {
    // Fetch 26 weeks per commodity by filtering only target commodities
    const whereClause = TARGET_COMMODITIES.map(c => `commodity='${c}'`).join(' OR ');
    const url = `${CFTC_BASE}?dataset=${DATASET}&$limit=2000&$where=${encodeURIComponent(whereClause)}&$order=report_date_as_yyyy_mm_dd DESC`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('CFTC API loi: ' + res.status);
    const raw = await res.json();
    if (!raw || raw.length === 0) throw new Error('Khong co du lieu tu CFTC');
    console.log('Total rows fetched:', raw.length);
    return parseCOTData(raw);
  } catch (err) {
    console.error('CFTC fetch error:', err);
    return null;
  }
}

function parseCOTData(raw) {
  const byContract = {};
  raw.forEach(row => {
    const commodity = (row.commodity || '').toUpperCase().trim();
    if (!commodity) return;
    const matchKey = TARGET_COMMODITIES.find(k => k === commodity);
    if (!matchKey) return;
    const meta = CONTRACT_MAP[matchKey];
    const date = (row.report_date_as_yyyy_mm_dd || '').slice(0, 10);

    // Try multiple field name formats
    const long = parseInt(row.m_money_positions_long_all || row.money_manager_positions_long_all || 0) || 0;
    const short = parseInt(row.m_money_positions_short_all || row.money_manager_positions_short_all || 0) || 0;
    const net = long - short;
    const oi = parseInt(row.open_interest_all) || 0;

    if (!byContract[matchKey]) byContract[matchKey] = { ...meta, key: matchKey, history: [] };
    byContract[matchKey].history.push({ date, long, short, net, oi });
  });

  Object.values(byContract).forEach(c => {
    c.history.sort((a, b) => new Date(b.date) - new Date(a.date));
    // Deduplicate by date
    const seen = new Set();
    c.history = c.history.filter(h => {
      if (seen.has(h.date)) return false;
      seen.add(h.date);
      return true;
    });
    const latest = c.history[0] || {};
    const prev = c.history[1] || {};
    c.net = latest.net || 0;
    c.long = latest.long || 0;
    c.short = latest.short || 0;
    c.oi = latest.oi || 0;
    c.netDelta = c.history.length >= 2 ? (latest.net || 0) - (prev.net || 0) : 0;
    c.oiDelta = c.history.length >= 2 ? (latest.oi || 0) - (prev.oi || 0) : 0;
    c.lastDate = latest.date || '';
  });

  return byContract;
}

export function groupByCategory(data) {
  const groups = {};
  Object.values(data).forEach(item => {
    if (!groups[item.group]) groups[item.group] = [];
    groups[item.group].push(item);
  });
  return groups;
}

export function fmtNum(n) {
  if (Math.abs(n) >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (Math.abs(n) >= 1000) return (n / 1000).toFixed(1) + 'k';
  return n.toString();
}

export function fmtDelta(n) {
  return (n >= 0 ? '+' : '') + fmtNum(n);
}
