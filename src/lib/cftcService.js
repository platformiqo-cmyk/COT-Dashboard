const CFTC_BASE = '/api/cftc';
const DATASET = 'kh3c-gbw2';

export const CONTRACT_MAP = {
  'CORN':                   { name: 'Corn (Ngô)',       group: 'Nông sản',   icon: '🌽' },
  'WHEAT-SRW':              { name: 'Wheat SRW',        group: 'Nông sản',   icon: '🌾' },
  'WHEAT-HRW':              { name: 'Wheat HRW',        group: 'Nông sản',   icon: '🌾' },
  'SOYBEANS':               { name: 'Soybeans',         group: 'Nông sản',   icon: '🫘' },
  'SOYBEAN OIL':            { name: 'Soybean Oil',      group: 'Nông sản',   icon: '🫙' },
  'SOYBEAN MEAL':           { name: 'Soybean Meal',     group: 'Nông sản',   icon: '🫘' },
  'COTTON NO. 2':           { name: 'Cotton',           group: 'Nông sản',   icon: '🌿' },
  'COFFEE C':               { name: 'Coffee',           group: 'Nông sản',   icon: '☕' },
  'SUGAR NO. 11':           { name: 'Sugar',            group: 'Nông sản',   icon: '🍬' },
  'COCOA':                  { name: 'Cocoa',            group: 'Nông sản',   icon: '🍫' },
  'LIVE CATTLE':            { name: 'Live Cattle',      group: 'Nông sản',   icon: '🐄' },
  'LEAN HOGS':              { name: 'Lean Hogs',        group: 'Nông sản',   icon: '🐷' },
  'FEEDER CATTLE':          { name: 'Feeder Cattle',    group: 'Nông sản',   icon: '🐄' },
  'CRUDE OIL':              { name: 'Crude Oil (WTI)',  group: 'Năng lượng', icon: '🛢️' },
  'NATURAL GAS':            { name: 'Natural Gas',      group: 'Năng lượng', icon: '🔥' },
  'RBOB GASOLINE':          { name: 'Gasoline',         group: 'Năng lượng', icon: '⛽' },
  'HEATING OIL':            { name: 'Heating Oil',      group: 'Năng lượng', icon: '🔥' },
  'GOLD':                   { name: 'Gold (Vàng)',      group: 'Kim loại',   icon: '🥇' },
  'SILVER':                 { name: 'Silver (Bạc)',     group: 'Kim loại',   icon: '🥈' },
  'COPPER':                 { name: 'Copper (Đồng)',    group: 'Kim loại',   icon: '🔶' },
  'PLATINUM':               { name: 'Platinum',         group: 'Kim loại',   icon: '⬜' },
};

export async function fetchCOTData(limit = 500) {
  try {
    const url = `/api/cftc?dataset=${DATASET}&$limit=${limit}&$order=report_date_as_yyyy_mm_dd DESC`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`CFTC API lỗi: ${res.status}`);
    const raw = await res.json();
    return parseCOTData(raw);
  } catch (err) {
    console.error('CFTC fetch error:', err);
    return null;
  }
}

function parseCOTData(raw) {
  const byContract = {};
  raw.forEach(row => {
    const contractName = row.contract_market_name?.toUpperCase().trim() || '';
    const matchKey = Object.keys(CONTRACT_MAP).find(k => contractName.includes(k));
    if (!matchKey) return;
    const meta = CONTRACT_MAP[matchKey];
    const date = row.report_date_as_yyyy_mm_dd;
    const long = parseInt(row.money_manager_positions_long_all) || 0;
    const short = parseInt(row.money_manager_positions_short_all) || 0;
    const net = long - short;
    const oi = parseInt(row.open_interest_all) || 0;
    if (!byContract[matchKey]) byContract[matchKey] = { ...meta, key: matchKey, history: [] };
    byContract[matchKey].history.push({ date, long, short, net, oi });
  });
  Object.values(byContract).forEach(c => {
    c.history.sort((a, b) => new Date(b.date) - new Date(a.date));
    const latest = c.history[0] || {};
    const prev = c.history[1] || {};
    c.net = latest.net || 0;
    c.long = latest.long || 0;
    c.short = latest.short || 0;
    c.oi = latest.oi || 0;
    c.netDelta = (latest.net || 0) - (prev.net || 0);
    c.oiDelta = (latest.oi || 0) - (prev.oi || 0);
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
