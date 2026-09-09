import React, { useState } from 'react';
import { 
  Globe, Mail, Phone, ExternalLink, MessageSquare, Plus, 
  Trash2, Search, ArrowRight, DollarSign, Clock, CheckCircle2 
} from 'lucide-react';
import api from '../api/client';

const COLUMNS = [
  { id: 'new', title: 'New Leads', color: 'border-t-blue-500', badge: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  { id: 'contacted', title: 'Outreach Sent', color: 'border-t-indigo-500', badge: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' },
  { id: 'replied', title: 'Client Replied', color: 'border-t-amber-500', badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  { id: 'negotiating', title: 'In Negotiation', color: 'border-t-purple-500', badge: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
  { id: 'closed_won', title: 'Closed Won 🎉', color: 'border-t-emerald-500', badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  { id: 'closed_lost', title: 'Closed Lost', color: 'border-t-rose-500', badge: 'bg-rose-500/10 text-rose-400 border-rose-500/20' }
];

export default function PipelineBoard({ leads, onUpdateLead, onDeleteLead, onOpenConversation, onAddLead }) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredLeads = leads.filter(l => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      l.company?.toLowerCase().includes(q) ||
      l.name?.toLowerCase().includes(q) ||
      l.email?.toLowerCase().includes(q) ||
      l.website?.toLowerCase().includes(q)
    );
  });

  const handleStatusChange = async (leadId, nextStatus) => {
    try {
      await api.leads.update(leadId, { status: nextStatus });
      if (onUpdateLead) onUpdateLead(leadId, { status: nextStatus });
    } catch (err) {
      alert('Could not update status: ' + err.message);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Sales Pipeline & Lead Stages</h1>
          <p className="text-xs text-slate-400">Track client status from initial discovery to negotiation and closing</p>
        </div>

        <div className="flex items-center space-x-3">
          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filter leads..."
              className="pl-8 pr-3 py-1.5 text-xs rounded-xl bg-slate-900 border border-slate-700/80 text-white focus:outline-none focus:border-cyan-400 w-44 sm:w-56"
            />
          </div>

          <button
            onClick={onAddLead}
            className="px-3 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold shadow-md flex items-center space-x-1.5 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Manual Lead</span>
          </button>
        </div>
      </div>

      {/* Kanban Board Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 items-start overflow-x-auto pb-4">
        {COLUMNS.map(col => {
          const colLeads = filteredLeads.filter(l => l.status === col.id);

          return (
            <div
              key={col.id}
              className={`bg-slate-900/60 rounded-2xl p-3 border border-slate-800/90 border-t-4 ${col.color} min-w-[240px] flex flex-col`}
            >
              {/* Column Title */}
              <div className="flex items-center justify-between mb-3 px-1">
                <span className="text-xs font-bold text-slate-200 tracking-wide">{col.title}</span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                  {colLeads.length}
                </span>
              </div>

              {/* Cards List */}
              <div className="space-y-3 min-h-[400px]">
                {colLeads.map(lead => (
                  <div
                    key={lead.id}
                    className="bg-slate-950/80 hover:bg-slate-900 rounded-xl p-3.5 border border-slate-800 shadow-sm transition-all hover:border-slate-700 group flex flex-col justify-between"
                  >
                    <div>
                      {/* Top Row: Company & Value */}
                      <div className="flex items-start justify-between gap-1 mb-1.5">
                        <h4 className="font-bold text-white text-xs leading-snug truncate" title={lead.company}>
                          {lead.company}
                        </h4>
                        <span className="text-[11px] font-semibold text-emerald-400 shrink-0">
                          ${lead.dealValue || 1200}
                        </span>
                      </div>

                      {/* Contact Name */}
                      <p className="text-[11px] text-slate-400 mb-2 truncate">
                        {lead.name || 'Owner / Representative'}
                      </p>

                      {/* Website Badge (Requirement: "also show status and website") */}
                      {lead.website ? (
                        <div className="mb-2.5">
                          <a
                            href={lead.website}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center space-x-1 text-[11px] text-cyan-400 hover:text-cyan-300 hover:underline max-w-full truncate bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-500/20"
                            title={lead.website}
                          >
                            <Globe className="w-3 h-3 shrink-0" />
                            <span className="truncate">{lead.website.replace(/^https?:\/\/(www\.)?/, '')}</span>
                            <ExternalLink className="w-2.5 h-2.5 shrink-0 opacity-70" />
                          </a>
                        </div>
                      ) : (
                        <div className="text-[11px] text-slate-600 mb-2">No website</div>
                      )}

                      {/* Email snippet */}
                      <div className="text-[11px] text-slate-400 flex items-center space-x-1 truncate mb-2">
                        <Mail className="w-3 h-3 text-slate-500 shrink-0" />
                        <span className="truncate">{lead.email || 'No email'}</span>
                      </div>
                    </div>

                    {/* Actions & Stage Changer */}
                    <div className="pt-2 border-t border-slate-800/80 mt-2 flex items-center justify-between gap-1">
                      
                      {/* Open Conversation Thread */}
                      <button
                        onClick={() => onOpenConversation(lead)}
                        className="px-2 py-1 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 text-[11px] font-semibold border border-blue-500/30 flex items-center space-x-1 transition-colors"
                        title="Open email thread & AI Closer"
                      >
                        <MessageSquare className="w-3 h-3" />
                        <span>AI Closer</span>
                      </button>

                      {/* Stage Selector */}
                      <select
                        value={lead.status}
                        onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                        className="text-[10px] bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-slate-300 focus:outline-none cursor-pointer"
                      >
                        <option value="new">New</option>
                        <option value="contacted">Contacted</option>
                        <option value="replied">Replied</option>
                        <option value="negotiating">Negotiating</option>
                        <option value="closed_won">Won</option>
                        <option value="closed_lost">Lost</option>
                      </select>

                      {/* Delete */}
                      <button
                        onClick={() => onDeleteLead(lead.id)}
                        className="p-1 text-slate-500 hover:text-rose-400 transition-colors opacity-0 group-hover:opacity-100"
                        title="Delete lead"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>

                  </div>
                ))}

                {colLeads.length === 0 && (
                  <div className="h-32 border border-dashed border-slate-800 rounded-xl flex items-center justify-center text-slate-600 text-xs">
                    No leads in stage
                  </div>
                )}
              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
}
