import React from 'react';
import { ShieldCheck, LayoutDashboard, AlertTriangle, FileText, Download, Filter, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Reports = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('hsis_token');
    navigate('/login');
  };

  const reports = [
    { id: 1, name: "Daily Integrity Synopsis", date: "Today, 08:00 AM", type: "PDF", size: "2.4 MB" },
    { id: 2, name: "Weekly Executive Summary", date: "Yesterday, 05:00 PM", type: "PDF", size: "4.1 MB" },
    { id: 3, name: "Syscall Anomaly Forensics Hash", date: "Mar 11, 2026", type: "CSV", size: "1.2 MB" },
    { id: 4, name: "Memory Tampering Post-Mortem", date: "Mar 10, 2026", type: "PDF", size: "5.8 MB" },
  ];

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
            <p className="text-sm text-slate-400">Generate, view, and export detailed forensic and executive security reports.</p>
          </div>
          <div className="flex gap-4">
             <button className="text-sm font-medium bg-[#0d1424] hover:bg-white/5 px-4 py-2 rounded-lg transition-colors text-slate-300 border border-indigo-500/30 flex items-center gap-2">
                <Filter className="w-4 h-4" /> Filter
            </button>
             <button className="text-sm font-medium bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded-lg transition-colors text-white border border-indigo-500 flex items-center gap-2">
                Generate New Report
            </button>
          </div>
        </div>

        {/* Reports Grid */}
        <div className="bg-[#111827] border border-indigo-900/50 rounded-2xl p-6 shadow-lg">
           <h3 className="text-lg font-medium text-white mb-6">Recent Reports</h3>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
             {reports.map((report) => (
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
                 <p className="text-xs text-slate-500 mb-6">{report.date}</p>
                 
                 <div className="mt-auto flex justify-between items-center pt-4 border-t border-indigo-900/20">
                   <span className="text-xs text-slate-400">{report.size}</span>
                   <button className="text-xs flex items-center gap-1.5 text-indigo-400 hover:text-white transition-colors">
                     <Download className="w-3.5 h-3.5" /> Download
                   </button>
                 </div>
               </div>
             ))}
           </div>
        </div>

      </main>
    </div>
  );
};

export default Reports;
