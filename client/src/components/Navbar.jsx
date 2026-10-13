import React from 'react';
import { Search, Send, Layers, Settings, Sparkles, Activity, CheckCircle2, FileSpreadsheet } from 'lucide-react';
import api from '../api/client';

export default function Navbar({ activeTab, setActiveTab, settings, onOpenSettings, stats }) {
  const handleQuickExportPipeline = async () => {
    try {
      const res = await api.leads.exportExcel({ query: 'pipeline_leads' });
      if (res.excelFile?.downloadUrl) {
        const link = document.createElement('a');
        link.href = res.excelFile.downloadUrl;
        link.setAttribute('download', res.excelFile.fileName);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (err) {
      alert('Export note: ' + err.message);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-xl border-b border-slate-200/90 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Branding */}
          <div className="flex items-center space-x-3 cursor-pointer group" onClick={() => setActiveTab('dashboard')}>
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-lg text-slate-900 tracking-tight">
                  LeadsFlow <span className="text-blue-600">AI</span>
                </span>
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  Multi-Scraper + Closer
                </span>
              </div>
              <p className="text-[11px] text-slate-500 hidden sm:block">Websites • Facebook • Instagram • LinkedIn • Auto-Excel</p>
            </div>
          </div>

          {/* Nav Tabs */}
          <nav className="flex items-center space-x-1 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
              }`}
            >
              <Activity className="w-4 h-4" />
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => setActiveTab('finder')}
              className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                activeTab === 'finder'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
              }`}
            >
              <Search className="w-4 h-4" />
              <span>Multi-Scraper</span>
            </button>

            <button
              onClick={() => setActiveTab('pipeline')}
              className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                activeTab === 'pipeline'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Pipeline</span>
              {stats?.totalLeads > 0 && (
                <span className={`ml-1 px-1.5 py-0.2 text-[11px] rounded-full font-extrabold ${
                  activeTab === 'pipeline' ? 'bg-white/25 text-white' : 'bg-slate-200 text-slate-700'
                }`}>
                  {stats.totalLeads}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('conversations')}
              className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                activeTab === 'conversations'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
              }`}
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">AI Closer Hub</span>
              {stats?.replied > 0 && (
                <span className="ml-1 px-1.5 py-0.2 text-[10px] rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                  {stats.replied}
                </span>
              )}
            </button>
          </nav>

          {/* Right Controls: Export Pipeline Excel, Autopilot Status & Settings */}
          <div className="flex items-center space-x-2.5">
            {stats?.totalLeads > 0 && (
              <button
                onClick={handleQuickExportPipeline}
                className="hidden lg:inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 text-xs font-bold transition-all"
                title="Download all pipeline leads as an Excel (.xlsx) workbook"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600" />
                <span>Pipeline .xlsx</span>
              </button>
            )}

            <div className="hidden sm:flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Autopilot ON</span>
            </div>

            {stats?.closedWon > 0 && (
              <div className="hidden md:flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>{stats.closedWon} Won</span>
              </div>
            )}

            <button
              onClick={onOpenSettings}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 border border-slate-200 transition-colors"
              title="Configure SMTP, AI Offer, and Closing Prompts"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>

        </div>
      </div>
    </header>
  );
}
