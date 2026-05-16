import React, { useState, useEffect, useRef } from 'react';
import { TrendingUp, TrendingDown, Minus, RefreshCw, BarChart2, Activity, Layers, Zap, Leaf, X } from 'lucide-react';
import { fetchCOTData, groupByCategory, fmtNum, fmtDelta } from '../lib/cftcService.js';
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

const GROUP_COLORS = {
  'Nông sản':   { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', chart: '#1D9E75', light: '#1D9E7518' },
  'Năng lượng': { bg: 'bg-orange-50',  text: 'text-orange-700',  border: 'border-orange-200',  chart: '#EF9F27', light: '#EF9F2718' },
  'Kim loại':   { bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-200',    chart: '#378ADD', light: '#378ADD18' },
};

const GROUP_ICONS = {
  'Nông sản': <Leaf className="w-4 h-4" />,
  'Năng lượng': <Zap className="w-4 h-4" />,
  'Kim loại': <Layers className="w-4 h-4" />,
};

function Signal({ net, delta }) {
  if (net > 0 && delta > 0) return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700"><TrendingUp className="w-3 h-3" />Tăng mua</span>;
  if (net > 0 && delta < 0) return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700"><TrendingDown className="w-3 h-3" />Giảm mua</span>;
  if (net < 0) return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700"><TrendingDown className="w-3 h-3" />Bán ròng</span>;
  return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600"><Minus className="w-3 h-3" />Trung lập</span>;
}

function Sparkline({ history, color }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);
  useEffect(() => {
    if (!canvasRef.current || !history?.length) return;
    if (chartRef.current) chartRef.current.destroy();
    const pts = history.slice(0, 12).reverse().map(h => Math.round(h.net / 1000));
    chartRef.current = new Chart(canvasRef.current, {
      type: 'line',
      data: { labels: pts.map((_, i) => i), datasets: [{ data: pts, borderColor: color, borderWidth: 1.5, pointRadius: 0, tension: 0.3, fill: true, backgroundColor: color + '18' }] },
      options: { responsive: false, plugins: { legend: { display: false }, tooltip: { enabled: false } }, scales: { x: { display: false }, y: { display: false } }, animation: false }
    });
    return () => chartRef.current?.destroy();
  }, [history, color]);
  return <canvas ref={canvasRef} width={80} height={36} />;
}

function NetBarChart({ items, color, light }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);
  useEffect(() => {
    if (!canvasRef.current || !items?.length) return;
    if (chartRef.current) chartRef.current.destroy();
    const labels = items.map(i => i.name.replace(' (Ngô)', '').replace(' (Vàng)', '').replace(' (Bạc)', '').replace(' (Đồng)', '').replace(' (WTI)', ''));
    const nets = items.map(i => Math.round(i.net / 1000));
    chartRef.current = new Chart(canvasRef.current, {
      type: 'bar',
      data: { labels, datasets: [{ data: nets, backgroundColor: nets.map(v => v >= 0 ? color + 'cc' : '#E24B4Acc'), borderRadius: 4 }] },
      options: {
        responsive: true, maintainAspectRatio: false, indexAxis: 'y',
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ' ' + (ctx.raw >= 0 ? '+' : '') + ctx.raw + 'k' } } },
        scales: { x: { ticks: { font: { size: 10 }, callback: v => v + 'k' }, grid: { color: '#00000008' } }, y: { ticks: { font: { size: 11 } } } }
      }
    });
    return () => chartRef.current?.destroy();
  }, [items, color]);
  const h = Math.max(items.length * 44 + 40, 160);
  return <div style={{ position: 'relative', height: h }}><canvas ref={canvasRef} /></div>;
}

function DetailPanel({ item, onClose }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);
  const gc = GROUP_COLORS[item.group] || GROUP_COLORS['Nông sản'];
  useEffect(() => {
    if (!canvasRef.current || !item.history?.length) return;
    if (chartRef.current) chartRef.current.destroy();
    const pts = item.history.slice(0, 26).reverse();
    const labels = pts.map(h => h.date?.slice(5) || '');
    chartRef.current = new Chart(canvasRef.current, {
      type: 'line',
      data: {
        labels,
        datasets: [
          { label: 'Long', data: pts.map(h => Math.round(h.long / 1000)), borderColor: '#378ADD', backgroundColor: '#378ADD18', tension: 0.3, pointRadius: 2, fill: true },
          { label: 'Short', data: pts.map(h => Math.round(h.short / 1000)), borderColor: '#E24B4A', backgroundColor: '#E24B4A18', tension: 0.3, pointRadius: 2, fill: true },
          { label: 'Net', data: pts.map(h => Math.round(h.net / 1000)), borderColor: gc.chart, borderDash: [4, 3], tension: 0.3, pointRadius: 2, borderWidth: 2 },
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: true, position: 'top', labels: { font: { size: 11 }, boxWidth: 12 } } },
        scales: { x: { ticks: { font: { size: 10 }, maxTicksLimit: 10 } }, y: { ticks: { font: { size: 10 }, callback: v => v + 'k' } } }
      }
    });
    return () => chartRef.current?.destroy();
  }, [item]);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{item.icon}</span>
            <div>
              <h3 className="text-xl font-bold text-gray-900">{item.name}</h3>
              <span className={`text-xs px-2 py-0.5 rounded-full ${gc.bg} ${gc.text}`}>{item.group}</span>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="grid grid-cols-4 gap-3 mb-5">
          {[
            { label: 'Net position', value: fmtDelta(item.net), color: item.net >= 0 ? 'text-emerald-600' : 'text-red-600' },
            { label: 'Net Δ tuần', value: fmtDelta(item.netDelta), color: item.netDelta >= 0 ? 'text-emerald-600' : 'text-red-600' },
            { label: 'Long', value: fmtNum(item.long), color: 'text-blue-600' },
            { label: 'Short', value: fmtNum(item.short), color: 'text-red-500' },
          ].map(m => (
            <div key={m.label} className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-400 mb-1">{m.label}</p>
              <p className={`text-lg font-bold ${m.color}`}>{m.value}</p>
            </div>
          ))}
        </div>
        <div style={{ position: 'relative', height: 260 }}>
          <canvas ref={canvasRef} />
        </div>
        <p className="text-xs text-gray-400 mt-3 text-right">Nguồn: CFTC · Cập nhật {item.lastDate}</p>
      </div>
    </div>
  );
}

export default function COTDashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeGroup, setActiveGroup] = useState('Tất cả');
  const [selectedItem, setSelectedItem] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const raw = await fetchCOTData(500);
      if (!raw || Object.keys(raw).length === 0) throw new Error('Không có dữ liệu từ CFTC');
      setData(groupByCategory(raw));
      setLastUpdate(new Date().toLocaleString('vi-VN'));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const allGroups = ['Tất cả', 'Nông sản', 'Năng lượng', 'Kim loại'];
  const visibleGroups = activeGroup === 'Tất cả'
    ? Object.entries(data || {})
    : Object.entries(data || {}).filter(([g]) => g === activeGroup);

  const allItems = data ? Object.values(data).flat() : [];
  const bullish = allItems.filter(i => i.net > 0 && i.netDelta > 0).length;
  const bearish = allItems.filter(i => i.net < 0).length;
  const neutral = allItems.length - bullish - bearish;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-emerald-600 rounded-xl flex items-center justify-center">
              <BarChart2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">COT Dashboard</h1>
              <p className="text-xs text-gray-400">CFTC Commitments of Traders</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {lastUpdate && <p className="text-xs text-gray-400 hidden md:block">Cập nhật: {lastUpdate}</p>}
            <button onClick={loadData} disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Làm mới
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Summary */}
        {!loading && data && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Tổng hàng hoá', value: allItems.length, sub: '3 nhóm thị trường', color: 'text-gray-900', bg: 'bg-white' },
              { label: 'Tín hiệu tăng', value: bullish, sub: 'Quỹ đang tăng mua', color: 'text-emerald-600', bg: 'bg-emerald-50' },
              { label: 'Tín hiệu giảm', value: bearish, sub: 'Quỹ đang bán ròng', color: 'text-red-500', bg: 'bg-red-50' },
              { label: 'Trung lập', value: neutral, sub: 'Chưa rõ xu hướng', color: 'text-gray-500', bg: 'bg-gray-100' },
            ].map(m => (
              <div key={m.label} className={`${m.bg} rounded-2xl border border-gray-100 p-5`}>
                <p className="text-sm text-gray-500 mb-1">{m.label}</p>
                <p className={`text-3xl font-bold ${m.color}`}>{m.value}</p>
                <p className="text-xs text-gray-400 mt-1">{m.sub}</p>
              </div>
            ))}
          </div>
        )}

        {/* Group tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {allGroups.map(g => (
            <button key={g} onClick={() => setActiveGroup(g)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-colors border
                ${activeGroup === g ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
              {GROUP_ICONS[g]}
              {g}
            </button>
          ))}
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <RefreshCw className="w-10 h-10 text-emerald-500 animate-spin" />
            <p className="text-gray-500 font-medium">Đang tải dữ liệu từ CFTC...</p>
            <p className="text-gray-400 text-sm">Có thể mất 5-10 giây</p>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-10 text-center">
            <p className="text-red-600 font-semibold text-lg mb-2">Không tải được dữ liệu</p>
            <p className="text-red-400 text-sm mb-5">{error}</p>
            <button onClick={loadData} className="px-6 py-2.5 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700">
              Thử lại
            </button>
          </div>
        )}

        {/* Data groups */}
        {!loading && !error && data && visibleGroups.map(([group, items]) => {
          const gc = GROUP_COLORS[group] || GROUP_COLORS['Nông sản'];
          return (
            <div key={group} className="mb-10">
              <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-xl ${gc.bg} ${gc.border} border mb-5`}>
                <span className={gc.text}>{GROUP_ICONS[group]}</span>
                <span className={`font-semibold ${gc.text}`}>{group}</span>
                <span className={`text-xs ${gc.text} opacity-60`}>({items.length})</span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Bar chart */}
                <div className="bg-white rounded-2xl border border-gray-100 p-5">
                  <p className="text-sm font-semibold text-gray-700 mb-1">Net Position</p>
                  <p className="text-xs text-gray-400 mb-4">Nghìn hợp đồng (k)</p>
                  <NetBarChart items={items} color={gc.chart} light={gc.light} />
                </div>

                {/* Table */}
                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden lg:col-span-2">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50">
                        <th className="text-left py-3 px-4 text-xs font-medium text-gray-400 uppercase tracking-wide">Hàng hoá</th>
                        <th className="text-right py-3 px-4 text-xs font-medium text-gray-400 uppercase tracking-wide">Net</th>
                        <th className="text-right py-3 px-4 text-xs font-medium text-gray-400 uppercase tracking-wide">Net Δ</th>
                        <th className="text-right py-3 px-4 text-xs font-medium text-gray-400 uppercase tracking-wide hidden md:table-cell">OI</th>
                        <th className="text-right py-3 px-4 text-xs font-medium text-gray-400 uppercase tracking-wide hidden md:table-cell">12 tuần</th>
                        <th className="py-3 px-4 text-xs font-medium text-gray-400 uppercase tracking-wide">Tín hiệu</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {items.map(item => (
                        <tr key={item.key} className="hover:bg-gray-50 cursor-pointer transition-colors" onClick={() => setSelectedItem(item)}>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{item.icon}</span>
                              <span className="font-medium text-gray-900 text-sm">{item.name}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className={`font-semibold text-sm ${item.net >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                              {fmtDelta(item.net)}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className={`text-sm ${item.netDelta >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                              {fmtDelta(item.netDelta)}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right text-sm text-gray-500 hidden md:table-cell">{fmtNum(item.oi)}</td>
                          <td className="py-3 px-4 text-right hidden md:table-cell">
                            <Sparkline history={item.history} color={gc.chart} />
                          </td>
                          <td className="py-3 px-4">
                            <Signal net={item.net} delta={item.netDelta} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          );
        })}

        {!loading && !error && data && (
          <p className="text-center text-xs text-gray-400 mt-4 pb-8">
            Nguồn: CFTC Commitments of Traders Report · Dữ liệu delayed ~3 ngày · Nhấn vào hàng để xem chi tiết
          </p>
        )}
      </main>

      {selectedItem && <DetailPanel item={selectedItem} onClose={() => setSelectedItem(null)} />}
    </div>
  );
}
