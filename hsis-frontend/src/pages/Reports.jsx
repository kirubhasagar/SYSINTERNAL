import React, { useEffect, useMemo, useState } from 'react';
import { ShieldCheck, LayoutDashboard, AlertTriangle, FileText, Download, Filter, LogOut, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { buildReportCatalog, downloadBlob } from '../utils/securityData';

const Reports = () => {
  const navigate = useNavigate();
  const [telemetryLogs, setTelemetryLogs] = useState([]);
  const [metrics, setMetrics] = useState([]);
  const [selectedType, setSelectedType] = useState('ALL');
  const [generatedAt, setGeneratedAt] = useState(null);

  const handleLogout = () => {
    localStorage.removeItem('hsis_token');
    navigate('/login');
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [telemetryRes, metricsRes] = await Promise.all([
          fetch('/api/telemetry'),
          fetch('/api/metrics'),
        ]);
        const [telemetryData, metricsData] = await Promise.all([
          telemetryRes.json(),
          metricsRes.json(),
        ]);

        setTelemetryLogs(Array.isArray(telemetryData) ? telemetryData : []);
        setMetrics(Array.isArray(metricsData) ? metricsData : []);
        setGeneratedAt(new Date());
      } catch (error) {
        console.error('Failed to load report data', error);
      }
    };

    fetchData();
  }, []);

  const reports = useMemo(
    () => buildReportCatalog(telemetryLogs, metrics),
    [metrics, telemetryLogs],
  );

  const visibleReports = useMemo(
    () => reports.filter((report) => selectedType === 'ALL' || report.type === selectedType),
    [reports, selectedType],
  );

  const handleGenerate = () => {
    setGeneratedAt(new Date());
  };

  return (
    <div className="min-h-screen bg-[#0a0f18] text-slate-300 font-sans selection:bg-indigo-500/30">
      {/* Top Navigation */}
      <nav className="border-b border-indigo-900/30 bg-[#0d1424]/95 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white tracking-tight">Enterprise Security</h1>
                  <p className="text-[10px] text-indigo-400/80 uppercase tracking-widest font-mono">Operations Center</p>
                </div>
              </div>
              
              <div className="hidden md:flex items-center gap-1 border-l border-indigo-900/30 pl-8">
                <button onClick={() => navigate('/dashboard')} className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white hover:bg-white/5 rounded-lg flex items-center gap-2 transition-colors">
                  <LayoutDashboard className="w-4 h-4" /> Dashboard
                </button>
                <button onClick={() => navigate('/incidents')} className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white hover:bg-white/5 rounded-lg flex items-center gap-2 transition-colors">
                  <AlertTriangle className="w-4 h-4" /> Incidents
                </button>
                <button className="px-4 py-2 text-sm font-medium text-white bg-indigo-600/10 rounded-lg border border-indigo-500/20 flex items-center gap-2">
                  <FileText className="w-4 h-4" /> Reports
                </button>
              </div>
            </div>
            
            <div className="flex items-center gap-6">
              <button onClick={handleLogout} className="flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-white transition-colors bg-white/5 px-4 py-2 rounded-lg border border-white/5 hover:border-white/10">
                <LogOut className="w-4 h-4" /> Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        <div className="flex justify-between items-center bg-[#111827] border border-indigo-900/50 rounded-2xl p-6 shadow-lg">
          <div>
            <h2 className="text-2xl font-semibold text-white mb-2 flex items-center gap-3">
              <FileText className="w-6 h-6 text-indigo-400" /> Compliance & Reporting
            </h2>
            <p className="text-sm text-slate-400">Generate, view, and export live forensic and executive security reports from current telemetry and metrics.</p>
          </div>
          <div className="flex gap-4">
             <div className="flex items-center gap-2 bg-[#0d1424] px-3 py-2 rounded-lg border border-indigo-500/30">
                <Filter className="w-4 h-4 text-slate-400" />
                <select
                  value={selectedType}
                  onChange={(event) => setSelectedType(event.target.value)}
                  className="bg-transparent text-sm text-slate-300 outline-none"
                >
                  <option value="ALL">All Types</option>
                  <option value="JSON">JSON</option>
                  <option value="CSV">CSV</option>
                </select>
            </div>
             <button
               onClick={handleGenerate}
               className="text-sm font-medium bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded-lg transition-colors text-white border border-indigo-500 flex items-center gap-2"
             >
                <RefreshCw className="w-4 h-4" /> Generate New Report
            </button>
          </div>
        </div>

        <div className="bg-[#111827] border border-indigo-900/50 rounded-2xl p-6 shadow-lg">
           <div className="flex items-center justify-between mb-6">
             <h3 className="text-lg font-medium text-white">Live Reports</h3>
             <div className="text-xs text-slate-500">
               Last generated: {generatedAt ? generatedAt.toLocaleString() : 'Not generated yet'}
             </div>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
             {visibleReports.map((report) => (
               <div key={report.id} className="bg-[#0d1424] border border-indigo-900/30 rounded-xl p-5 flex flex-col hover:border-indigo-500/50 transition-colors group">
                 <div className="flex justify-between items-start mb-4">
                   <div className="p-2.5 bg-indigo-500/10 rounded-lg text-indigo-400">
                     <FileText className="w-6 h-6" />
                   </div>
                   <span className="text-xs font-bold text-slate-500 bg-black/20 px-2 py-1 rounded">
                     {report.type}
                   </span>
                 </div>
                 <h4 className="text-slate-200 font-medium text-base mb-1 group-hover:text-indigo-300 transition-colors line-clamp-2 leading-tight">
                   {report.name}
                 </h4>
                 <p className="text-xs text-slate-500 mb-3">{report.generatedLabel}</p>
                 <p className="text-sm text-slate-400 mb-6 leading-6">{report.description}</p>
                 
                 <div className="mt-auto flex justify-between items-center pt-4 border-t border-indigo-900/20">
                   <span className="text-xs text-slate-400">{report.sizeLabel}</span>
                   <button
                     onClick={() => downloadBlob(report.filename, report.content, report.mimeType)}
                     className="text-xs flex items-center gap-1.5 text-indigo-400 hover:text-white transition-colors"
                   >
                     <Download className="w-3.5 h-3.5" /> Download
                   </button>
                 </div>
               </div>
             ))}
           </div>
           {visibleReports.length === 0 && (
             <div className="text-center py-12 text-slate-500">No reports match the selected file type.</div>
           )}
        </div>

      </main>
    </div>
  );
};

export default Reports;
