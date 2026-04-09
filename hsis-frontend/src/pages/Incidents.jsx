import React, { useEffect, useMemo, useState } from 'react';
import { ShieldCheck, AlertTriangle, LayoutDashboard, FileText, LogOut, Activity, CheckCircle2, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  getStoredAcknowledgements,
  parseTelemetryLog,
  persistAcknowledgements,
} from '../utils/securityData';

const Incidents = () => {
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [selectedSeverity, setSelectedSeverity] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [acknowledgedIds, setAcknowledgedIds] = useState(() => getStoredAcknowledgements());
  const [selectedIncident, setSelectedIncident] = useState(null);

  useEffect(() => {
    const fetchTelemetry = async () => {
      try {
        const res = await fetch('/api/telemetry');
        const data = await res.json();

        const formattedLogs = (Array.isArray(data) ? data : [])
          .map(parseTelemetryLog)
          .filter((log) => log.type !== 'SYSTEM_STARTUP' && log.type !== 'chmod')
          .map((log) => ({
            ...log,
            acknowledged: acknowledgedIds.has(log.id),
          }));

        setLogs(formattedLogs);

        if (selectedIncident) {
          const refreshed = formattedLogs.find((log) => log.id === selectedIncident.id);
          setSelectedIncident(refreshed || null);
        }
      } catch (err) {
        console.error('Failed to fetch telemetry', err);
      }
    };

    fetchTelemetry();
    const intervalId = setInterval(fetchTelemetry, 2000);
    return () => clearInterval(intervalId);
  }, [acknowledgedIds, selectedIncident]);

  const handleLogout = () => {
    localStorage.removeItem('hsis_token');
    navigate('/login');
  };

  const getSeverityBadge = (sev) => {
    switch (`${sev}`.toLowerCase()) {
      case 'critical': return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'high': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      case 'medium': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  const visibleLogs = useMemo(() => logs.filter((log) => {
    const severityMatches = selectedSeverity === 'ALL' || `${log.severity}`.toUpperCase() === selectedSeverity;
    const searchValue = searchTerm.trim().toLowerCase();
    const searchMatches = !searchValue || [log.agent, log.type, log.msg, log.process, `${log.pid}`]
      .some((value) => `${value}`.toLowerCase().includes(searchValue));

    return severityMatches && searchMatches;
  }), [logs, searchTerm, selectedSeverity]);

  const activeCount = logs.filter((log) => !log.acknowledged).length;
  const acknowledgedCount = logs.filter((log) => log.acknowledged).length;

  const acknowledgeIds = (ids) => {
    const next = new Set(acknowledgedIds);
    ids.forEach((id) => next.add(id));
    persistAcknowledgements(next);
    setAcknowledgedIds(next);
  };

  const handleAcknowledgeAll = () => {
    acknowledgeIds(logs.map((log) => log.id));
  };

  const handleAcknowledgeOne = (id) => {
    acknowledgeIds([id]);
  };

  return (
    <div className="min-h-screen bg-[#0a0f18] text-slate-300 font-sans selection:bg-indigo-500/30">
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
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-[#111827] border border-indigo-900/50 rounded-2xl p-6 shadow-lg">
          <div>
            <h2 className="text-2xl font-semibold text-white mb-2 flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-red-400" /> Incident Management
            </h2>
            <p className="text-sm text-slate-400">Review, filter, investigate, and acknowledge security anomalies detected across the monitored infrastructure.</p>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <div className="px-3 py-2 rounded-lg bg-[#0d1424] border border-indigo-900/30 text-slate-300">{activeCount} Active</div>
            <div className="px-3 py-2 rounded-lg bg-[#0d1424] border border-indigo-900/30 text-slate-300">{acknowledgedCount} Acknowledged</div>
            <button
              onClick={handleAcknowledgeAll}
              disabled={logs.length === 0}
              className="text-sm font-medium bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700/60 disabled:text-slate-500 px-4 py-2 rounded-lg transition-colors text-white border border-indigo-500 flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" /> Acknowledge All
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_360px] gap-6">
          <div className="bg-[#111827] border border-indigo-900/50 rounded-2xl overflow-hidden shadow-lg flex flex-col">
            <div className="px-6 py-4 border-b border-indigo-900/30 bg-[#0d1424] flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-orange-400" /> Active Security Incidents
              </h2>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Search agent, type, process..."
                    className="pl-9 pr-3 py-2 rounded-lg bg-[#111827] border border-indigo-900/40 text-sm text-slate-200 outline-none focus:border-indigo-500"
                  />
                </div>
                <select
                  value={selectedSeverity}
                  onChange={(event) => setSelectedSeverity(event.target.value)}
                  className="px-3 py-2 rounded-lg bg-[#111827] border border-indigo-900/40 text-sm text-slate-200 outline-none focus:border-indigo-500"
                >
                  <option value="ALL">All Severity</option>
                  <option value="CRITICAL">Critical</option>
                  <option value="HIGH">High</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="INFO">Info</option>
                </select>
              </div>
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
                  {visibleLogs.map((log) => (
                    <tr key={log.id} className={`transition-colors ${log.acknowledged ? 'bg-emerald-500/[0.03]' : 'hover:bg-[#161f33]'}`}>
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
                      <td className="px-6 py-4 text-slate-200 font-medium">{log.type}</td>
                      <td className="px-6 py-4 text-slate-400 font-mono text-xs text-wrap break-all pr-8 max-w-md">
                        {log.msg}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => setSelectedIncident(log)}
                            className="text-xs text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 px-3 py-1.5 rounded transition-colors border border-indigo-500/20"
                          >
                            Investigate
                          </button>
                          {!log.acknowledged && (
                            <button
                              onClick={() => handleAcknowledgeOne(log.id)}
                              className="text-xs text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 px-3 py-1.5 rounded transition-colors border border-emerald-500/20"
                            >
                              Ack
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {visibleLogs.length === 0 && <tr><td colSpan="6" className="text-center py-12 text-slate-500 text-base">No incidents match the current filters.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

          <aside className="bg-[#111827] border border-indigo-900/50 rounded-2xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Investigation Panel</h3>
            {!selectedIncident && (
              <p className="text-sm text-slate-500">Select an incident to inspect its forensic context, current status, and affected process metadata.</p>
            )}
            {selectedIncident && (
              <div className="space-y-4">
                <div>
                  <p className="text-xs uppercase tracking-wider text-slate-500 mb-1">Incident</p>
                  <div className="text-white font-medium">{selectedIncident.type}</div>
                  <div className="text-sm text-slate-400">{selectedIncident.time}</div>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-slate-500 mb-1">Target</p>
                  <div className="text-indigo-400">{selectedIncident.agent}</div>
                  <div className="text-sm text-slate-400">{selectedIncident.process} (PID: {selectedIncident.pid})</div>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-slate-500 mb-1">Severity</p>
                  <span className={`inline-flex px-2.5 py-1 rounded-md text-xs font-semibold border ${getSeverityBadge(selectedIncident.severity)}`}>
                    {selectedIncident.severity}
                  </span>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-slate-500 mb-1">Forensic Detail</p>
                  <p className="text-sm text-slate-300 leading-6">{selectedIncident.msg}</p>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-xl border border-indigo-900/30 bg-[#0d1424] p-3">
                    <div className="text-slate-500 text-xs uppercase tracking-wider mb-1">CPU</div>
                    <div className="text-white">{selectedIncident.cpu}</div>
                  </div>
                  <div className="rounded-xl border border-indigo-900/30 bg-[#0d1424] p-3">
                    <div className="text-slate-500 text-xs uppercase tracking-wider mb-1">Memory</div>
                    <div className="text-white">{selectedIncident.mem}</div>
                  </div>
                </div>
                <button
                  onClick={() => handleAcknowledgeOne(selectedIncident.id)}
                  className="w-full text-sm font-medium bg-emerald-600 hover:bg-emerald-500 px-4 py-2 rounded-lg transition-colors text-white border border-emerald-500 flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" /> Mark As Acknowledged
                </button>
              </div>
            )}
          </aside>
        </div>
      </main>
    </div>
  );
};

export default Incidents;
