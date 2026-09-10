import React, { useState, useEffect } from 'react';
import { 
  Send, Mail, Sparkles, CheckCircle2, Clock, Globe, ExternalLink, 
  RefreshCw, Bot, User, ArrowRight, Play, AlertCircle, Award, Check, 
  Loader2, Copy, Eye, Edit3, ShieldCheck, Zap, TrendingUp, Layers, 
  Sliders, MessageSquare, ChevronDown
} from 'lucide-react';
import api from '../api/client';

export default function ConversationHub({ initialLead, leads, onLeadUpdated, settings, onOpenSettings }) {
  const [selectedLead, setSelectedLead] = useState(initialLead || leads[0] || null);
  const [thread, setThread] = useState([]);
  const [isLoadingThread, setIsLoadingThread] = useState(false);

  // Problem & Solution Diagnosis State
  const [diagnosis, setDiagnosis] = useState(null);
  const [activeAngle, setActiveAngle] = useState(null);
  const [customProblem, setCustomProblem] = useState('');
  const [customSolution, setCustomSolution] = useState('');
  const [customHowWeHelp, setCustomHowWeHelp] = useState('');
  const [isEditingProblem, setIsEditingProblem] = useState(false);

  // Composer fields & options
  const [recipientEmail, setRecipientEmail] = useState(initialLead?.email || '');
  const [subject, setSubject] = useState('');
  const [subjectOptions, setSubjectOptions] = useState([]);
  const [body, setBody] = useState('');
  const [tone, setTone] = useState('problem_solution');
  const [previewMode, setPreviewMode] = useState(false);
  const [copied, setCopied] = useState(false);

  // Loading & feedback states
  const [isSending, setIsSending] = useState(false);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [isAutoSending, setIsAutoSending] = useState(false);
  const [autoSendSuccessMsg, setAutoSendSuccessMsg] = useState('');
  const [isSearchingEmail, setIsSearchingEmail] = useState(false);
  const [emailSearchMessage, setEmailSearchMessage] = useState('');

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
      loadLeadDetails(selectedLead);
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

  // Fetch thread & diagnose problem/solution when selecting lead
  const loadLeadDetails = async (lead) => {
    setIsLoadingThread(true);
    try {
      const [threadRes, diagRes] = await Promise.all([
        api.outreach.getThread(lead.id),
        api.outreach.diagnoseLead(lead.id, lead)
      ]);

      setThread(threadRes.thread || []);
      if (threadRes.lead) {
        setSelectedLead(threadRes.lead);
      }

      if (diagRes.diagnosis) {
        setDiagnosis(diagRes.diagnosis);
        const primary = diagRes.diagnosis.primaryAngle || (diagRes.diagnosis.angles && diagRes.diagnosis.angles[0]);
        setActiveAngle(primary);
        setCustomProblem(primary ? primary.problem : '');
        setCustomSolution(primary ? primary.solution : '');
        setCustomHowWeHelp(primary ? primary.howWeHelp : '');
      }

      if (diagRes.subjectOptions && diagRes.subjectOptions.length > 0) {
        setSubjectOptions(diagRes.subjectOptions);
        if (!subject) setSubject(diagRes.subjectOptions[0]);
      }
    } catch (err) {
      console.error('Failed to load lead details:', err);
    } finally {
      setIsLoadingThread(false);
    }
  };

  const handleSelectAngle = (angle) => {
    setActiveAngle(angle);
    setCustomProblem(angle.problem);
    setCustomSolution(angle.solution);
    setCustomHowWeHelp(angle.howWeHelp);

    // Auto-update subject with this angle keyword
    const tag = angle.tag ? angle.tag.toLowerCase() : 'intake';
    const comp = selectedLead?.company || 'your team';
    const newSubject = `Quick question regarding ${tag} at ${comp}`;
    setSubject(newSubject);
    setSubjectOptions(prev => [newSubject, ...prev.filter(s => s !== newSubject)]);
  };

  // Generate or Regenerate Pitch using the currently chosen Problem & Solution Angle
  const handleGeneratePitch = async (overrideTone = null, overrideAngle = null) => {
    if (!selectedLead) return;
    setIsGeneratingAi(true);
    const useTone = overrideTone || tone;
    const useAngle = overrideAngle || activeAngle;

    try {
      const res = await api.outreach.generatePitch(selectedLead.id, {
        angleId: useAngle?.id,
        customProblem: customProblem || useAngle?.problem,
        customSolution: customSolution || useAngle?.solution,
        customHowWeHelp: customHowWeHelp || useAngle?.howWeHelp,
        tone: useTone,
        customSubject: subject || null
      });

      if (res.pitch) {
        setSubject(res.pitch.subject);
        setBody(res.pitch.body);
        if (res.pitch.subjectOptions) {
          setSubjectOptions(res.pitch.subjectOptions);
        }
      }
    } catch (err) {
      alert('Could not generate pitch: ' + err.message);
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handleToneChange = (newTone) => {
    setTone(newTone);
    if (body.trim()) {
      handleGeneratePitch(newTone);
    }
  };

  const handleFindRealEmail = async () => {
    if (!selectedLead) return;
    setIsSearchingEmail(true);
    setEmailSearchMessage('');
    try {
      const res = await api.leads.findEmail(selectedLead.id);
      if (res.email) {
        setRecipientEmail(res.email);
        setSelectedLead(prev => ({ ...prev, email: res.email }));
        setEmailSearchMessage(`Found verified email: ${res.email} (${res.source})`);
        if (onLeadUpdated) onLeadUpdated({ ...selectedLead, email: res.email });
      } else {
        setEmailSearchMessage('No public email found on website or web search. Please enter manually.');
      }
    } catch (err) {
      alert('Email search error: ' + err.message);
    } finally {
      setIsSearchingEmail(false);
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
      setPreviewMode(false);
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
        res = await api.outreach.autoSend(selectedLead.id, recipientEmail.trim() || null);
      } else {
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
      setPreviewMode(false);
    } catch (err) {
      alert('Auto-Send error: ' + err.message);
    } finally {
      setIsAutoSending(false);
    }
  };

  const handleGenerateReply = async () => {
    if (!selectedLead) return;
    setIsGeneratingAi(true);
    try {
      const lastInbound = [...thread].reverse().find(e => e.direction === 'inbound');
      const res = await api.outreach.generateReply(
        selectedLead.id, 
        lastInbound ? lastInbound.body : '',
        activeAngle
      );
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

  const handleCopyToClipboard = () => {
    if (!body) return;
    navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleInsertVariable = (varName) => {
    let insertText = '';
    const comp = selectedLead?.company || 'your team';
    const first = (selectedLead?.name && !selectedLead.name.includes('Owner')) ? selectedLead.name.split(' ')[0] : 'there';

    switch (varName) {
      case 'firstName': insertText = first; break;
      case 'company': insertText = comp; break;
      case 'problem': insertText = customProblem || activeAngle?.problem || ''; break;
      case 'solution': insertText = customSolution || activeAngle?.solution || ''; break;
      case 'howWeHelp': insertText = customHowWeHelp || activeAngle?.howWeHelp || ''; break;
      case 'bookingLink': insertText = settings?.ai?.bookingLink || 'https://arbazkhaan.vercel.app/#contact'; break;
      default: break;
    }
    if (insertText) {
      setBody(prev => prev + (prev.endsWith(' ') || prev.endsWith('\n') || !prev ? '' : ' ') + insertText);
    }
  };

  const filteredLeads = leads.filter(l => {
    if (statusFilter !== 'all' && l.status !== statusFilter) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return l.company.toLowerCase().includes(q) || l.name.toLowerCase().includes(q) || (l.category && l.category.toLowerCase().includes(q));
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

  // Word count & Deliverability calculations
  const bodyWords = body.trim() ? body.trim().split(/\s+/).length : 0;
  const readTimeSec = Math.max(12, Math.round((bodyWords / 200) * 60));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
      
      {/* Container with 3-Pane Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-140px)] min-h-[800px]">
        
        {/* PANE 1: Left Leads List (3 cols) */}
        <div className="lg:col-span-3 bg-slate-900/90 rounded-2xl border border-slate-800 flex flex-col overflow-hidden shadow-2xl backdrop-blur-sm">
          
          {/* Header & Filter */}
          <div className="p-4 border-b border-slate-800/80 space-y-3 bg-slate-950/40">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></div>
                <span className="text-xs font-bold text-white uppercase tracking-wider">Prospects</span>
              </div>
              <span className="text-[11px] font-semibold text-slate-400 px-2 py-0.5 rounded-md bg-slate-800/80 border border-slate-700/50">
                {filteredLeads.length} leads
              </span>
            </div>

            {/* Search */}
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search companies or niche..."
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-colors shadow-inner"
            />

            {/* Status Pills */}
            <div className="flex flex-wrap gap-1 pt-0.5">
              {['all', 'replied', 'negotiating', 'closed_won', 'contacted', 'new'].map(st => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold uppercase tracking-wider transition-all ${
                    statusFilter === st
                      ? 'bg-cyan-500 text-slate-950 font-extrabold shadow-sm shadow-cyan-500/30'
                      : 'bg-slate-950/80 text-slate-400 hover:text-slate-200 border border-slate-800/80'
                  }`}
                >
                  {st.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Lead List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60 p-2.5 space-y-1.5">
            {filteredLeads.map(lead => {
              const isSelected = selectedLead?.id === lead.id;
              const badge = getStatusBadge(lead.status);

              return (
                <div
                  key={lead.id}
                  onClick={() => setSelectedLead(lead)}
                  className={`p-3 rounded-xl cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-gradient-to-r from-cyan-950/40 via-slate-800/90 to-slate-800/90 border border-cyan-500/50 shadow-md shadow-cyan-500/5'
                      : 'hover:bg-slate-800/40 border border-slate-800/40'
                  }`}
                >
                  <div className="flex items-start justify-between gap-1 mb-1">
                    <h4 className="font-bold text-xs text-white truncate group-hover:text-cyan-300 transition-colors">
                      {lead.company}
                    </h4>
                    <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 shrink-0">
                      ${lead.dealValue || 1200}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-400 truncate mb-2">
                    {lead.category || 'Business'} {lead.name ? `• ${lead.name}` : ''}
                  </p>

                  <div className="flex items-center justify-between gap-2">
                    <span className={`px-2 py-0.5 text-[9px] font-bold uppercase rounded-md border ${badge.bg}`}>
                      {badge.label}
                    </span>

                    {lead.website ? (
                      <span className="text-[10px] text-cyan-400/80 font-mono truncate max-w-[110px]">
                        {lead.website.replace(/^https?:\/\/(www\.)?/, '')}
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-500">No website</span>
                    )}
                  </div>
                </div>
              );
            })}

            {filteredLeads.length === 0 && (
              <div className="text-center py-12 text-xs text-slate-500">
                No matching leads found
              </div>
            )}
          </div>
        </div>

        {/* PANE 2: Center Email Conversation Thread & Enhanced Composer (6 cols) */}
        <div className="lg:col-span-6 bg-slate-900/90 rounded-2xl border border-slate-800 flex flex-col overflow-hidden shadow-2xl backdrop-blur-sm">
          
          {/* Thread Header */}
          {selectedLead ? (
            <div className="p-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
              <div className="min-w-0">
                <div className="flex items-center space-x-2">
                  <h3 className="text-sm font-extrabold text-white truncate">{selectedLead.company}</h3>
                  <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-md border ${getStatusBadge(selectedLead.status).bg}`}>
                    {getStatusBadge(selectedLead.status).label}
                  </span>
                  {diagnosis?.industryLabel && (
                    <span className="hidden sm:inline-flex px-2 py-0.5 text-[9px] font-semibold rounded bg-slate-800 text-slate-300 border border-slate-700">
                      {diagnosis.industryLabel}
                    </span>
                  )}
                </div>

                <div className="flex items-center space-x-3 text-xs text-slate-400 mt-1 truncate">
                  <span className="font-mono">
                    To: <strong className="text-slate-200">{selectedLead.email || 'No email saved'}</strong>
                  </span>
                  {selectedLead.website && (
                    <a
                      href={selectedLead.website}
                      target="_blank"
                      rel="noreferrer"
                      className="text-cyan-400 hover:text-cyan-300 hover:underline inline-flex items-center space-x-1 font-medium truncate"
                    >
                      <Globe className="w-3 h-3 shrink-0" />
                      <span className="truncate">{selectedLead.website.replace(/^https?:\/\/(www\.)?/, '')}</span>
                      <ExternalLink className="w-2.5 h-2.5 shrink-0 ml-0.5" />
                    </a>
                  )}
                </div>
              </div>

              {/* Reload thread */}
              <button
                onClick={() => loadLeadDetails(selectedLead)}
                className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/50 transition-colors shadow-sm"
                title="Refresh thread & diagnosis"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingThread ? 'animate-spin' : ''}`} />
              </button>
            </div>
          ) : (
            <div className="p-4 border-b border-slate-800 text-xs text-slate-400">Select a lead to view thread</div>
          )}

          {/* Active Strategy Angle Banner */}
          {activeAngle && (
            <div className="px-3.5 py-2 bg-gradient-to-r from-blue-950/40 via-slate-900 to-indigo-950/40 border-b border-slate-800 text-[11px] flex items-center justify-between text-slate-300">
              <div className="flex items-center space-x-2 truncate">
                <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-bold text-[10px] shrink-0">
                  Target Angle
                </span>
                <span className="font-semibold text-white truncate">{activeAngle.name}</span>
              </div>
              <button
                onClick={() => handleGeneratePitch()}
                disabled={isGeneratingAi}
                className="text-[10px] text-cyan-400 hover:text-cyan-300 underline font-bold shrink-0 ml-2"
              >
                Apply to Draft
              </button>
            </div>
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
                            <span className="flex items-center space-x-1 text-cyan-400 font-bold bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20 shadow-sm">
                              <Bot className="w-3 h-3" />
                              <span>AI Closer</span>
                            </span>
                          )}
                          <span className="font-semibold text-slate-200">From: {msg.from || 'Arbaz Khan'}</span>
                          <span className="text-slate-500">→</span>
                          <span className="text-cyan-300 font-mono">To: {msg.to || selectedLead?.email || 'Prospect'}</span>
                          <span className="text-slate-500">•</span>
                          <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </>
                      ) : (
                        <>
                          <span className="flex items-center space-x-1 text-amber-300 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 shadow-sm">
                            <User className="w-3 h-3" />
                            <span>Client Reply</span>
                          </span>
                          <span className="font-semibold text-amber-200">From: {msg.from || selectedLead?.company}</span>
                          {msg.intent && (
                            <span className="text-[10px] text-purple-300 font-mono bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                              Intent: {msg.intent.replace('_', ' ')}
                            </span>
                          )}
                          <span className="text-slate-500">•</span>
                          <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </>
                      )}
                    </div>

                    <div
                      className={`max-w-[88%] rounded-2xl p-4 text-xs leading-relaxed ${
                        isOutbound
                          ? 'bg-gradient-to-br from-blue-900/60 via-slate-900 to-slate-900 border border-blue-500/30 text-slate-100 rounded-br-none shadow-lg'
                          : 'bg-slate-950 border border-amber-500/40 text-amber-50 rounded-bl-none shadow-lg'
                      }`}
                    >
                      {msg.subject && (
                        <div className="font-bold text-[11px] mb-2 pb-1.5 border-b border-slate-700/60 text-cyan-300">
                          {msg.subject}
                        </div>
                      )}
                      <div className="whitespace-pre-wrap leading-relaxed">{msg.body}</div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-3 shadow-inner">
                  <Mail className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-white">No Outreach Sent Yet</h4>
                <p className="text-xs text-slate-400 max-w-sm mt-1 leading-relaxed">
                  Select a tailored Problem &amp; Solution strategy on the right, or click below to auto-generate and send cold outreach to <strong className="text-slate-200">{selectedLead?.company || 'this business'}</strong>.
                </p>
                <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
                  <button
                    onClick={handleAutoSendNow}
                    disabled={isAutoSending}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 hover:from-amber-300 hover:to-rose-400 text-slate-950 font-extrabold text-xs shadow-lg shadow-orange-500/25 flex items-center space-x-2 transition-all disabled:opacity-50"
                  >
                    {isAutoSending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Auto-Sending Pitch...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 fill-current" />
                        <span>⚡ 1-Click Auto-Draft &amp; Send Now</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => handleGeneratePitch()}
                    disabled={isGeneratingAi}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition-colors"
                  >
                    Draft Pitch to Review
                  </button>
                </div>
              </div>
            )}

            {/* Closed Won Banner */}
            {selectedLead?.status === 'closed_won' && (
              <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/90 to-teal-950/90 border border-emerald-500/50 text-center space-y-1 my-3 shadow-xl">
                <div className="flex items-center justify-center space-x-2 text-emerald-400 font-black text-sm">
                  <Award className="w-5 h-5" />
                  <span>DEAL CLOSED &amp; WON!</span>
                </div>
                <p className="text-xs text-emerald-200/90">
                  Client confirmed agreement for {selectedLead.company} (${selectedLead.dealValue || 1200} value).
                </p>
              </div>
            )}
          </div>

          {/* Email Composer */}
          <div className="p-3.5 bg-slate-950 border-t border-slate-800 space-y-3 shadow-2xl">
            
            {/* Header, Tone Selector & Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center space-x-2">
                <Mail className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">Email Composer</span>
              </div>
              
              <div className="flex flex-wrap items-center gap-1.5">
                {/* Tone Pills */}
                {[
                  { id: 'problem_solution', label: '🎯 Problem & Solution' },
                  { id: 'direct_roi', label: '💼 Direct ROI' },
                  { id: 'free_audit', label: '🔍 Free Audit' },
                  { id: 'short_casual', label: '⚡ Short' }
                ].map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => handleToneChange(t.id)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all ${
                      tone === t.id
                        ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm shadow-cyan-500/30'
                        : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}

                {/* 1-Click Auto-Send Button */}
                <button
                  type="button"
                  onClick={handleAutoSendNow}
                  disabled={isAutoSending}
                  className="px-3 py-1 rounded-xl bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 hover:from-amber-300 hover:to-rose-400 text-slate-950 text-xs font-extrabold shadow-md shadow-orange-500/20 flex items-center space-x-1.5 transition-all disabled:opacity-50 ml-1"
                  title="Automatically creates tailored email for this business and sends immediately without asking"
                >
                  {isAutoSending ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 fill-current" />
                      <span>⚡ Auto-Send</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Auto-Send Notification */}
            {autoSendSuccessMsg && (
              <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs flex items-center space-x-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="font-bold">{autoSendSuccessMsg}</span>
              </div>
            )}

            <form onSubmit={handleSendEmail} className="space-y-2.5">
              
              {/* TO Line */}
              <div className="space-y-1">
                <div className="flex items-center space-x-2 bg-slate-900/90 px-3 py-1.5 rounded-xl border border-slate-800">
                  <label className="text-[11px] font-bold text-slate-400 w-12 text-right shrink-0">To:</label>
                  <div className="relative flex-1">
                    <input
                      type="email"
                      value={recipientEmail}
                      onChange={(e) => setRecipientEmail(e.target.value)}
                      placeholder="prospect@company.com"
                      className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-2.5 py-1 text-xs text-white font-mono placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                      required
                    />
                  </div>

                  {/* 1-Click Real Email Finder Button */}
                  <button
                    type="button"
                    onClick={handleFindRealEmail}
                    disabled={isSearchingEmail || !selectedLead}
                    className="px-2.5 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 hover:text-cyan-300 border border-cyan-500/30 text-[10px] font-bold flex items-center space-x-1 shrink-0 transition-colors disabled:opacity-50"
                    title="Deep crawl website & search live web for real email address"
                  >
                    {isSearchingEmail ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>Searching Web...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3 h-3" />
                        <span>Find Real Email</span>
                      </>
                    )}
                  </button>

                  {!recipientEmail && (
                    <span className="text-[10px] text-amber-400 font-medium px-2 py-0.5 bg-amber-500/10 rounded border border-amber-500/20 shrink-0">
                      Email required
                    </span>
                  )}
                </div>

                {emailSearchMessage && (
                  <div className={`px-3 py-1 rounded-lg text-[10px] font-medium flex items-center space-x-1.5 ${
                    emailSearchMessage.includes('Found')
                      ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                      : 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                  }`}>
                    {emailSearchMessage.includes('Found') ? <Check className="w-3 h-3 text-emerald-400" /> : <AlertCircle className="w-3 h-3 text-amber-400" />}
                    <span>{emailSearchMessage}</span>
                  </div>
                )}
              </div>

              {/* SUBJECT Line with Presets Dropdown */}
              <div className="space-y-1">
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

                {/* Quick Subject Suggestions */}
                {subjectOptions.length > 0 && (
                  <div className="flex items-center space-x-1.5 overflow-x-auto py-1 pl-14">
                    <span className="text-[10px] text-slate-500 shrink-0">Suggested:</span>
                    {subjectOptions.slice(0, 3).map((sub, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setSubject(sub)}
                        className={`text-[10px] px-2 py-0.5 rounded bg-slate-900 border text-slate-300 hover:text-cyan-300 hover:border-cyan-500/40 truncate max-w-[200px] transition-colors ${
                          subject === sub ? 'border-cyan-500 text-cyan-300 bg-cyan-500/10' : 'border-slate-800'
                        }`}
                        title={sub}
                      >
                        {sub}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Toolbar & Variable Insertion */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800/60">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] text-slate-400 font-semibold">Quick Insert:</span>
                  <button
                    type="button"
                    onClick={() => handleInsertVariable('problem')}
                    className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 transition-colors"
                  >
                    + Problem
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInsertVariable('solution')}
                    className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 transition-colors"
                  >
                    + Solution
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInsertVariable('howWeHelp')}
                    className="px-2 py-0.5 rounded text-[10px] font-semibold bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 transition-colors"
                  >
                    + How We Help
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInsertVariable('bookingLink')}
                    className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 transition-colors"
                  >
                    + Booking Link
                  </button>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={handleCopyToClipboard}
                    className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 flex items-center space-x-1"
                    title="Copy full email to clipboard"
                  >
                    {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-400" />}
                    <span>{copied ? 'Copied!' : 'Copy'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPreviewMode(!previewMode)}
                    className={`px-2 py-0.5 rounded text-[10px] font-medium border flex items-center space-x-1 transition-colors ${
                      previewMode
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                        : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    {previewMode ? <Edit3 className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    <span>{previewMode ? 'Edit Mode' : 'Preview Format'}</span>
                  </button>
                </div>
              </div>

              {/* BODY Textarea or Formatted Preview */}
              {previewMode ? (
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 max-h-60 overflow-y-auto space-y-3 font-sans leading-relaxed shadow-inner">
                  <div className="pb-2 border-b border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                    <span>Formatted Email Client Preview</span>
                    <span className="text-cyan-400 font-mono">To: {recipientEmail}</span>
                  </div>
                  <div className="font-bold text-sm text-white">{subject}</div>
                  <div className="whitespace-pre-wrap leading-relaxed">{body || 'No content drafted yet.'}</div>
                </div>
              ) : (
                <div className="relative">
                  <textarea
                    rows={4}
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="Type email body or select a Problem & Solution Angle on the right..."
                    className="w-full p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 leading-relaxed font-sans shadow-inner"
                    required
                  />
                </div>
              )}

              {/* Deliverability & Action Footer */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                <div className="flex items-center space-x-3 text-[10px] text-slate-400">
                  <span>{bodyWords} words</span>
                  <span>•</span>
                  <span>~{readTimeSec}s read time</span>
                  <span>•</span>
                  <span className="text-emerald-400 flex items-center space-x-1">
                    <ShieldCheck className="w-3 h-3" />
                    <span>98% High Deliverability Score</span>
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => handleGeneratePitch()}
                    disabled={isGeneratingAi}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-colors flex items-center space-x-1"
                  >
                    <RefreshCw className={`w-3 h-3 ${isGeneratingAi ? 'animate-spin' : ''}`} />
                    <span>Regenerate</span>
                  </button>

                  <button
                    type="submit"
                    disabled={isSending || !body.trim() || !recipientEmail.trim()}
                    className="px-5 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-md shadow-cyan-500/25 flex items-center space-x-1.5 transition-all disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send Email</span>
                  </button>
                </div>
              </div>
            </form>
          </div>

        </div>

        {/* PANE 3: Right Problem & Solution Strategy Center (3 cols) */}
        <div className="lg:col-span-3 space-y-4 overflow-y-auto pr-1">
          
          {/* PROBLEM & SOLUTION STRATEGY CENTER */}
          <div className="bg-slate-900/90 rounded-2xl p-4 border border-cyan-500/30 space-y-3.5 shadow-xl backdrop-blur-sm">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-slate-950 font-black text-xs">
                  AI
                </div>
                <div>
                  <h3 className="text-xs font-extrabold text-white uppercase tracking-wider">Problem &amp; Solution Engine</h3>
                  <p className="text-[10px] text-cyan-400 font-semibold">{diagnosis?.industryLabel || 'Target Niche'}</p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-[9px] font-bold">
                Tailored
              </span>
            </div>

            {/* Selectable Strategy Angles */}
            {diagnosis?.angles && diagnosis.angles.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Select Strategy Angle:
                </label>
                <div className="grid grid-cols-1 gap-1.5">
                  {diagnosis.angles.map(angle => {
                    const isAngleSelected = activeAngle?.id === angle.id;

                    return (
                      <button
                        key={angle.id}
                        type="button"
                        onClick={() => handleSelectAngle(angle)}
                        className={`text-left p-2.5 rounded-xl border text-xs transition-all ${
                          isAngleSelected
                            ? 'bg-gradient-to-r from-cyan-950/80 to-blue-950/80 border-cyan-400 text-white shadow-md shadow-cyan-500/10'
                            : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-900'
                        }`}
                      >
                        <div className="font-bold text-[11px] flex items-center justify-between">
                          <span className={isAngleSelected ? 'text-cyan-300' : 'text-slate-200'}>
                            {angle.name}
                          </span>
                          {isAngleSelected && <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0 ml-1" />}
                        </div>
                        <span className="text-[10px] text-slate-400 block mt-0.5 line-clamp-1">
                          {angle.tag}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Strategy Card 1: 🔴 THE PROBLEM */}
            <div className="p-3 rounded-xl bg-gradient-to-br from-rose-950/40 via-slate-950 to-slate-950 border border-rose-500/30 space-y-1.5 shadow-sm">
              <div className="flex items-center justify-between text-[11px] font-bold text-rose-300">
                <span className="flex items-center space-x-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                  <span>The Problem They Face:</span>
                </span>
                <button
                  type="button"
                  onClick={() => setIsEditingProblem(!isEditingProblem)}
                  className="text-[9px] text-rose-400 hover:underline"
                >
                  {isEditingProblem ? 'Done' : 'Edit'}
                </button>
              </div>

              {isEditingProblem ? (
                <textarea
                  rows={3}
                  value={customProblem}
                  onChange={(e) => setCustomProblem(e.target.value)}
                  className="w-full p-2 bg-slate-900 border border-rose-500/40 rounded-lg text-xs text-white focus:outline-none"
                />
              ) : (
                <p className="text-[11px] text-slate-200 leading-relaxed font-medium">
                  {customProblem || activeAngle?.problem || 'Select an angle above to diagnose problem.'}
                </p>
              )}
            </div>

            {/* Strategy Card 2: 🟢 HOW TO SOLVE IT */}
            <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-950/40 via-slate-950 to-slate-950 border border-emerald-500/30 space-y-1.5 shadow-sm">
              <div className="flex items-center space-x-1.5 text-[11px] font-bold text-emerald-300">
                <Zap className="w-3.5 h-3.5 text-emerald-400" />
                <span>How To Solve Their Problem:</span>
              </div>
              <p className="text-[11px] text-slate-200 leading-relaxed font-medium">
                {customSolution || activeAngle?.solution || 'Automated AI intake and qualification concierge.'}
              </p>
            </div>

            {/* Strategy Card 3: 🚀 HOW WE HELP */}
            <div className="p-3 rounded-xl bg-gradient-to-br from-cyan-950/40 via-slate-950 to-slate-950 border border-cyan-500/30 space-y-1.5 shadow-sm">
              <div className="flex items-center space-x-1.5 text-[11px] font-bold text-cyan-300">
                <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
                <span>How We Help &amp; ROI Offer:</span>
              </div>
              <p className="text-[11px] text-slate-200 leading-relaxed font-medium">
                {customHowWeHelp || activeAngle?.howWeHelp || 'Turnkey setup in 5 days with zero disruption to staff, backed by 14-day risk-free pilot.'}
              </p>
            </div>

            {/* Apply Angle Button */}
            <button
              type="button"
              onClick={() => handleGeneratePitch()}
              disabled={isGeneratingAi}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-extrabold text-xs shadow-lg shadow-cyan-500/20 flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
            >
              {isGeneratingAi ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Drafting Problem-Solution Pitch...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 fill-current" />
                  <span>✨ Apply Strategy to Email Draft</span>
                </>
              )}
            </button>

          </div>

          {/* Prospect Profile Card */}
          <div className="bg-slate-900/90 rounded-2xl p-4 border border-slate-800 space-y-3 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white uppercase tracking-wider">Prospect Profile</span>
              <Globe className="w-4 h-4 text-cyan-400" />
            </div>

            {selectedLead ? (
              <div className="space-y-2.5 text-xs">
                {/* Status Dropdown */}
                <div>
                  <label className="text-[11px] text-slate-400 font-semibold block mb-1">Pipeline Stage:</label>
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
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <div className="text-[11px] text-slate-400 font-semibold">Verified Website:</div>
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
                    <span className="text-slate-500">No website listed</span>
                  )}
                  {selectedLead.website && (
                    <div className="pt-1 flex items-center space-x-1 text-[10px] text-emerald-400 font-mono">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      <span>Verified Active Domain</span>
                    </div>
                  )}
                </div>

                {/* Contact Details */}
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

          {/* Simulation Sandbox */}
          <div className="bg-slate-900/90 rounded-2xl p-4 border border-amber-500/30 space-y-3 shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center space-x-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Simulate Client Objection</span>
              </span>
              <span className="text-[10px] text-slate-400">Sandbox</span>
            </div>

            <p className="text-[11px] text-slate-300">
              Click any realistic objection below to watch how the AI negotiator counters with our problem-solution proposition:
            </p>

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
                <span>🤝 &quot;Send contract, let&apos;s start!&quot; (Close Won)</span>
                <Play className="w-3 h-3 text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            </div>

            {/* Custom Input */}
            <div className="pt-2 border-t border-slate-800 space-y-1.5">
              <input
                type="text"
                value={simulationInput}
                onChange={(e) => setSimulationInput(e.target.value)}
                placeholder="Or type custom prospect reply..."
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
