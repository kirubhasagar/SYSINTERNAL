import React, { useState, useEffect } from 'react';
import { ShieldAlert, ShieldCheck, Shield, Activity, Server, Database, LineChart as LineChartIcon, LogOut, Terminal, AlertTriangle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useNavigate } from 'react-router-dom';

const mockTelemetryData = [
  { time: '10:00', syscalls: 120, violations: 0 },
  { time: '10:05', syscalls: 132, violations: 0 },
  { time: '10:10', syscalls: 101, violations: 0 },
  { time: '10:15', syscalls: 145, violations: 2 },
  { time: '10:20', syscalls: 890, violations: 15 },
  { time: '10:25', syscalls: 150, violations: 0 },
];

const mockAgents = [
  { id: 'aws-i-0abc123', status: 'secure', ip: '10.0.1.45', lastPing: '2s ago', alerts: 0 },
  { id: 'aws-i-0def456', status: 'warning', ip: '10.0.2.112', lastPing: '5s ago', alerts: 3 },
  { id: 'aws-i-0ghi789', status: 'compromised', ip: '10.0.3.18', lastPing: '1s ago', alerts: 12 },
];

const mockLogs = [
  { id: 1, time: '10:20:45', agent: 'aws-i-0ghi789', type: 'SYSCALL_ANOMALY', details: 'Unexpected ptrace request detected on PID 1245' },
  { id: 2, time: '10:20:42', agent: 'aws-i-0ghi789', type: 'MEMORY_TAMPER', details: 'RX segment checksum mismatch in libc.so.6' },
  { id: 3, time: '10:15:12', agent: 'aws-i-0def456', type: 'EXECVE_HOOK', details: 'Suspicious execution of /bin/bash from httpd' },
];

const Dashboard = () => {
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('hsis_token');
    navigate('/login');
  };

  const StatusIcon = ({ status }) => {
    switch(status) {
      case 'secure': return <ShieldCheck className="w-5 h-5 text-emerald-500" />;
      case 'warning': return <ShieldAlert className="w-5 h-5 text-amber-500" />;
      case 'compromised': return <AlertTriangle className="w-5 h-5 text-red-500 animate-pulse" />;
      default: return <Shield className="w-5 h-5 text-slate-500" />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-blue-500/30">
      {/* Top Navigation Bar */}
      <nav className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center">
                <Shield className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight">SYSINTERNAL <span className="text-blue-500 font-light">SOC</span></h1>
                <p className="text-xs text-slate-400">Hardened System Integrity Suite</p>
              </div>
            </div>
            
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 text-sm text-slate-400 font-mono bg-slate-900 px-3 py-1.5 rounded-md border border-slate-800">
                <Activity className="w-4 h-4 text-emerald-500 animate-pulse" />
                {currentTime} UTC
              </div>
              <button 
                onClick={handleLogout}
                className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Disconnect
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Global Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-slate-900/50 border border-slate-800 p-5 rounded-xl flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm font-medium">Active Agents</p>
              <h3 className="text-2xl font-bold text-white mt-1">3</h3>
            </div>
            <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center">
              <Server className="w-6 h-6 text-blue-400" />
            </div>
          </div>
          
          <div className="bg-slate-900/50 border border-slate-800 p-5 rounded-xl flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm font-medium">System State</p>
              <h3 className="text-2xl font-bold text-red-500 mt-1">CRITICAL</h3>
            </div>
            <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
              <ShieldAlert className="w-6 h-6 text-red-500" />
            </div>
          </div>

          <div className="bg-slate-900/50 border border-slate-800 p-5 rounded-xl flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm font-medium">Telemetry Rate</p>
              <h3 className="text-2xl font-bold text-white mt-1">1.2k/s</h3>
            </div>
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <Activity className="w-6 h-6 text-emerald-400" />
            </div>
          </div>

          <div className="bg-slate-900/50 border border-slate-800 p-5 rounded-xl flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm font-medium">Logs Processed</p>
              <h3 className="text-2xl font-bold text-white mt-1">842.1M</h3>
            </div>
            <div className="w-12 h-12 rounded-full bg-indigo-500/10 flex items-center justify-center">
              <Database className="w-6 h-6 text-indigo-400" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          
          {/* Main Telemetry Chart */}
          <div className="lg:col-span-2 bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/80">
              <div className="flex items-center gap-2">
                <LineChartIcon className="w-5 h-5 text-blue-400" />
                <h2 className="text-lg font-semibold text-white">Syscall Monotonicity Graph</h2>
              </div>
              <span className="text-xs bg-slate-800 text-slate-300 px-2 py-1 rounded">Live Data</span>
            </div>
            <div className="p-6 flex-1 h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={mockTelemetryData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="time" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }}
                    itemStyle={{ color: '#e2e8f0' }}
                  />
                  <Line type="monotone" dataKey="syscalls" stroke="#3b82f6" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="violations" stroke="#ef4444" strokeWidth={2} dot={{r: 4, fill: '#ef4444'}} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Connected Agents List */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl flex flex-col">
            <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/80">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Server className="w-5 h-5 text-blue-400" />
                Monitored Instances
              </h2>
            </div>
            <div className="p-4 flex-1">
              <div className="space-y-3">
                {mockAgents.map(agent => (
                  <div key={agent.id} className="p-3 rounded-lg border border-slate-800 bg-slate-950/50 flex items-center justify-between group hover:border-slate-700 transition-colors cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <StatusIcon status={agent.status} />
                        <span className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full ring-2 ring-slate-950 ${agent.status === 'secure' ? 'bg-emerald-500' : agent.status === 'warning' ? 'bg-amber-500' : 'bg-red-500'}`}></span>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">{agent.id}</p>
                        <p className="text-xs text-slate-500 font-mono">{agent.ip}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      {agent.alerts > 0 && (
                        <span className="inline-block px-2 py-0.5 bg-red-500/10 text-red-400 text-xs font-bold rounded-full mb-1">
                          {agent.alerts} Alerts
                        </span>
                      )}
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider block">ping {agent.lastPing}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Security Logs Console */}
        <div className="bg-[#0a0a0a] border border-slate-800 rounded-xl overflow-hidden font-mono shadow-2xl">
          <div className="px-4 py-2 bg-slate-900 border-b border-slate-800 flex justify-between items-center">
            <div className="flex items-center gap-2 text-slate-400 text-sm">
              <Terminal className="w-4 h-4" />
              <span>Layer 1/2 Incident Stream</span>
            </div>
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
              <div className="w-3 h-3 rounded-full bg-amber-500/80"></div>
              <div className="w-3 h-3 rounded-full bg-emerald-500/80"></div>
            </div>
          </div>
          <div className="p-4 h-64 overflow-y-auto text-sm">
            {mockLogs.map((log, i) => (
               <div key={i} className={`mb-2 pb-2 border-b border-slate-800/50 ${log.type === 'MEMORY_TAMPER' ? 'text-red-400' : 'text-amber-400'}`}>
                 <span className="text-slate-500 mr-2">[{log.time}]</span>
                 <span className="text-blue-400 mr-2">[{log.agent}]</span>
                 <span className="font-bold mr-2">[{log.type}]</span>
                 <span className="text-slate-300">{log.details}</span>
               </div>
            ))}
             <div className="text-emerald-500 animate-pulse flex items-center gap-2 mt-4">
               <span className="w-2 h-4 bg-emerald-500 block"></span>
               Awaiting telemetry...
             </div>
          </div>
        </div>

      </main>
    </div>
  );
};

export default Dashboard;
