import React, { useState, useEffect } from 'react';
import { ShieldCheck, ShieldAlert, AlertTriangle, LayoutDashboard, FileText, Settings, LogOut, Terminal, Activity } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Incidents = () => {
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    const fetchTelemetry = async () => {
      try {
        const res = await fetch('/api/telemetry');
        const data = await res.json();
        
        if (data && data.length > 0) {
          const formattedLogs = data.map((log, index) => {
            let parsedDetails = { msg: log.details, process: 'Unknown', severity: 'Info', pid: '-', cpu: '-', mem: '-' };
            try { parsedDetails = JSON.parse(log.details); } catch(e) {}
            return {
              id: log._id || index,
              time: new Date(log.timestamp).toLocaleString(),
              agent: log.agent_id,
              type: log.syscall_type,
              ...parsedDetails
            };
          }).filter(log => log.type !== 'SYSTEM_STARTUP' && log.type !== 'chmod');
          
          setLogs(formattedLogs);
        }
      } catch (err) {
        console.error("Failed to fetch telemetry", err);
      }
    };

    fetchTelemetry();
    const intervalId = setInterval(fetchTelemetry, 2000);
    return () => clearInterval(intervalId);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('hsis_token');
    navigate('/login');
  };

  const getSeverityBadge = (sev) => {
    switch(sev?.toLowerCase()) {
      case 'critical': return "bg-red-500/10 text-red-500 border-red-500/20";
      case 'high': return "bg-orange-500/10 text-orange-500 border-orange-500/20";
      case 'medium': return "bg-amber-500/10 text-amber-500 border-amber-500/20";
      default: return "bg-slate-500/10 text-slate-400 border-slate-500/20";
    }
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
                <button className="px-4 py-2 text-sm font-medium text-white bg-indigo-600/10 rounded-lg border border-indigo-500/20 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> Incidents
                </button>
                <button onClick={() => navigate('/reports')} className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white hover:bg-white/5 rounded-lg flex items-center gap-2 transition-colors">
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
              <AlertTriangle className="w-6 h-6 text-red-400" /> Incident Management
            </h2>
            <p className="text-sm text-slate-400">Review and investigate security anomalies detected across the monitored infrastructure.</p>
          </div>
          <div className="flex gap-4">
             <button className="text-sm font-medium bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded-lg transition-colors text-white border border-indigo-500 flex items-center gap-2">
                Acknowledge All
            </button>
          </div>
        </div>

        {/* Incidents Table */}
        <div className="bg-[#111827] border border-indigo-900/50 rounded-2xl overflow-hidden shadow-lg flex flex-col">
           <div className="px-6 py-4 border-b border-indigo-900/30 bg-[#0d1424] flex justify-between items-center">
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-orange-400" /> Active Security Incidents
              </h2>
           </div>
           <div className="p-0 overflow-x-auto">
             <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-[#0f1522] text-slate-500 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4 font-medium border-b border-indigo-900/30">Timestamp</th>
                    <th className="px-6 py-4 font-medium border-b border-indigo-900/30">Agent / Target</th>
                    <th className="px-6 py-4 font-medium border-b border-indigo-900/30">Severity</th>
                    <th className="px-6 py-4 font-medium border-b border-indigo-900/30">Type / Classification</th>
                    <th className="px-6 py-4 font-medium border-b border-indigo-900/30 w-full">Forensic Detail</th>
                    <th className="px-6 py-4 font-medium border-b border-indigo-900/30">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-indigo-900/20 bg-[#111827]">
                  {logs.map((log, i) => (
                    <tr key={i} className="hover:bg-[#161f33] transition-colors">
                      <td className="px-6 py-4 text-slate-300 font-mono text-xs">{log.time}</td>
                      <td className="px-6 py-4">
                        <div className="text-indigo-400 text-sm font-medium">{log.agent}</div>
                        <div className="text-slate-500 text-xs mt-0.5">Origin: {log.process} (PID: {log.pid})</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-md text-xs font-semibold border ${getSeverityBadge(log.severity)}`}>
                          {log.severity}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-200 font-medium">
                          {log.type}
                      </td>
                      <td className="px-6 py-4 text-slate-400 font-mono text-xs text-wrap break-all pr-8 max-w-md">
                        {log.msg}
                      </td>
                      <td className="px-6 py-4">
                        <button className="text-xs text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 px-3 py-1.5 rounded transition-colors border border-indigo-500/20">
                          Investigate
                        </button>
                      </td>
                    </tr>
                  ))}
                  {logs.length === 0 && <tr><td colSpan="6" className="text-center py-12 text-slate-500 text-base">No active incidents found. The system is secure.</td></tr>}
                </tbody>
             </table>
           </div>
        </div>

      </main>
    </div>
  );
};

export default Incidents;
