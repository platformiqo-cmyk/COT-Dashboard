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
  'GOLD':          { name: 'Gold (Vang)',      group: 'Kim loai',   icon: '🥇' },
  'SILVER':        { name: 'Silver (Bac)',     group: 'Kim loai',   icon: '🥈' },
  'COPPER':        { name: 'Copper (Dong)',    group: 'Kim loai',   icon: '🔶' },
  'PLATINUM':      { name: 'Platinum',         group: 'Kim loai',   icon: '⬜' },
  'PALLADIUM':     { name: 'Palladium',        group: 'Kim loai',   icon: '⬜' },
};

const FIX_GROUP = {
  'Kim loai': 'Kim loại',
  'Nong san': 'Nông sản',
  'Nang luong': 'Năng lượng',
};

export async function fetchCOTData(limit = 500) {
  try {
    const url = `${CFTC_BASE}?dataset=${DATASET}&$limit=${limit}&$order=report_date_as_yyyy_mm_dd DESC`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('CFTC API loi: ' + res.status);
    const raw = await res.json();
    if (!raw || raw.length === 0) throw new Error('Khong co du lieu tu CFTC');
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
    const matchKey = Object.keys(CONTRACT_MAP).find(k => k === commodity);
    if (!matchKey) return;
    const meta = CONTRACT_MAP[matchKey];
    const date = (row.report_date_as_yyyy_mm_dd || '').slice(0, 10);
    const long = parseInt(row.m_money_positions_long_all) || 0;
    const short = parseInt(row.m_money_positions_short_all) || 0;
    const net = long - short;
    const oi = parseInt(row.open_interest_all) || 0;
    if (!byContract[matchKey]) byContract[matchKey] = { ...meta, key: matchKey, history: [] };
    byContract[matchKey].history.push({ date, long, short, net, oi });
  });

  Object.values(byContract).forEach(c => {
    c.history.sort((a, b) => new Date(b.date) - new Date(a.date));
    // Deduplicate by date — keep only first occurrence per date
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
    // Fix group names with special chars
    if (c.group === 'Kim loai') c.group = 'Kim loại';
    if (c.group === 'Nong san') c.group = 'Nông sản';
    if (c.group === 'Nang luong') c.group = 'Năng lượng';
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
