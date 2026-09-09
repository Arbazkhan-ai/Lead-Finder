import React from 'react';
import { 
  Users, Mail, MessageSquare, Award, DollarSign, TrendingUp, 
  Search, ArrowRight, CheckCircle2, Clock, Globe, Sparkles 
} from 'lucide-react';

export default function Dashboard({ stats, onNavigate, onOpenLeadModal }) {
  const breakdown = stats?.pipelineBreakdown || {
    new: 0,
    contacted: 0,
    replied: 0,
    negotiating: 0,
    closed_won: 0,
    closed_lost: 0
  };

  const stages = [
    { key: 'new', label: 'New Leads', count: breakdown.new, color: 'from-blue-500/20 to-cyan-500/20 text-cyan-400 border-cyan-500/30' },
    { key: 'contacted', label: 'Outreach Sent', count: breakdown.contacted, color: 'from-indigo-500/20 to-purple-500/20 text-indigo-300 border-indigo-500/30' },
    { key: 'replied', label: 'Client Replied', count: breakdown.replied, color: 'from-amber-500/20 to-yellow-500/20 text-amber-300 border-amber-500/30' },
    { key: 'negotiating', label: 'AI Negotiating', count: breakdown.negotiating, color: 'from-violet-500/20 to-pink-500/20 text-violet-300 border-violet-500/30' },
    { key: 'closed_won', label: 'Deals Closed Won', count: breakdown.closed_won, color: 'from-emerald-500/20 to-teal-500/20 text-emerald-300 border-emerald-500/30' }
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-cyan-950 p-6 md:p-8 border border-slate-800 shadow-2xl">
        <div className="absolute -right-10 -bottom-10 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold uppercase tracking-wider mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Full-Cycle Autonomous Prospecting</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              Find Leads, Auto-Email & Close Clients with AI
            </h1>
            <p className="text-slate-300 mt-2 text-sm md:text-base max-w-2xl">
              Target prospective businesses by industry and location, scrape their verified websites and emails, and let the AI negotiator reply automatically back and forth until contracts are signed.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => onNavigate('finder')}
              className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm shadow-lg shadow-cyan-500/20 transition-all hover:scale-105"
            >
              <Search className="w-4 h-4" />
              <span>Find New Leads</span>
            </button>
            <button
              onClick={() => onNavigate('conversations')}
              className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-sm border border-slate-700 transition-all"
            >
              <MessageSquare className="w-4 h-4 text-cyan-400" />
              <span>Live AI Closer Hub</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        
        {/* Total Leads */}
        <div className="bg-slate-900/80 rounded-xl p-5 border border-slate-800/80 backdrop-blur-sm shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Leads</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-bold text-white tracking-tight">{stats?.totalLeads || 0}</div>
          <p className="text-xs text-slate-400 mt-1 flex items-center">
            <span className="text-cyan-400 font-semibold mr-1">Active database</span> in pipeline
          </p>
        </div>

        {/* Contacted */}
        <div className="bg-slate-900/80 rounded-xl p-5 border border-slate-800/80 backdrop-blur-sm shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Outreach Sent</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
              <Mail className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-bold text-white tracking-tight">{stats?.contacted || 0}</div>
          <p className="text-xs text-slate-400 mt-1">Personalized cold pitches</p>
        </div>

        {/* Reply Rate */}
        <div className="bg-slate-900/80 rounded-xl p-5 border border-slate-800/80 backdrop-blur-sm shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Reply Rate</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-bold text-amber-400 tracking-tight">{stats?.replyRate || 0}%</div>
          <p className="text-xs text-slate-400 mt-1">{stats?.replied || 0} prospects responded</p>
        </div>

        {/* Close Rate */}
        <div className="bg-slate-900/80 rounded-xl p-5 border border-slate-800/80 backdrop-blur-sm shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Close Rate</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-bold text-emerald-400 tracking-tight">{stats?.closeRate || 0}%</div>
          <p className="text-xs text-slate-400 mt-1">{stats?.closedWon || 0} deals finalized</p>
        </div>

        {/* Closed Revenue */}
        <div className="bg-slate-900/80 rounded-xl p-5 border border-slate-800/80 backdrop-blur-sm shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Won Revenue</span>
            <div className="w-8 h-8 rounded-lg bg-teal-500/10 flex items-center justify-center text-teal-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-bold text-teal-300 tracking-tight">
            ${(stats?.totalRevenueWon || 0).toLocaleString()}
          </div>
          <p className="text-xs text-slate-400 mt-1">Pipeline deal value</p>
        </div>

      </div>

      {/* Pipeline Funnel Stages */}
      <div className="bg-slate-900/70 rounded-2xl p-6 border border-slate-800">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">Live Pipeline Stages</h2>
            <p className="text-xs text-slate-400">Progression from discovery to closing the client</p>
          </div>
          <button
            onClick={() => onNavigate('pipeline')}
            className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold inline-flex items-center space-x-1"
          >
            <span>View Kanban Board</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {stages.map((stage, idx) => (
            <div
              key={stage.key}
              onClick={() => onNavigate('pipeline')}
              className={`cursor-pointer rounded-xl p-4 bg-gradient-to-br ${stage.color} border transition-all hover:scale-[1.02]`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold opacity-90">{stage.label}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-900/60 font-bold">Step {idx + 1}</span>
              </div>
              <div className="text-2xl font-black text-white">{stage.count}</div>
              <div className="text-[11px] text-slate-400 mt-2 flex items-center justify-between">
                <span>Active prospects</span>
                <span>→</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Split Section: Activity Logs & Quick Launch */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Real-time Activity Timeline */}
        <div className="lg:col-span-2 bg-slate-900/70 rounded-2xl p-6 border border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-white flex items-center space-x-2">
              <Clock className="w-4 h-4 text-cyan-400" />
              <span>Real-Time Outreach & AI Activity Log</span>
            </h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Live Stream
            </span>
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
            {stats?.recentLogs && stats.recentLogs.length > 0 ? (
              stats.recentLogs.map((log) => {
                let badgeColor = 'bg-blue-500/10 text-blue-400 border-blue-500/20';
                if (log.type === 'deal_closed') badgeColor = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
                if (log.type === 'reply_received') badgeColor = 'bg-amber-500/10 text-amber-300 border-amber-500/20';
                if (log.type === 'ai_negotiator') badgeColor = 'bg-purple-500/10 text-purple-300 border-purple-500/20';

                return (
                  <div key={log.id} className="flex items-start space-x-3 p-3 rounded-xl bg-slate-950/50 border border-slate-800/80">
                    <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded border ${badgeColor} shrink-0 mt-0.5`}>
                      {log.type.replace('_', ' ')}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-200 break-words">{log.message}</p>
                      <span className="text-[10px] text-slate-400 mt-1 block">
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-slate-400 py-6 text-center">No activity recorded yet.</p>
            )}
          </div>
        </div>

        {/* Quick Launchpad & How it Works */}
        <div className="bg-slate-900/70 rounded-2xl p-6 border border-slate-800 flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-white mb-3 flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span>How the Closer Loop Works</span>
            </h2>
            <div className="space-y-3.5 text-xs text-slate-300">
              <div className="flex items-start space-x-3">
                <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">1</span>
                <p><strong className="text-white">Find Prospects:</strong> Search by niche and city. The system scrapes their websites for direct contact emails.</p>
              </div>
              <div className="flex items-start space-x-3">
                <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">2</span>
                <p><strong className="text-white">Cold Outreach:</strong> AI generates high-converting personalized pitches referencing their exact website.</p>
              </div>
              <div className="flex items-start space-x-3">
                <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">3</span>
                <p><strong className="text-white">Detect Inbound Reply:</strong> Client asks questions or raises objections (price, timing, trust).</p>
              </div>
              <div className="flex items-start space-x-3">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">4</span>
                <p><strong className="text-white">Close the Client:</strong> AI auto-negotiator answers objections, offers pilot discounts, and provides calendar/payment links until deal is marked <strong>Closed Won</strong>!</p>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800">
            <button
              onClick={() => onNavigate('conversations')}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold text-xs shadow-md flex items-center justify-center space-x-2 transition-all"
            >
              <span>Test Interactive Closer Simulator</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </div>

    </div>
  );
}
