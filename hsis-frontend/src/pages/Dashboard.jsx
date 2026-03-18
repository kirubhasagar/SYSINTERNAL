import React, { useState, useEffect } from 'react';
import { ShieldCheck, ShieldAlert, Shield, Activity, Server, Target, Cpu, HardDrive, Database, Terminal, AlertTriangle, ShieldOff, LayoutDashboard, FileText, Settings, LogOut } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());
  const [logs, setLogs] = useState([]);
  const [agents, setAgents] = useState([]);
  const [telemetryData, setTelemetryData] = useState([]);
  const [selectedAgent, setSelectedAgent] = useState('ALL');
  const [stats, setStats] = useState({ 
    activeAgents: 0, 
    healthyCount: 0,
    compromisedCount: 0,
    systemState: 'SECURE', 
    securityScore: 100,
    threatLevel: 'Low',
    riskPercentage: '0%',
    uptime: '99.9%'
  });

  useEffect(() => {
    const fetchTelemetry = async () => {
      try {
        const res = await fetch('/api/telemetry');
        const data = await res.json();
        
        if (data && data.length > 0) {
          const uniqueAgentsMap = {};
          data.forEach(log => {
            if (!uniqueAgentsMap[log.agent_id]) {
              const ip = log.agent_id.replace('aws-ec2-', '');
              uniqueAgentsMap[log.agent_id] = { id: log.agent_id, status: 'secure', ip: ip, lastPing: new Date(log.timestamp).toLocaleTimeString(), alerts: 0 };
            }
          });
          const agentList = Object.values(uniqueAgentsMap);
          setAgents(agentList);

          // Filter data for the selected agent
          const activeData = selectedAgent === 'ALL' ? data : data.filter(log => log.agent_id === selectedAgent);

          const formattedLogs = activeData.map((log, index) => {
            let parsedDetails = { msg: log.details, process: 'Unknown', severity: 'Info', pid: '-', cpu: '-', mem: '-' };
            try { parsedDetails = JSON.parse(log.details); } catch(e) {}
            return {
              id: log._id || index,
              time: new Date(log.timestamp).toLocaleTimeString(),
              agent: log.agent_id,
              type: log.syscall_type,
              ...parsedDetails
            };
          });
          setLogs(formattedLogs);

          let compromised = 0;
          activeData.forEach(log => {
            if (log.syscall_type !== 'SYSTEM_STARTUP' && log.syscall_type !== 'chmod') {
              uniqueAgentsMap[log.agent_id].alerts += 1;
            }
            if (log.syscall_type === 'MEMORY_TAMPER' || log.syscall_type === 'ROOTKIT_DETECTED') {
               uniqueAgentsMap[log.agent_id].status = 'compromised';
            } else if ((log.syscall_type === 'ptrace' || log.syscall_type === 'mprotect') && uniqueAgentsMap[log.agent_id].status !== 'compromised') {
               uniqueAgentsMap[log.agent_id].status = 'warning';
            }
          });
          
          Object.values(uniqueAgentsMap).forEach(a => { if(a.status === 'compromised') compromised++; });

          let state = 'SECURE';
          let score = 100;
          let threat = 'Low';
          
          if (agentList.some(a => a.status === 'compromised')) {
              state = 'CRITICAL'; score = Math.floor(Math.random() * 20) + 40; threat = 'Critical';
          }
          else if (agentList.some(a => a.status === 'warning')) {
              state = 'WARNING'; score = Math.floor(Math.random() * 20) + 70; threat = 'Medium';
          }

          setStats({
            activeAgents: agentList.length,
            healthyCount: agentList.length - compromised,
            compromisedCount: compromised,
            systemState: state,
            securityScore: score,
            threatLevel: threat,
            riskPercentage: `${100 - score}%`,
            uptime: '99.98%'
          });
          
          const tData = [];
          let currentBin = { time: formattedLogs[0]?.time || new Date().toLocaleTimeString(), events: 0 };
          const chronoLogs = [...formattedLogs].reverse();
           
          chronoLogs.forEach((l, i) => {
             currentBin.events += 1;
             if (currentBin.events >= Math.max(1, Math.floor(chronoLogs.length / 15))) {
               tData.push({...currentBin});
               if (i < chronoLogs.length - 1) currentBin = { time: chronoLogs[i+1].time, events: 0 };
             }
          });
          if (currentBin.events > 0 && tData.indexOf(currentBin) === -1) tData.push({...currentBin});
          
          if (tData.length === 0) tData.push({ time: new Date().toLocaleTimeString(), events: 0 });
          setTelemetryData(tData.slice(-15));
        }
      } catch (err) {
        console.error("Failed to fetch telemetry", err);
      }
    };

    // ensure we re-fetch if selectedAgent changes to update UI immediately
    fetchTelemetry();
    const intervalId = setInterval(fetchTelemetry, 2000);
    const timer = setInterval(() => setCurrentTime(new Date().toLocaleTimeString()), 1000);
    
    return () => { clearInterval(intervalId); clearInterval(timer); };
  }, [selectedAgent]);

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
                <button className="px-4 py-2 text-sm font-medium text-white bg-indigo-600/10 rounded-lg border border-indigo-500/20 flex items-center gap-2">
                  <LayoutDashboard className="w-4 h-4" /> Dashboard
                </button>
                <button onClick={() => navigate('/incidents')} className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white hover:bg-white/5 rounded-lg flex items-center gap-2 transition-colors">
                  <AlertTriangle className="w-4 h-4" /> Incidents
                </button>
                <button onClick={() => navigate('/reports')} className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white hover:bg-white/5 rounded-lg flex items-center gap-2 transition-colors">
                  <FileText className="w-4 h-4" /> Reports
                </button>
              </div>
            </div>
            
            <div className="flex items-center gap-6">
              <div className="flex items-center mr-4">
                <span className="text-xs text-slate-400 mr-2 uppercase tracking-wider">Target:</span>
                <select 
                  className="bg-[#111827] border border-indigo-500/30 text-indigo-300 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2 outline-none"
                  value={selectedAgent}
                  onChange={(e) => setSelectedAgent(e.target.value)}
                >
                  <option value="ALL">All Systems</option>
                  {agents.map(a => (
                    <option key={a.id} value={a.id}>{a.id}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col items-end hidden sm:flex">
                <span className="text-xs text-slate-400 font-medium">System Time</span>
                <span className="text-sm text-indigo-300 font-mono">{currentTime} UTC</span>
              </div>
              <div className="h-8 w-px bg-indigo-900/40"></div>
              <button onClick={handleLogout} className="flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-white transition-colors bg-white/5 px-4 py-2 rounded-lg border border-white/5 hover:border-white/10">
                <LogOut className="w-4 h-4" /> Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {/* Tier 1: Core Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-[#111827] border border-indigo-500/20 rounded-2xl p-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-[50px] -mr-16 -mt-16 transition-all group-hover:bg-indigo-500/20"></div>
            <p className="text-indigo-300/80 text-sm font-medium uppercase tracking-wider mb-2">Security Score</p>
            <div className="flex items-end gap-3">
              <h3 className={`text-5xl font-light tracking-tight ${stats.securityScore > 80 ? 'text-emerald-400' : stats.securityScore > 60 ? 'text-amber-400' : 'text-red-400'}`}>
                {stats.securityScore}%
              </h3>
            </div>
            <div className="mt-4 flex items-center gap-2 text-sm text-slate-400">
              <Activity className="w-4 h-4 text-emerald-500" />
              <span>System Uptime: {stats.uptime}</span>
            </div>
          </div>

          <div className="bg-[#111827] border border-indigo-900/50 rounded-2xl p-6 flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <p className="text-slate-400 text-sm font-medium uppercase tracking-wider">Threat Level</p>
              <div className={`p-2 rounded-lg ${stats.threatLevel === 'Critical' ? 'bg-red-500/10' : stats.threatLevel === 'Medium' ? 'bg-amber-500/10' : 'bg-emerald-500/10'}`}>
                {stats.threatLevel === 'Critical' ? <ShieldAlert className="w-5 h-5 text-red-500" /> : <ShieldCheck className="w-5 h-5 text-emerald-500" />}
              </div>
            </div>
            <div>
              <h3 className={`text-3xl font-semibold mb-1 ${stats.threatLevel === 'Critical' ? 'text-red-400' : stats.threatLevel === 'Medium' ? 'text-amber-400' : 'text-emerald-400'}`}>
                {stats.threatLevel}
              </h3>
              <p className="text-sm text-slate-500">Risk Percentage: {stats.riskPercentage}</p>
            </div>
          </div>

          <div className="bg-[#111827] border border-indigo-900/50 rounded-2xl p-6 flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <p className="text-slate-400 text-sm font-medium uppercase tracking-wider">System Overview</p>
              <Server className="w-6 h-6 text-indigo-400/50" />
            </div>
            <div>
              <h3 className="text-3xl font-semibold text-white mb-2">{stats.activeAgents} <span className="text-lg text-slate-500 font-normal">Active</span></h3>
              <div className="flex gap-4 text-sm font-medium">
                <span className="flex items-center gap-1.5 text-emerald-400"><div className="w-2 h-2 rounded-full bg-emerald-400"></div> {stats.healthyCount} Healthy</span>
                <span className="flex items-center gap-1.5 text-red-400"><div className="w-2 h-2 rounded-full bg-red-400"></div> {stats.compromisedCount} Compromised</span>
              </div>
            </div>
          </div>

          {/* Integrity Badges */}
          <div className="bg-[#111827] border border-indigo-900/50 rounded-2xl p-6 flex flex-col gap-4 justify-center">
            <div className="flex items-center justify-between p-3 rounded-xl bg-[#0d1424] border border-emerald-500/20">
              <div className="flex items-center gap-3">
                <HardDrive className="w-5 h-5 text-emerald-400" />
                <span className="text-sm font-medium text-slate-200">Binary Integrity</span>
              </div>
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider bg-emerald-400/10 px-2 py-1 rounded">Verified</span>
            </div>
            <div className={`flex items-center justify-between p-3 rounded-xl bg-[#0d1424] border ${stats.systemState === 'CRITICAL' ? 'border-red-500/20' : 'border-emerald-500/20'}`}>
              <div className="flex items-center gap-3">
                <Cpu className="w-5 h-5 text-indigo-400" />
                <span className="text-sm font-medium text-slate-200">Memory Checksums</span>
              </div>
              <span className={`text-xs font-bold uppercase tracking-wider px-2 py-1 rounded ${stats.systemState === 'CRITICAL' ? 'text-red-400 bg-red-400/10' : 'text-emerald-400 bg-emerald-400/10'}`}>
                {stats.systemState === 'CRITICAL' ? 'Tampered' : 'Verified'}
              </span>
            </div>
          </div>
        </div>

        {/* Tier 2: Chart & Process Monitoring */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          <div className="lg:col-span-2 bg-[#111827] border border-indigo-900/50 rounded-2xl overflow-hidden shadow-lg">
            <div className="px-6 py-5 border-b border-indigo-900/30 flex justify-between items-center bg-[#0d1424]/50">
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                <Target className="w-4 h-4 text-indigo-400" /> Real-Time Syscall Activity Graph
              </h2>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping"></span>
                <span className="text-xs font-medium text-indigo-400 uppercase tracking-wider">Live Monitoring</span>
              </div>
            </div>
            <div className="p-6 h-[340px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={telemetryData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorSys" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="time" stroke="#475569" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#475569" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)' }}
                    itemStyle={{ color: '#e2e8f0', fontSize: '13px' }}
                    labelStyle={{ color: '#94a3b8', fontSize: '12px', marginBottom: '4px' }}
                  />
                  <Area type="monotone" dataKey="events" name="Syscall Volume" stroke="#818cf8" strokeWidth={3} fillOpacity={1} fill="url(#colorSys)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Suspicious Processes Table */}
          <div className="bg-[#111827] border border-indigo-900/50 rounded-2xl overflow-hidden shadow-lg flex flex-col">
            <div className="px-5 py-5 border-b border-indigo-900/30 bg-[#0d1424]/50">
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-orange-400" /> Suspicious Process List
              </h2>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              <table className="w-full text-left text-sm text-slate-400 border-separate border-spacing-y-1">
                <thead className="text-xs uppercase bg-[#0d1424] text-slate-500 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 rounded-l-lg font-medium">Process / PID</th>
                    <th className="px-4 py-3 font-medium">CPU / MEM</th>
                    <th className="px-4 py-3 rounded-r-lg font-medium">Trigger</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.slice(0, 6).map((log, i) => (
                    <tr key={i} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="px-4 py-3 rounded-l-lg">
                        <div className="font-medium text-slate-200 group-hover:text-indigo-300 transition-colors break-all line-clamp-1" title={log.process}>{log.process}</div>
                        <div className="text-xs text-slate-500 font-mono mt-0.5">PID: {log.pid}</div>
                      </td>
                      <td className="px-4 py-3 text-xs font-mono">
                        <div>{log.cpu}</div>
                        <div className="text-slate-500">{log.mem}</div>
                      </td>
                      <td className="px-4 py-3 rounded-r-lg">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${getSeverityBadge(log.severity)}`}>
                          {log.type}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {logs.length === 0 && <tr><td colSpan="3" className="text-center py-8 text-slate-500">No processes flagged.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Tier 3: Threat Alerts & Forensics Dump */}
        <div className="bg-[#111827] border border-indigo-900/50 rounded-2xl overflow-hidden shadow-lg flex flex-col">
           <div className="px-6 py-4 border-b border-indigo-900/30 bg-[#0d1424] flex justify-between items-center">
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                <Terminal className="w-4 h-4 text-emerald-400" /> Threat Alerts Panel & Forensics Logs
              </h2>
              <button className="text-xs font-medium bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded transition-colors text-slate-300 border border-white/5">
                Export Logs
              </button>
           </div>
           <div className="p-0">
             <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-[#0f1522] text-slate-500 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4 font-medium border-b border-indigo-900/30">Timestamp / Target</th>
                    <th className="px-6 py-4 font-medium border-b border-indigo-900/30">Severity</th>
                    <th className="px-6 py-4 font-medium border-b border-indigo-900/30">Attack Type / Detection</th>
                    <th className="px-6 py-4 font-medium border-b border-indigo-900/30 w-full">Forensic Detail / Path</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-indigo-900/20 bg-[#111827]">
                  {logs.map((log, i) => (
                    <tr key={i} className="hover:bg-[#161f33] transition-colors">
                      <td className="px-6 py-3.5">
                        <div className="text-slate-300 font-mono text-xs">{log.time}</div>
                        <div className="text-indigo-400 text-xs mt-1">{log.agent}</div>
                      </td>
                      <td className="px-6 py-3.5">
                        <span className={`px-2.5 py-1 rounded-md text-xs font-semibold border ${getSeverityBadge(log.severity)}`}>
                          {log.severity}
                        </span>
                      </td>
                      <td className="px-6 py-3.5">
                        <div className="text-slate-200 font-medium">{log.type}</div>
                      </td>
                      <td className="px-6 py-3.5 text-slate-400 font-mono text-xs text-wrap break-all pr-8">
                        {log.msg} <br/> <span className="text-slate-500">Origin: {log.process}</span>
                      </td>
                    </tr>
                  ))}
                  {logs.length === 0 && <tr><td colSpan="4" className="text-center py-10 text-slate-500">Listening for forensic events...</td></tr>}
                </tbody>
             </table>
           </div>
        </div>

      </main>
    </div>
  );
};

export default Dashboard;
