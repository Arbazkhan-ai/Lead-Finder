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
    { key: 'new', label: 'New Leads', count: breakdown.new, color: 'bg-blue-50/70 border-blue-200 text-blue-900', badge: 'bg-blue-100 text-blue-700' },
    { key: 'contacted', label: 'Outreach Sent', count: breakdown.contacted, color: 'bg-indigo-50/70 border-indigo-200 text-indigo-900', badge: 'bg-indigo-100 text-indigo-700' },
    { key: 'replied', label: 'Client Replied', count: breakdown.replied, color: 'bg-amber-50/70 border-amber-200 text-amber-900', badge: 'bg-amber-100 text-amber-700' },
    { key: 'negotiating', label: 'AI Negotiating', count: breakdown.negotiating, color: 'bg-purple-50/70 border-purple-200 text-purple-900', badge: 'bg-purple-100 text-purple-700' },
    { key: 'closed_won', label: 'Deals Closed Won', count: breakdown.closed_won, color: 'bg-emerald-50/70 border-emerald-200 text-emerald-900', badge: 'bg-emerald-100 text-emerald-700' }
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-white p-6 md:p-8 border border-slate-200 shadow-sm">
        <div className="absolute -right-10 -bottom-10 w-72 h-72 bg-blue-100/60 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold uppercase tracking-wider mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Full-Cycle Autonomous Prospecting</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
              Find Leads, Auto-Email &amp; Close Clients with AI
            </h1>
            <p className="text-slate-600 mt-2 text-sm md:text-base max-w-2xl leading-relaxed">
              Target prospective businesses by industry and location, scrape their verified websites and emails, and let the AI negotiator reply automatically back and forth until contracts are signed.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => onNavigate('finder')}
              className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-sm transition-all"
            >
              <Search className="w-4 h-4" />
              <span>Find New Leads</span>
            </button>
            <button
              onClick={() => onNavigate('conversations')}
              className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-medium text-sm border border-slate-300 shadow-sm transition-all"
            >
              <MessageSquare className="w-4 h-4 text-blue-600" />
              <span>Live AI Closer Hub</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        
        {/* Total Leads */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Leads</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-100">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 tracking-tight">{stats?.totalLeads || 0}</div>
          <p className="text-xs text-slate-500 mt-1 flex items-center">
            <span className="text-blue-600 font-semibold mr-1">Active database</span> in pipeline
          </p>
        </div>

        {/* Contacted */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Outreach Sent</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 border border-indigo-100">
              <Mail className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 tracking-tight">{stats?.contacted || 0}</div>
          <p className="text-xs text-slate-500 mt-1">Personalized cold pitches</p>
        </div>

        {/* Reply Rate */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Reply Rate</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600 border border-amber-100">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-amber-600 tracking-tight">{stats?.replyRate || 0}%</div>
          <p className="text-xs text-slate-500 mt-1">{stats?.replied || 0} prospects responded</p>
        </div>

        {/* Close Rate */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Close Rate</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-100">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-emerald-600 tracking-tight">{stats?.closeRate || 0}%</div>
          <p className="text-xs text-slate-500 mt-1">{stats?.closedWon || 0} deals finalized</p>
        </div>

        {/* Closed Revenue */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Won Revenue</span>
            <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center text-teal-600 border border-teal-100">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-teal-600 tracking-tight">
            ${(stats?.totalRevenueWon || 0).toLocaleString()}
          </div>
          <p className="text-xs text-slate-500 mt-1">Pipeline deal value</p>
        </div>

      </div>

      {/* Pipeline Funnel Stages */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">Live Pipeline Stages</h2>
            <p className="text-xs text-slate-500">Progression from discovery to closing the client</p>
          </div>
          <button
            onClick={() => onNavigate('pipeline')}
            className="text-xs text-blue-600 hover:text-blue-700 font-semibold inline-flex items-center space-x-1"
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
              className={`cursor-pointer rounded-xl p-4 ${stage.color} border transition-all hover:shadow-sm hover:border-blue-300`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold">{stage.label}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${stage.badge}`}>Step {idx + 1}</span>
              </div>
              <div className="text-2xl font-black text-slate-900">{stage.count}</div>
              <div className="text-[11px] text-slate-500 mt-2 flex items-center justify-between">
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
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
              <Clock className="w-4 h-4 text-blue-600" />
              <span>Real-Time Outreach &amp; AI Activity Log</span>
            </h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
              Live Stream
            </span>
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
            {stats?.recentLogs && stats.recentLogs.length > 0 ? (
              stats.recentLogs.map((log) => {
                let badgeColor = 'bg-blue-50 text-blue-700 border-blue-200';
                if (log.type === 'deal_closed') badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                if (log.type === 'reply_received') badgeColor = 'bg-amber-50 text-amber-800 border-amber-200';
                if (log.type === 'ai_negotiator') badgeColor = 'bg-purple-50 text-purple-700 border-purple-200';

                return (
                  <div key={log.id} className="flex items-start space-x-3 p-3 rounded-xl bg-slate-50/70 border border-slate-200/80">
                    <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded border ${badgeColor} shrink-0 mt-0.5`}>
                      {log.type.replace('_', ' ')}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-700 break-words">{log.message}</p>
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
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 mb-3 flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span>How the Closer Loop Works</span>
            </h2>
            <div className="space-y-3.5 text-xs text-slate-600">
              <div className="flex items-start space-x-3">
                <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">1</span>
                <p><strong className="text-slate-900">Find Prospects:</strong> Search by niche and city. The system scrapes their websites for direct contact emails.</p>
              </div>
              <div className="flex items-start space-x-3">
                <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">2</span>
                <p><strong className="text-slate-900">Cold Outreach:</strong> AI generates high-converting personalized pitches referencing their exact website.</p>
              </div>
              <div className="flex items-start space-x-3">
                <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">3</span>
                <p><strong className="text-slate-900">Detect Inbound Reply:</strong> Client asks questions or raises objections (price, timing, trust).</p>
              </div>
              <div className="flex items-start space-x-3">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">4</span>
                <p><strong className="text-slate-900">Close the Client:</strong> AI auto-negotiator answers objections, offers pilot discounts, and provides calendar/payment links until deal is marked <strong>Closed Won</strong>!</p>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100">
            <button
              onClick={() => onNavigate('conversations')}
              className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm flex items-center justify-center space-x-2 transition-all"
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
