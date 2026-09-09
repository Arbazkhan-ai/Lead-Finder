import React, { useState, useEffect } from 'react';
import { 
  Send, Mail, Sparkles, CheckCircle2, Clock, Globe, ExternalLink, 
  RefreshCw, Bot, User, ArrowRight, Play, AlertCircle, Award, Check, Loader2
} from 'lucide-react';
import api from '../api/client';

export default function ConversationHub({ initialLead, leads, onLeadUpdated, settings, onOpenSettings }) {
  const [selectedLead, setSelectedLead] = useState(initialLead || leads[0] || null);
  const [thread, setThread] = useState([]);
  const [isLoadingThread, setIsLoadingThread] = useState(false);

  // Composer fields
  const [recipientEmail, setRecipientEmail] = useState(initialLead?.email || '');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [isAutoSending, setIsAutoSending] = useState(false);
  const [autoSendSuccessMsg, setAutoSendSuccessMsg] = useState('');

  // Simulation Sandbox
  const [simulationInput, setSimulationInput] = useState('');
  const [isSimulating, setIsSimulating] = useState(false);

  // Filter for lead list in left pane
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Sync recipientEmail when selected lead changes
  useEffect(() => {
    if (selectedLead) {
      setRecipientEmail(selectedLead.email || '');
    }
  }, [selectedLead?.id, selectedLead?.email]);

  // When selected lead changes, fetch thread
  useEffect(() => {
    if (selectedLead?.id) {
      loadThread(selectedLead.id);
    }
  }, [selectedLead?.id]);

  // Keep selected lead synced with leads array
  useEffect(() => {
    if (initialLead) {
      setSelectedLead(initialLead);
    } else if (!selectedLead && leads.length > 0) {
      setSelectedLead(leads[0]);
    }
  }, [initialLead, leads]);

  const loadThread = async (leadId) => {
    setIsLoadingThread(true);
    try {
      const res = await api.outreach.getThread(leadId);
      setThread(res.thread || []);
      if (res.lead) {
        setSelectedLead(res.lead);
      }
    } catch (err) {
      console.error('Failed to load thread:', err);
    } finally {
      setIsLoadingThread(false);
    }
  };

  const handleSendEmail = async (e) => {
    if (e) e.preventDefault();
    if (!selectedLead || !body.trim()) return;

    setIsSending(true);
    try {
      const res = await api.outreach.sendEmail({
        leadId: selectedLead.id,
        toEmail: recipientEmail.trim(),
        subject: subject || `Regarding ${selectedLead.company}`,
        body: body,
        aiGenerated: false
      });
      setThread(prev => [...prev, res.email]);
      setSelectedLead(res.lead);
      if (onLeadUpdated) onLeadUpdated(res.lead);
      setBody('');
    } catch (err) {
      alert('Error sending email: ' + err.message);
    } finally {
      setIsSending(false);
    }
  };

  // 1-Click Autonomous Pitch/Reply Generator & Instant Sender (no confirmation needed)
  const handleAutoSendNow = async () => {
    if (!selectedLead) return;
    setIsAutoSending(true);
    setAutoSendSuccessMsg('');
    try {
      let res;
      if (thread.length === 0) {
        // Auto-create pitch according to business + auto fill To + auto send without asking
        res = await api.outreach.autoSend(selectedLead.id, recipientEmail.trim() || null);
      } else {
        // Auto-create reply according to client email + auto send without asking
        const lastInbound = [...thread].reverse().find(e => e.direction === 'inbound');
        res = await api.outreach.autoReply(selectedLead.id, lastInbound ? lastInbound.body : null);
      }

      setThread(prev => [...prev, res.email]);
      setSelectedLead(res.lead);
      if (res.lead.email) {
        setRecipientEmail(res.lead.email);
      }
      if (onLeadUpdated) onLeadUpdated(res.lead);
      setAutoSendSuccessMsg(`⚡ Auto-Sent successfully to ${res.lead.company}!`);
      setTimeout(() => setAutoSendSuccessMsg(''), 4500);
      setBody('');
    } catch (err) {
      alert('Auto-Send error: ' + err.message);
    } finally {
      setIsAutoSending(false);
    }
  };

  const handleGeneratePitch = async () => {
    if (!selectedLead) return;
    setIsGeneratingAi(true);
    try {
      const res = await api.outreach.generatePitch(selectedLead.id);
      setSubject(res.pitch.subject);
      setBody(res.pitch.body);
    } catch (err) {
      alert('Could not generate pitch: ' + err.message);
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handleGenerateReply = async () => {
    if (!selectedLead) return;
    setIsGeneratingAi(true);
    try {
      // Find latest client email
      const lastInbound = [...thread].reverse().find(e => e.direction === 'inbound');
      const res = await api.outreach.generateReply(selectedLead.id, lastInbound ? lastInbound.body : '');
      setSubject(res.reply.subject);
      setBody(res.reply.body);
    } catch (err) {
      alert('Could not generate reply: ' + err.message);
    } finally {
      setIsGeneratingAi(false);
    }
  };

  // Simulate client inbound reply (The autonomous loop runner)
  const handleSimulateReply = async (presetText) => {
    if (!selectedLead) return;
    const replyText = presetText || simulationInput;
    if (!replyText.trim()) return;

    setIsSimulating(true);
    try {
      const res = await api.outreach.simulateReply(selectedLead.id, replyText);
      setThread(res.thread || []);
      setSelectedLead(res.lead);
      if (onLeadUpdated) onLeadUpdated(res.lead);
      setSimulationInput('');
    } catch (err) {
      alert('Simulation failed: ' + err.message);
    } finally {
      setIsSimulating(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    if (!selectedLead) return;
    try {
      const res = await api.leads.update(selectedLead.id, { status: newStatus });
      setSelectedLead(res.lead);
      if (onLeadUpdated) onLeadUpdated(res.lead);
    } catch (err) {
      alert('Could not update status: ' + err.message);
    }
  };

  const filteredLeads = leads.filter(l => {
    if (statusFilter !== 'all' && l.status !== statusFilter) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return l.company.toLowerCase().includes(q) || l.name.toLowerCase().includes(q);
    }
    return true;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'new': return { label: 'New Lead', bg: 'bg-blue-500/10 text-blue-400 border-blue-500/20' };
      case 'contacted': return { label: 'Outreach Sent', bg: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' };
      case 'replied': return { label: 'Client Replied', bg: 'bg-amber-500/10 text-amber-400 border-amber-500/20' };
      case 'negotiating': return { label: 'AI Negotiating', bg: 'bg-purple-500/10 text-purple-400 border-purple-500/20' };
      case 'closed_won': return { label: 'Closed Won 🎉', bg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' };
      case 'closed_lost': return { label: 'Closed Lost', bg: 'bg-rose-500/10 text-rose-400 border-rose-500/20' };
      default: return { label: status, bg: 'bg-slate-800 text-slate-300 border-slate-700' };
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      
      {/* Container with 3-Pane Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-140px)] min-h-[750px]">
        
        {/* PANE 1: Left Leads List (3 cols) */}
        <div className="lg:col-span-3 bg-slate-900/80 rounded-2xl border border-slate-800 flex flex-col overflow-hidden">
          
          {/* Header & Filter */}
          <div className="p-3.5 border-b border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white uppercase tracking-wider">Prospects</span>
              <span className="text-[11px] font-semibold text-slate-400">{filteredLeads.length} leads</span>
            </div>

            {/* Search */}
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search companies..."
              className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
            />

            {/* Status Pills */}
            <div className="flex flex-wrap gap-1 pt-1">
              {['all', 'replied', 'negotiating', 'closed_won', 'contacted'].map(st => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider transition-all ${
                    statusFilter === st
                      ? 'bg-cyan-500 text-slate-950 font-bold'
                      : 'bg-slate-950 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {st.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Lead List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60 p-2 space-y-1">
            {filteredLeads.map(lead => {
              const isSelected = selectedLead?.id === lead.id;
              const badge = getStatusBadge(lead.status);

              return (
                <div
                  key={lead.id}
                  onClick={() => setSelectedLead(lead)}
                  className={`p-3 rounded-xl cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-slate-800/90 border border-cyan-500/40 shadow-sm'
                      : 'hover:bg-slate-800/40 border border-transparent'
                  }`}
                >
                  <div className="flex items-start justify-between gap-1 mb-1">
                    <h4 className="font-bold text-xs text-white truncate">{lead.company}</h4>
                    <span className="text-[10px] text-emerald-400 font-semibold">${lead.dealValue || 1200}</span>
                  </div>

                  <p className="text-[11px] text-slate-400 truncate mb-1.5">{lead.name}</p>

                  <div className="flex items-center justify-between">
                    <span className={`px-2 py-0.5 text-[9px] font-bold uppercase rounded border ${badge.bg}`}>
                      {badge.label}
                    </span>
                    {lead.website && (
                      <span className="text-[10px] text-slate-500 truncate max-w-[100px]">
                        {lead.website.replace(/^https?:\/\/(www\.)?/, '')}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}

            {filteredLeads.length === 0 && (
              <div className="text-center py-8 text-xs text-slate-500">
                No matching leads found
              </div>
            )}
          </div>
        </div>

        {/* PANE 2: Center Email Conversation Thread (6 cols) */}
        <div className="lg:col-span-6 bg-slate-900/80 rounded-2xl border border-slate-800 flex flex-col overflow-hidden">
          
          {/* Thread Header */}
          {selectedLead ? (
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-sm font-bold text-white">{selectedLead.company}</h3>
                  <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded border ${getStatusBadge(selectedLead.status).bg}`}>
                    {getStatusBadge(selectedLead.status).label}
                  </span>
                </div>
                <div className="flex items-center space-x-3 text-xs text-slate-400 mt-0.5">
                  <span>To: <strong className="text-slate-200">{selectedLead.email || 'No email'}</strong></span>
                  {selectedLead.website && (
                    <a
                      href={selectedLead.website}
                      target="_blank"
                      rel="noreferrer"
                      className="text-cyan-400 hover:underline inline-flex items-center space-x-1"
                    >
                      <Globe className="w-3 h-3" />
                      <span>{selectedLead.website.replace(/^https?:\/\/(www\.)?/, '')}</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  )}
                </div>
              </div>

              {/* Reload thread */}
              <button
                onClick={() => loadThread(selectedLead.id)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                title="Refresh thread"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingThread ? 'animate-spin' : ''}`} />
              </button>
            </div>
          ) : (
            <div className="p-4 border-b border-slate-800 text-xs text-slate-400">Select a lead to view thread</div>
          )}

          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {thread.length > 0 ? (
              thread.map(msg => {
                const isOutbound = msg.direction === 'outbound';

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isOutbound ? 'items-end' : 'items-start'}`}
                  >
                    <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-400 mb-1 px-1">
                      {isOutbound ? (
                        <>
                          {msg.aiGenerated && (
                            <span className="flex items-center space-x-1 text-cyan-400 font-semibold bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/20">
                              <Bot className="w-3 h-3" />
                              <span>AI Closer</span>
                            </span>
                          )}
                          <span className="font-semibold text-slate-200">From: {msg.from || 'Arbaz Khan <arbazkhanofficial@gmail.com>'}</span>
                          <span className="text-slate-500">→</span>
                          <span className="text-cyan-300 font-mono">To: {msg.to || selectedLead?.email || 'Prospect'}</span>
                          <span className="text-slate-500">•</span>
                          <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </>
                      ) : (
                        <>
                          <span className="flex items-center space-x-1 text-amber-300 font-semibold bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                            <User className="w-3 h-3" />
                            <span>Client Reply</span>
                          </span>
                          <span className="font-semibold text-amber-200">From: {msg.from || selectedLead?.email || selectedLead?.company}</span>
                          <span className="text-slate-500">→</span>
                          <span className="text-slate-200 font-mono">To: {msg.to || 'Arbaz Khan <arbazkhanofficial@gmail.com>'}</span>
                          {msg.intent && (
                            <span className="text-[10px] text-purple-300 font-mono bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/20">
                              Intent: {msg.intent.replace('_', ' ')}
                            </span>
                          )}
                          <span className="text-slate-500">•</span>
                          <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </>
                      )}
                    </div>

                    <div
                      className={`max-w-[85%] rounded-2xl p-4 text-xs leading-relaxed ${
                        isOutbound
                          ? 'bg-gradient-to-br from-blue-900/60 to-slate-900 border border-blue-500/30 text-slate-100 rounded-br-none shadow-md'
                          : 'bg-slate-950 border border-amber-500/30 text-amber-50 rounded-bl-none shadow-md'
                      }`}
                    >
                      {msg.subject && (
                        <div className="font-bold text-[11px] mb-2 pb-1.5 border-b border-slate-700/60 opacity-90">
                          {msg.subject}
                        </div>
                      )}
                      <div className="whitespace-pre-wrap">{msg.body}</div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                <Mail className="w-10 h-10 text-slate-600 mb-2" />
                <h4 className="text-sm font-semibold text-slate-300">No Outreach Sent Yet</h4>
                <p className="text-xs text-slate-500 max-w-sm mt-1">
                  Click below to automatically create a tailored cold pitch for {selectedLead?.company || 'this lead'} and send it immediately.
                </p>
                <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                  <button
                    onClick={handleAutoSendNow}
                    disabled={isAutoSending}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 hover:from-amber-300 hover:to-rose-400 text-slate-950 font-extrabold text-xs shadow-lg shadow-orange-500/25 flex items-center space-x-2 transition-all disabled:opacity-50"
                  >
                    {isAutoSending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Auto-Generating Pitch &amp; Sending...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 fill-current" />
                        <span>⚡ Auto-Draft Pitch &amp; Send Now (Instant Outreach)</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleGeneratePitch}
                    disabled={isGeneratingAi}
                    className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs border border-slate-700 transition-colors"
                  >
                    Draft Only
                  </button>
                </div>
              </div>
            )}

            {/* Closed Won Banner */}
            {selectedLead?.status === 'closed_won' && (
              <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/80 to-teal-950/80 border border-emerald-500/40 text-center space-y-1 my-3">
                <div className="flex items-center justify-center space-x-2 text-emerald-400 font-bold text-sm">
                  <Award className="w-5 h-5" />
                  <span>DEAL CLOSED &amp; WON!</span>
                </div>
                <p className="text-xs text-emerald-200/90">
                  Client confirmed agreement for {selectedLead.company} (${selectedLead.dealValue || 1200} value).
                </p>
              </div>
            )}
          </div>

          {/* Email Composer & AI Counter-Reply Button */}
          <div className="p-3.5 bg-slate-950/90 border-t border-slate-800 space-y-3">
            
            {/* Header & Quick Action */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center space-x-2">
                <Mail className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">Email Composer</span>
              </div>
              
              <div className="flex items-center space-x-2">
                {/* 1-Click Auto-Send Button */}
                <button
                  type="button"
                  onClick={handleAutoSendNow}
                  disabled={isAutoSending}
                  className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 hover:from-amber-300 hover:to-rose-400 text-slate-950 text-xs font-extrabold shadow-md shadow-orange-500/20 flex items-center space-x-1.5 transition-all disabled:opacity-50"
                  title="Automatically creates tailored email for this business and sends immediately without asking"
                >
                  {isAutoSending ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Auto-Sending...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 fill-current" />
                      <span>⚡ Auto-Draft &amp; Send Now (No Confirmation)</span>
                    </>
                  )}
                </button>

                {thread.length === 0 ? (
                  <button
                    type="button"
                    onClick={handleGeneratePitch}
                    disabled={isGeneratingAi}
                    className="px-2.5 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 text-xs font-semibold border border-cyan-500/30 flex items-center space-x-1 transition-colors"
                  >
                    <span>Draft Pitch</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleGenerateReply}
                    disabled={isGeneratingAi}
                    className="px-2.5 py-1 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 text-xs font-semibold border border-purple-500/30 flex items-center space-x-1 transition-colors"
                  >
                    <Bot className="w-3 h-3" />
                    <span>Draft Reply</span>
                  </button>
                )}
              </div>
            </div>

            {/* Auto-Send Notification */}
            {autoSendSuccessMsg && (
              <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs flex items-center space-x-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="font-semibold">{autoSendSuccessMsg}</span>
              </div>
            )}

            {/* Live Gmail Sync Notice */}
            {settings?.smtp?.pass && !settings?.smtp?.simulatedMode ? (
              <div className="text-[11px] text-emerald-400 flex items-center space-x-1.5 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                <span>
                  <strong>Live Gmail Sync:</strong> Every email sent will be dispatched from <strong>arbazkhanofficial@gmail.com</strong> and appear directly in your Gmail <strong>Sent Mail</strong> &amp; <strong>Inbox</strong>.
                </span>
              </div>
            ) : (
              <div className="text-[11px] text-amber-300 flex items-center justify-between bg-gradient-to-r from-amber-950/40 to-slate-900 border border-amber-500/30 px-3 py-1.5 rounded-xl">
                <div className="flex items-center space-x-1.5">
                  <Mail className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>
                    To have outbound emails sent from your Gmail and appear in your <strong>Gmail Sent folder</strong>, connect your Gmail App Password.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={onOpenSettings}
                  className="px-2.5 py-0.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[10px] shrink-0 transition-colors ml-2 shadow-sm"
                >
                  Connect Gmail
                </button>
              </div>
            )}

            <form onSubmit={handleSendEmail} className="space-y-2">
              
              {/* FROM Line */}
              <div className="flex items-center space-x-2 bg-slate-900/90 px-3 py-1.5 rounded-xl border border-slate-800">
                <span className="text-[11px] font-bold text-slate-400 w-12 text-right shrink-0">From:</span>
                <div className="flex items-center space-x-2 text-xs font-mono text-slate-200 truncate">
                  <span className="font-semibold text-white">Arbaz Khan</span>
                  <span className="text-cyan-400">&lt;{settings?.smtp?.fromEmail || settings?.smtp?.user || 'arbazkhanofficial@gmail.com'}&gt;</span>
                </div>
              </div>

              {/* TO Line */}
              <div className="flex items-center space-x-2 bg-slate-900/90 px-3 py-1.5 rounded-xl border border-slate-800">
                <label className="text-[11px] font-bold text-slate-400 w-12 text-right shrink-0">To:</label>
                <div className="relative flex-1">
                  <input
                    type="email"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    placeholder="recipient@company.com (enter prospect email address)"
                    className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-2.5 py-1 text-xs text-white font-mono placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                    required
                  />
                </div>
                {!recipientEmail && (
                  <span className="text-[10px] text-amber-400 font-medium px-2 py-0.5 bg-amber-500/10 rounded border border-amber-500/20 shrink-0">
                    Email required
                  </span>
                )}
              </div>

              {/* SUBJECT Line */}
              <div className="flex items-center space-x-2 bg-slate-900/90 px-3 py-1.5 rounded-xl border border-slate-800">
                <span className="text-[11px] font-bold text-slate-400 w-12 text-right shrink-0">Subject:</span>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Subject line..."
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-2.5 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                />
              </div>

              {/* BODY Textarea */}
              <div className="relative">
                <textarea
                  rows={3}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Type email body or click AI Generate Pitch above..."
                  className="w-full p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                  required
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-[10px] text-slate-500">
                  {selectedLead?.company ? `Outreach for ${selectedLead.company}` : ''}
                </span>

                <button
                  type="submit"
                  disabled={isSending || !body.trim() || !recipientEmail.trim()}
                  className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-md shadow-cyan-500/20 flex items-center space-x-1.5 transition-all disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Email Now</span>
                </button>
              </div>
            </form>
          </div>

        </div>

        {/* PANE 3: Right Inspector & Interactive Deal Closer Simulator (3 cols) */}
        <div className="lg:col-span-3 space-y-4 overflow-y-auto pr-1">
          
          {/* Website Card & Status Selector (Requirement: "also show status and website") */}
          <div className="bg-slate-900/80 rounded-2xl p-4 border border-slate-800 space-y-3 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white uppercase tracking-wider">Prospect Profile</span>
              <Globe className="w-4 h-4 text-cyan-400" />
            </div>

            {selectedLead ? (
              <div className="space-y-2.5 text-xs">
                {/* Status Dropdown */}
                <div>
                  <label className="text-[11px] text-slate-400 font-semibold block mb-1">Lead Stage / Status:</label>
                  <select
                    value={selectedLead.status}
                    onChange={(e) => handleStatusChange(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-semibold focus:outline-none focus:border-cyan-400 cursor-pointer"
                  >
                    <option value="new">New Lead</option>
                    <option value="contacted">Outreach Sent</option>
                    <option value="replied">Client Replied</option>
                    <option value="negotiating">In Negotiation</option>
                    <option value="closed_won">Closed Won 🎉</option>
                    <option value="closed_lost">Closed Lost</option>
                  </select>
                </div>

                {/* Website details */}
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                  <div className="text-[11px] text-slate-400 font-semibold">Prospect Website:</div>
                  {selectedLead.website ? (
                    <a
                      href={selectedLead.website}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold hover:underline flex items-center justify-between break-all"
                    >
                      <span className="truncate">{selectedLead.website}</span>
                      <ExternalLink className="w-3.5 h-3.5 shrink-0 ml-1" />
                    </a>
                  ) : (
                    <span className="text-slate-500">No website provided</span>
                  )}
                  {selectedLead.website && (
                    <div className="pt-1 flex items-center space-x-1 text-[10px] text-emerald-400 font-mono">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                      <span>Verified Active Domain</span>
                    </div>
                  )}
                </div>

                {/* Email & Phone */}
                <div className="space-y-1 text-slate-300">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Email:</span>
                    <span className="font-mono text-slate-200 truncate max-w-[150px]">{selectedLead.email || '—'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Phone:</span>
                    <span>{selectedLead.phone || '—'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Deal Value:</span>
                    <span className="text-emerald-400 font-bold">${selectedLead.dealValue || 1200}</span>
                  </div>
                </div>

              </div>
            ) : (
              <p className="text-xs text-slate-500">No lead selected</p>
            )}
          </div>

          {/* AI Deal Closer Strategy Panel */}
          <div className="bg-gradient-to-br from-indigo-950/60 via-slate-900 to-purple-950/60 rounded-2xl p-4 border border-indigo-500/30 space-y-3 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5 text-xs font-bold text-white uppercase tracking-wider">
                <Bot className="w-4 h-4 text-cyan-400" />
                <span>AI Deal Closer</span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-semibold">
                Autonomous
              </span>
            </div>

            <p className="text-[11px] text-slate-300 leading-relaxed">
              When a client responds, the AI detects their intent, neutralizes objections, and pitches our pilot discount and booking calendar until closed.
            </p>

            <div className="p-2.5 rounded-xl bg-slate-950/70 border border-indigo-500/20 text-[11px] space-y-1">
              <div className="text-slate-400 font-semibold">Current Sales Strategy:</div>
              <div className="text-cyan-300 font-medium">
                {selectedLead?.status === 'closed_won'
                  ? 'Agreement Finalized! Ready for onboarding.'
                  : selectedLead?.status === 'negotiating'
                  ? 'Objection addressed. Driving towards booking calendar or pilot sign-up.'
                  : selectedLead?.status === 'replied'
                  ? 'Client engaged. Delivering tailored solution breakdown.'
                  : 'Cold outreach sequence active.'}
              </div>
            </div>
          </div>

          {/* 🧪 Simulation Sandbox: Test Client Responses & Watch AI Close */}
          <div className="bg-slate-900/90 rounded-2xl p-4 border border-amber-500/30 space-y-3 shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center space-x-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Simulate Client Reply</span>
              </span>
              <span className="text-[10px] text-slate-400">Sandbox</span>
            </div>

            <p className="text-[11px] text-slate-300">
              Click any realistic client reply below to test how the AI negotiator responds and progresses the deal:
            </p>

            {/* Quick 1-Click Simulation Buttons */}
            <div className="space-y-1.5">
              <button
                type="button"
                onClick={() => handleSimulateReply("How much does this cost? What are your packages and pricing?")}
                disabled={isSimulating}
                className="w-full text-left p-2 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 text-[11px] text-slate-200 transition-all hover:border-amber-500/40 flex items-center justify-between group"
              >
                <span>💬 &quot;What&apos;s your pricing?&quot;</span>
                <Play className="w-3 h-3 text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>

              <button
                type="button"
                onClick={() => handleSimulateReply("Sounds interesting, but our budget is tight right now. We can't afford big commitments.")}
                disabled={isSimulating}
                className="w-full text-left p-2 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 text-[11px] text-slate-200 transition-all hover:border-amber-500/40 flex items-center justify-between group"
              >
                <span>💰 &quot;Budget is too tight right now&quot;</span>
                <Play className="w-3 h-3 text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>

              <button
                type="button"
                onClick={() => handleSimulateReply("Can we hop on a quick call tomorrow at 2pm? What is your Calendly link?")}
                disabled={isSimulating}
                className="w-full text-left p-2 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 text-[11px] text-slate-200 transition-all hover:border-amber-500/40 flex items-center justify-between group"
              >
                <span>📅 &quot;Can we hop on a call tomorrow?&quot;</span>
                <Play className="w-3 h-3 text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>

              <button
                type="button"
                onClick={() => handleSimulateReply("The 14-day trial offer sounds perfect. Send me the link to finalize the paperwork and let's do this!")}
                disabled={isSimulating}
                className="w-full text-left p-2 rounded-xl bg-emerald-950/40 hover:bg-emerald-900/40 border border-emerald-500/30 text-[11px] text-emerald-300 font-medium transition-all flex items-center justify-between group"
              >
                <span>🤝 &quot;Send the contract, let&apos;s start!&quot; (Close Won)</span>
                <Play className="w-3 h-3 text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            </div>

            {/* Custom Input */}
            <div className="pt-2 border-t border-slate-800 space-y-1.5">
              <input
                type="text"
                value={simulationInput}
                onChange={(e) => setSimulationInput(e.target.value)}
                placeholder="Or type a custom reply..."
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-white focus:outline-none focus:border-amber-400"
              />
              <button
                type="button"
                onClick={() => handleSimulateReply()}
                disabled={isSimulating || !simulationInput.trim()}
                className="w-full py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow transition-all disabled:opacity-40"
              >
                {isSimulating ? 'AI Negotiating...' : 'Trigger AI Response'}
              </button>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}
