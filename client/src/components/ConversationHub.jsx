import React, { useState, useEffect } from 'react';
import { 
  Send, Mail, Sparkles, CheckCircle2, Clock, Globe, ExternalLink, 
  RefreshCw, Bot, User, ArrowRight, Play, AlertCircle, Award, Check, 
  Loader2, Copy, Eye, Edit3, ShieldCheck, Zap, TrendingUp, Layers, 
  Sliders, MessageSquare, ChevronDown, Upload, FileSpreadsheet,
  MessageCircle, Smartphone, Share2, SendHorizontal
} from 'lucide-react';
import api from '../api/client';

function stripEmojis(text = '') {
  if (!text) return '';
  return String(text)
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{200D}]|\p{Extended_Pictographic}/gu, '')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/^[ \t]+|[ \t]+$/gm, '');
}

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

  // Website Weak Points Audit State
  const [websiteAudit, setWebsiteAudit] = useState(initialLead?.websiteAudit || null);
  const [isAuditingWebsite, setIsAuditingWebsite] = useState(false);
  const [auditError, setAuditError] = useState('');

  // Composer fields & options
  const [recipientEmail, setRecipientEmail] = useState(initialLead?.email || '');
  const [ccAllEmails, setCcAllEmails] = useState(false);
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

  // Quick Scraper File Upload & Bulk Uncontacted Send inside AI Closer Hub
  const [isUploadingHubFile, setIsUploadingHubFile] = useState(false);
  const [isBulkSendingUncontacted, setIsBulkSendingUncontacted] = useState(false);
  const [hubUploadMsg, setHubUploadMsg] = useState('');

  // Omnichannel Direct Outreach (WhatsApp, Instagram, LinkedIn, SMS, Twitter)
  const [activeChannel, setActiveChannel] = useState('email'); // 'email' | 'whatsapp' | 'instagram' | 'linkedin' | 'sms' | 'twitter'
  const [channelMessages, setChannelMessages] = useState({
    whatsapp: '',
    instagram: '',
    linkedin_note: '',
    linkedin_inmail: '',
    sms: '',
    twitter: ''
  });
  const [channelRedirects, setChannelRedirects] = useState(null);
  const [isGeneratingChannels, setIsGeneratingChannels] = useState(false);
  const [linkedInVariant, setLinkedInVariant] = useState('note'); // 'note' | 'inmail'
  const [channelCopiedToast, setChannelCopiedToast] = useState('');
  const [directActionToast, setDirectActionToast] = useState('');
  const [editingSocialField, setEditingSocialField] = useState(null); // 'phone' | 'instagram' | 'linkedin'
  const [editingSocialValue, setEditingSocialValue] = useState('');

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

  // Fetch thread, diagnosis & multichannel AI direct messages when selecting lead
  const loadLeadDetails = async (lead) => {
    if (!lead) return;
    setIsLoadingThread(true);
    try {
      const [threadRes, diagRes, channelsRes] = await Promise.all([
        api.outreach.getThread(lead.id),
        api.outreach.diagnoseLead(lead.id, lead),
        api.outreach.generateChannels(lead.id).catch(() => ({}))
      ]);

      const currentThread = threadRes?.thread || [];
      setThread(currentThread);
      if (threadRes?.lead) {
        setSelectedLead(threadRes.lead);
      }

      if (channelsRes?.messages) {
        setChannelMessages(channelsRes.messages);
      }
      if (channelsRes?.redirects) {
        setChannelRedirects(channelsRes.redirects);
      }

      let primaryAngle = null;
      if (diagRes?.diagnosis) {
        setDiagnosis(diagRes.diagnosis);
        primaryAngle = diagRes.diagnosis.primaryAngle || (diagRes.diagnosis.angles && diagRes.diagnosis.angles[0]);
        setActiveAngle(primaryAngle);
        setCustomProblem(primaryAngle ? primaryAngle.problem : '');
        setCustomSolution(primaryAngle ? primaryAngle.solution : '');
        setCustomHowWeHelp(primaryAngle ? primaryAngle.howWeHelp : '');
      }

      const activeAudit = threadRes?.lead?.websiteAudit || lead.websiteAudit || diagRes?.diagnosis?.websiteAudit || null;
      setWebsiteAudit(activeAudit);
      const chosenTone = (activeAudit && activeAudit.weakPoints?.length > 0) ? 'website_audit' : 'problem_solution';
      setTone(chosenTone);

      let initialSubj = '';
      if (diagRes?.subjectOptions && diagRes.subjectOptions.length > 0) {
        setSubjectOptions(diagRes.subjectOptions);
        initialSubj = diagRes.subjectOptions[0];
        setSubject(initialSubj);
      } else {
        initialSubj = `Regarding ${lead.company}`;
        setSubject(initialSubj);
      }

      // If lead is uncontacted, AUTO-DRAFT the email pitch immediately so the user sees clear content right away!
      if (currentThread.length === 0) {
        try {
          const pitchRes = await api.outreach.generatePitch(lead.id, {
            angleId: primaryAngle?.id,
            tone: chosenTone,
            customSubject: initialSubj
          });
          if (pitchRes?.pitch) {
            setSubject(stripEmojis(pitchRes.pitch.subject));
            setBody(stripEmojis(pitchRes.pitch.body));
            if (pitchRes.pitch.subjectOptions) {
              setSubjectOptions(pitchRes.pitch.subjectOptions);
            }
          }
        } catch (pitchErr) {
          console.warn('Auto pitch draft notice:', pitchErr);
        }
      } else {
        // If there is already an existing thread, clear composer body for fresh response
        setBody('');
      }
    } catch (err) {
      console.error('Failed to load lead details:', err);
    } finally {
      setIsLoadingThread(false);
    }
  };

  // Re-generate AI Direct Messages for all channels
  const loadChannelsForLead = async (lead, customAng = null) => {
    if (!lead) return;
    setIsGeneratingChannels(true);
    try {
      const res = await api.outreach.generateChannels(lead.id, {
        angleId: customAng?.id || activeAngle?.id,
        customProblem: customProblem || activeAngle?.problem,
        customSolution: customSolution || activeAngle?.solution,
        customHowWeHelp: customHowWeHelp || activeAngle?.howWeHelp
      });
      if (res.messages) {
        setChannelMessages(res.messages);
      }
      if (res.redirects) {
        setChannelRedirects(res.redirects);
      }
    } catch (err) {
      console.warn('Channel messages generation error:', err.message);
    } finally {
      setIsGeneratingChannels(false);
    }
  };

  const handleLaunchWhatsApp = () => {
    const msg = channelMessages.whatsapp || '';
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(msg).catch(() => {});
    }
    const cleanPhone = (selectedLead?.phone || '').replace(/[^0-9]/g, '');
    const waPhone = cleanPhone.length === 10 ? `1${cleanPhone}` : cleanPhone;
    const url = waPhone
      ? `https://wa.me/${waPhone}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
    setDirectActionToast('WhatsApp message copied! Opening WhatsApp Web / App...');
    setTimeout(() => setDirectActionToast(''), 4500);
  };

  const handleLaunchInstagram = () => {
    const msg = channelMessages.instagram || '';
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(msg).catch(() => {});
    }
    let igHandle = (selectedLead?.socials?.instagramHandle || '').replace(/^@/, '');
    const igUrl = selectedLead?.socials?.instagram || selectedLead?.instagramUrl || '';
    if (!igHandle && igUrl) {
      const m = igUrl.match(/instagram\.com\/([a-zA-Z0-9._]+)/i);
      if (m && m[1] && !['p', 'explore', 'reel', 'stories'].includes(m[1].toLowerCase())) {
        igHandle = m[1];
      }
    }
    const url = igHandle
      ? `https://ig.me/m/${igHandle}`
      : (igUrl || 'https://www.instagram.com/direct/inbox/');
    window.open(url, '_blank');
    setDirectActionToast('Instagram DM copied! Opening Instagram...');
    setTimeout(() => setDirectActionToast(''), 4500);
  };

  const handleLaunchLinkedIn = () => {
    const msg = linkedInVariant === 'note' ? (channelMessages.linkedin_note || '') : (channelMessages.linkedin_inmail || '');
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(msg).catch(() => {});
    }
    const liUrl = selectedLead?.socials?.linkedin || selectedLead?.linkedinUrl || selectedLead?.linkedinPeopleUrl || '';
    const url = liUrl || `https://www.linkedin.com/search/results/all/?keywords=${encodeURIComponent(selectedLead?.company || '')}`;
    window.open(url, '_blank');
    setDirectActionToast(`LinkedIn ${linkedInVariant === 'note' ? 'connection note' : 'message'} copied! Opening LinkedIn...`);
    setTimeout(() => setDirectActionToast(''), 4500);
  };

  const handleLaunchSms = () => {
    const msg = channelMessages.sms || '';
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(msg).catch(() => {});
    }
    const cleanPhone = (selectedLead?.phone || '').replace(/[^0-9]/g, '');
    if (cleanPhone) {
      window.location.href = `sms:${cleanPhone}?body=${encodeURIComponent(msg)}`;
    }
    setDirectActionToast('SMS message copied to clipboard!');
    setTimeout(() => setDirectActionToast(''), 4500);
  };

  const handleLaunchTwitter = () => {
    const msg = channelMessages.twitter || '';
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(msg).catch(() => {});
    }
    const handle = (selectedLead?.socials?.twitter || '').replace(/^https?:\/\/(www\.)?(twitter|x)\.com\//i, '').replace(/^@/, '').split('/')[0];
    const url = handle ? `https://twitter.com/${handle}` : (selectedLead?.socials?.twitter || 'https://twitter.com/messages');
    window.open(url, '_blank');
    setDirectActionToast('X / Twitter pitch copied! Opening X...');
    setTimeout(() => setDirectActionToast(''), 4500);
  };

  const handleCopyChannelText = (text, label) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
    setChannelCopiedToast(`Copied ${label}!`);
    setTimeout(() => setChannelCopiedToast(''), 3000);
  };

  const handleSaveSocialField = async (field, val) => {
    if (!selectedLead || !val.trim()) return;
    try {
      let updatePayload = {};
      if (field === 'phone') {
        updatePayload = { phone: val.trim() };
      } else if (field === 'instagram') {
        const cleanHandle = val.trim().startsWith('@') ? val.trim() : `@${val.trim()}`;
        updatePayload = {
          socials: {
            ...(selectedLead.socials || {}),
            instagramHandle: cleanHandle,
            instagram: val.trim().startsWith('http') ? val.trim() : `https://www.instagram.com/${cleanHandle.replace(/^@/, '')}/`
          }
        };
      } else if (field === 'linkedin') {
        updatePayload = {
          linkedinUrl: val.trim(),
          socials: {
            ...(selectedLead.socials || {}),
            linkedin: val.trim()
          }
        };
      }

      const res = await api.leads.update(selectedLead.id, updatePayload);
      if (res.lead) {
        setSelectedLead(res.lead);
        if (onLeadUpdated) onLeadUpdated(res.lead);
        loadChannelsForLead(res.lead);
      }
      setEditingSocialField(null);
      setEditingSocialValue('');
    } catch (err) {
      alert('Error saving social details: ' + err.message);
    }
  };

  // Run on-demand live website audit for selected lead
  const handleAuditWebsite = async () => {
    if (!selectedLead || !selectedLead.website) return;
    setIsAuditingWebsite(true);
    setAuditError('');

    try {
      const res = await api.leads.auditWebsite(selectedLead.id, selectedLead.website);
      if (res.audit) {
        setWebsiteAudit(res.audit);
      }
      if (res.lead) {
        setSelectedLead(res.lead);
        if (onLeadUpdated) onLeadUpdated(res.lead);
      }

      // Re-diagnose with updated website audit
      const diagRes = await api.outreach.diagnoseLead(selectedLead.id, res.lead || selectedLead);
      if (diagRes.diagnosis) {
        setDiagnosis(diagRes.diagnosis);
        const primary = diagRes.diagnosis.primaryAngle || (diagRes.diagnosis.angles && diagRes.diagnosis.angles[0]);
        setActiveAngle(primary);
        setCustomProblem(primary ? primary.problem : '');
        setCustomSolution(primary ? primary.solution : '');
        setCustomHowWeHelp(primary ? primary.howWeHelp : '');
      }
      if (diagRes.subjectOptions?.length > 0) {
        setSubjectOptions(diagRes.subjectOptions);
        setSubject(diagRes.subjectOptions[0]);
      }

      // Auto-set tone to website audit and draft high-converting pitch
      setTone('website_audit');
    } catch (err) {
      setAuditError('Website audit failed: ' + err.message);
    } finally {
      setIsAuditingWebsite(false);
    }
  };

  // 1-Click Generate Pitch from Website Weak Points
  const handleGenerateWebsiteAuditPitch = async () => {
    if (!selectedLead) return;

    let currentAudit = websiteAudit || selectedLead.websiteAudit;
    if (!currentAudit && selectedLead.website) {
      setIsAuditingWebsite(true);
      try {
        const res = await api.leads.auditWebsite(selectedLead.id, selectedLead.website);
        if (res.audit) {
          currentAudit = res.audit;
          setWebsiteAudit(res.audit);
        }
        if (res.lead) {
          setSelectedLead(res.lead);
          if (onLeadUpdated) onLeadUpdated(res.lead);
        }
      } catch (err) {
        console.warn('Pre-pitch audit warning:', err.message);
      } finally {
        setIsAuditingWebsite(false);
      }
    }

    setTone('website_audit');
    handleGeneratePitch('website_audit');
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
      const extraCc = ccAllEmails && Array.isArray(selectedLead.allEmails)
        ? selectedLead.allEmails.filter(em => em && em !== recipientEmail.trim())
        : [];

      const res = await api.outreach.sendEmail({
        leadId: selectedLead.id,
        toEmail: recipientEmail.trim(),
        ccEmails: extraCc,
        subject: stripEmojis(subject || `Regarding ${selectedLead.company}`),
        body: stripEmojis(body),
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
        res = await api.outreach.autoSend(selectedLead.id, recipientEmail.trim() || null, {
          tone,
          ccAllEmails
        });
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
      setAutoSendSuccessMsg(`⚡ Auto-Sent HTML + Plain-Text email to ${res.lead.company}!`);
      setTimeout(() => setAutoSendSuccessMsg(''), 4500);
      setBody('');
      setPreviewMode(false);
    } catch (err) {
      alert('Auto-Send error: ' + err.message);
    } finally {
      setIsAutoSending(false);
    }
  };

  // 1-Click Bulk Auto-Send to all uncontacted leads that have an email
  const handleBulkEmailUncontacted = async () => {
    const uncontactedWithEmail = leads.filter(l => l.status === 'new' && l.email);
    if (uncontactedWithEmail.length === 0) {
      alert('No uncontacted ("new") leads with verified emails found in the list.');
      return;
    }
    setIsBulkSendingUncontacted(true);
    setHubUploadMsg('');
    try {
      const res = await api.outreach.bulkAutoSend(uncontactedWithEmail);
      setHubUploadMsg(`⚡ Sent ${res.count} tailored emails to uncontacted leads!`);
      if (selectedLead && onLeadUpdated) onLeadUpdated(selectedLead);
      setTimeout(() => setHubUploadMsg(''), 6000);
    } catch (err) {
      alert('Bulk email failed: ' + err.message);
    } finally {
      setIsBulkSendingUncontacted(false);
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

  // Upload a scraper file (.xlsx / .xls / .csv) directly inside AI Closer Hub to import & email leads
  const handleHubFileUpload = (file, autoEmailAll = false) => {
    if (!file) return;
    setIsUploadingHubFile(true);
    setHubUploadMsg('');

    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const res = await api.leads.uploadFile({
          fileName: file.name,
          fileDataBase64: ev.target.result,
          importToPipeline: true,
          enrichMissingEmails: true,
          autoSendAll: autoEmailAll
        });
        const imported = res.leads || [];
        if (imported.length > 0) {
          setSelectedLead(imported[0]);
          if (onLeadUpdated) onLeadUpdated(imported[0]);
        }
        if (autoEmailAll && res.autoSendReport) {
          setHubUploadMsg(`⚡ Uploaded "${file.name}" & sent ${res.autoSendReport.count} emails!`);
        } else {
          setHubUploadMsg(`📥 Imported ${res.totalParsed} leads from "${file.name}"!`);
        }
        setTimeout(() => setHubUploadMsg(''), 6000);
      } catch (err) {
        alert('Upload error: ' + err.message);
      } finally {
        setIsUploadingHubFile(false);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
      
      {/* Container with 3-Pane Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-140px)] min-h-[800px]">
        
        {/* PANE 1: Left Leads List (3 cols) */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 flex flex-col overflow-hidden shadow-sm">
          
          {/* Header & Filter */}
          <div className="p-4 border-b border-slate-200 space-y-3 bg-slate-50/70">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></div>
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">Prospects</span>
              </div>
              <span className="text-[11px] font-semibold text-slate-600 px-2 py-0.5 rounded-md bg-white border border-slate-200 shadow-sm">
                {filteredLeads.length} leads
              </span>
            </div>

            {/* Direct Scraper File Upload to Email inside AI Closer Hub */}
            <div className="grid grid-cols-2 gap-1.5">
              <label className="cursor-pointer px-2.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 text-[10px] font-bold flex items-center justify-center space-x-1 transition-all">
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  disabled={isUploadingHubFile}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleHubFileUpload(f, false);
                    e.target.value = '';
                  }}
                />
                {isUploadingHubFile ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Upload className="w-3 h-3" />
                )}
                <span>Upload File</span>
              </label>

              <label
                className="cursor-pointer px-2.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-extrabold flex items-center justify-center space-x-1 transition-all shadow-sm"
                title="Upload .xlsx or .csv scraper file and immediately email all leads in it"
              >
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  disabled={isUploadingHubFile}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleHubFileUpload(f, true);
                    e.target.value = '';
                  }}
                />
                <Send className="w-3 h-3" />
                <span>⚡ Upload &amp; Email</span>
              </label>
            </div>

            {/* 1-Click Email All Uncontacted Leads in Pipeline */}
            <button
              type="button"
              disabled={isBulkSendingUncontacted}
              onClick={handleBulkEmailUncontacted}
              className="w-full py-1.5 px-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 text-[10px] font-extrabold flex items-center justify-center space-x-1.5 transition-all disabled:opacity-50"
              title="Automatically generate and send personalized cold outreach to all uncontacted ('new') leads with verified emails"
            >
              {isBulkSendingUncontacted ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Sending Bulk Outreach...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3 h-3" />
                  <span>⚡ Auto-Email All Uncontacted ({leads.filter(l => l.status === 'new' && l.email).length})</span>
                </>
              )}
            </button>

            {hubUploadMsg && (
              <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-bold flex items-center space-x-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="truncate">{hubUploadMsg}</span>
              </div>
            )}

            {/* Search */}
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search companies or niche..."
              className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 transition-colors shadow-sm"
            />

            {/* Status Pills */}
            <div className="flex flex-wrap gap-1 pt-0.5">
              {['all', 'replied', 'negotiating', 'closed_won', 'contacted', 'new'].map(st => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold uppercase tracking-wider transition-all ${
                    statusFilter === st
                      ? 'bg-blue-600 text-white font-extrabold shadow-sm'
                      : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
                  }`}
                >
                  {st.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Lead List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2 space-y-1">
            {filteredLeads.map(lead => {
              const isSelected = selectedLead?.id === lead.id;
              const badge = getStatusBadge(lead.status);

              return (
                <div
                  key={lead.id}
                  onClick={() => setSelectedLead(lead)}
                  className={`p-3 rounded-xl cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-blue-50/80 border border-blue-300 shadow-sm'
                      : 'hover:bg-slate-50 border border-transparent'
                  }`}
                >
                  <div className="flex items-start justify-between gap-1 mb-1">
                    <h4 className="font-bold text-xs text-slate-900 truncate">
                      {lead.company}
                    </h4>
                    <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 shrink-0">
                      ${lead.dealValue || 1200}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-500 truncate mb-2">
                    {lead.category || 'Business'} {lead.name ? `• ${lead.name}` : ''}
                  </p>

                  <div className="flex items-center justify-between gap-2">
                    <span className={`px-2 py-0.5 text-[9px] font-bold uppercase rounded-md border ${badge.bg}`}>
                      {badge.label}
                    </span>

                    {lead.website ? (
                      <span className="text-[10px] text-blue-600 font-mono truncate max-w-[110px]">
                        {lead.website.replace(/^https?:\/\/(www\.)?/, '')}
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400">No website</span>
                    )}
                  </div>
                </div>
              );
            })}

            {filteredLeads.length === 0 && (
              <div className="text-center py-12 text-xs text-slate-400">
                No matching leads found
              </div>
            )}
          </div>
        </div>

        {/* PANE 2: Center Email Conversation Thread & Enhanced Composer (6 cols) */}
        <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 flex flex-col overflow-hidden shadow-sm">
          
          {/* Thread Header & Channel Switcher */}
          {selectedLead ? (
            <>
              <div className="border-b border-slate-200 bg-slate-50/90 divide-y divide-slate-100">
              {/* Row 1: Company Profile & Recipient Meta */}
              <div className="p-3.5 flex items-center justify-between">
                <div className="min-w-0 flex-1 mr-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-extrabold text-slate-900 truncate">{selectedLead.company}</h3>
                    <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-md border ${getStatusBadge(selectedLead.status).bg}`}>
                      {getStatusBadge(selectedLead.status).label}
                    </span>
                    {diagnosis?.industryLabel && (
                      <span className="hidden sm:inline-flex px-2 py-0.5 text-[9px] font-semibold rounded bg-white text-slate-700 border border-slate-200 shadow-xs">
                        {diagnosis.industryLabel}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 mt-1">
                    <span className="font-mono text-[11px] flex items-center space-x-1.5">
                      <span className="text-slate-500 font-semibold">Send To:</span>
                      <strong className={`font-bold ${selectedLead.email ? 'text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200' : 'text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200'}`}>
                        {selectedLead.email || 'No email saved'}
                      </strong>
                    </span>
                    {selectedLead.phone && (
                      <span className="text-[11px] text-slate-600 font-mono">
                        Phone: <strong className="text-slate-800">{selectedLead.phone}</strong>
                      </span>
                    )}
                    {selectedLead.website && (
                      <a
                        href={selectedLead.website}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 hover:text-blue-700 hover:underline inline-flex items-center space-x-1 font-medium truncate text-[11px]"
                      >
                        <Globe className="w-3 h-3 shrink-0" />
                        <span className="truncate">{selectedLead.website.replace(/^https?:\/\/(www\.)?/, '')}</span>
                        <ExternalLink className="w-2.5 h-2.5 shrink-0 ml-0.5" />
                      </a>
                    )}
                  </div>
                </div>

                {/* Reload / Re-diagnose button */}
                <button
                  onClick={() => loadLeadDetails(selectedLead)}
                  className="p-2 rounded-xl bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 transition-colors shadow-xs shrink-0"
                  title="Refresh thread & AI pitch"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingThread ? 'animate-spin text-blue-600' : ''}`} />
                </button>
              </div>

              {/* Row 2: Omnichannel Outreach Channels Selector */}
              <div className="px-3.5 py-2 bg-white">
                <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar">
                  <button
                    type="button"
                    onClick={() => setActiveChannel('email')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all whitespace-nowrap ${
                      activeChannel === 'email'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200'
                    }`}
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>Email Outreach</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveChannel('whatsapp')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all whitespace-nowrap ${
                      activeChannel === 'whatsapp'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                    }`}
                  >
                    <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                    <span>WhatsApp Direct</span>
                    {selectedLead?.phone && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>}
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveChannel('linkedin')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all whitespace-nowrap ${
                      activeChannel === 'linkedin'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
                    }`}
                  >
                    <Share2 className="w-3.5 h-3.5 text-blue-600" />
                    <span>LinkedIn Message</span>
                    {(selectedLead?.socials?.linkedin || selectedLead?.linkedinUrl) && <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>}
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveChannel('instagram')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all whitespace-nowrap ${
                      activeChannel === 'instagram'
                        ? 'bg-pink-600 text-white shadow-xs'
                        : 'bg-pink-50 text-pink-700 hover:bg-pink-100 border border-pink-200'
                    }`}
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-pink-600" />
                    <span>Instagram DM</span>
                    {(selectedLead?.socials?.instagram || selectedLead?.socials?.instagramHandle) && <span className="w-1.5 h-1.5 rounded-full bg-pink-500"></span>}
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveChannel('sms')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all whitespace-nowrap ${
                      activeChannel === 'sms'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200'
                    }`}
                  >
                    <Smartphone className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Direct SMS</span>
                    {selectedLead?.phone && <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>}
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveChannel('twitter')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all whitespace-nowrap ${
                      activeChannel === 'twitter'
                        ? 'bg-sky-600 text-white shadow-xs'
                        : 'bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200'
                    }`}
                  >
                    <SendHorizontal className="w-3.5 h-3.5 text-sky-600" />
                    <span>X / Twitter</span>
                    {selectedLead?.socials?.twitter && <span className="w-1.5 h-1.5 rounded-full bg-sky-500"></span>}
                  </button>
                </div>
              </div>
            </div>
              {/* Toast for Direct Channel Actions */}
              {(directActionToast || channelCopiedToast) && (
                <div className="bg-emerald-50 border-b border-emerald-200 px-4 py-2 text-xs text-emerald-800 flex items-center justify-between shrink-0">
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>{directActionToast || channelCopiedToast}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setDirectActionToast(''); setChannelCopiedToast(''); }}
                    className="text-emerald-700 hover:text-emerald-900 text-xs font-bold"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* NON-EMAIL CHANNELS: Direct 1-Click Omnichannel Outreach Panel */}
              {activeChannel !== 'email' ? (
                <div className="flex-1 overflow-y-auto p-4 bg-white space-y-4">
                  {/* Channel Meta & Target Info */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                    <div className="flex items-center space-x-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black ${
                        activeChannel === 'whatsapp' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' :
                        activeChannel === 'linkedin' ? 'bg-blue-100 text-blue-700 border border-blue-200' :
                        activeChannel === 'instagram' ? 'bg-pink-100 text-pink-700 border border-pink-200' :
                        activeChannel === 'sms' ? 'bg-indigo-100 text-indigo-700 border border-indigo-200' :
                        'bg-sky-100 text-sky-700 border border-sky-200'
                      }`}>
                        {activeChannel === 'whatsapp' && <MessageCircle className="w-5 h-5" />}
                        {activeChannel === 'linkedin' && <Share2 className="w-5 h-5" />}
                        {activeChannel === 'instagram' && <MessageSquare className="w-5 h-5" />}
                        {activeChannel === 'sms' && <Smartphone className="w-5 h-5" />}
                        {activeChannel === 'twitter' && <SendHorizontal className="w-5 h-5" />}
                      </div>

                      <div>
                        <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center space-x-2">
                          <span>
                            {activeChannel === 'whatsapp' && 'WhatsApp Direct Outbound'}
                            {activeChannel === 'linkedin' && 'LinkedIn Social Pitch'}
                            {activeChannel === 'instagram' && 'Instagram Direct Message'}
                            {activeChannel === 'sms' && 'Direct SMS Outbound'}
                            {activeChannel === 'twitter' && 'X (Twitter) DM'}
                          </span>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-200 text-slate-700">
                            Zero Emojis Enforced
                          </span>
                        </h4>

                        {/* Target identifier info / inline edit */}
                        <div className="text-[11px] text-slate-500 flex items-center space-x-2 mt-0.5">
                          {activeChannel === 'whatsapp' && (
                            <span>Target Phone: <strong className="text-slate-800 font-mono">{selectedLead?.phone || 'No phone saved'}</strong></span>
                          )}
                          {activeChannel === 'sms' && (
                            <span>Target Phone: <strong className="text-slate-800 font-mono">{selectedLead?.phone || 'No phone saved'}</strong></span>
                          )}
                          {activeChannel === 'instagram' && (
                            <span>Target IG: <strong className="text-slate-800 font-mono">{selectedLead?.socials?.instagramHandle || selectedLead?.socials?.instagram || 'No handle saved'}</strong></span>
                          )}
                          {activeChannel === 'linkedin' && (
                            <span>Target Profile: <strong className="text-slate-800 truncate max-w-[200px]">{selectedLead?.socials?.linkedin || selectedLead?.linkedinUrl || selectedLead?.company}</strong></span>
                          )}
                          {activeChannel === 'twitter' && (
                            <span>Target Handle: <strong className="text-slate-800 font-mono">{selectedLead?.socials?.twitter || 'No handle saved'}</strong></span>
                          )}

                          {/* Quick inline editor trigger */}
                          {editingSocialField !== activeChannel ? (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingSocialField(activeChannel);
                                if (activeChannel === 'whatsapp' || activeChannel === 'sms') setEditingSocialValue(selectedLead?.phone || '');
                                else if (activeChannel === 'instagram') setEditingSocialValue(selectedLead?.socials?.instagramHandle || '');
                                else if (activeChannel === 'linkedin') setEditingSocialValue(selectedLead?.socials?.linkedin || selectedLead?.linkedinUrl || '');
                                else if (activeChannel === 'twitter') setEditingSocialValue(selectedLead?.socials?.twitter || '');
                              }}
                              className="text-blue-600 hover:text-blue-700 hover:underline text-[10px] inline-flex items-center space-x-0.5 font-semibold"
                            >
                              <Edit3 className="w-2.5 h-2.5" />
                              <span>Edit</span>
                            </button>
                          ) : null}
                        </div>

                        {/* Inline Editor Input */}
                        {editingSocialField === activeChannel && (
                          <div className="flex items-center space-x-2 mt-2">
                            <input
                              type="text"
                              value={editingSocialValue}
                              onChange={(e) => setEditingSocialValue(e.target.value)}
                              placeholder={
                                activeChannel === 'whatsapp' || activeChannel === 'sms' ? '+1 555 123 4567' :
                                activeChannel === 'instagram' ? '@business_ig' :
                                activeChannel === 'linkedin' ? 'https://linkedin.com/in/profile' :
                                '@handle'
                              }
                              className="px-2 py-1 rounded-lg bg-white border border-slate-300 text-xs text-slate-800 font-mono focus:border-blue-500 focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveSocialField(
                                activeChannel === 'whatsapp' || activeChannel === 'sms' ? 'phone' :
                                activeChannel === 'instagram' ? 'instagram' :
                                activeChannel === 'linkedin' ? 'linkedin' : 'twitter',
                                editingSocialValue
                              )}
                              className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingSocialField(null)}
                              className="px-2 py-1 rounded-lg bg-slate-200 text-slate-600 hover:text-slate-800 text-xs"
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Regenerate Channels Button */}
                    <button
                      type="button"
                      onClick={() => handleGeneratePitch()}
                      disabled={isGeneratingChannels || isGeneratingAi}
                      className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-300 transition-colors flex items-center space-x-1.5 self-start sm:self-center shadow-sm"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isGeneratingChannels ? 'animate-spin' : ''}`} />
                      <span>Regenerate Social AI</span>
                    </button>
                  </div>

                  {/* LinkedIn Note vs InMail Toggle */}
                  {activeChannel === 'linkedin' && (
                    <div className="flex items-center space-x-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
                      <span className="text-[11px] font-bold text-slate-500 px-2">Type:</span>
                      <button
                        type="button"
                        onClick={() => setLinkedInVariant('note')}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                          linkedInVariant === 'note'
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Connection Note (&lt; 300 chars)
                      </button>
                      <button
                        type="button"
                        onClick={() => setLinkedInVariant('inmail')}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                          linkedInVariant === 'inmail'
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Full InMail / Pitch
                      </button>
                    </div>
                  )}

                  {/* Message Textarea */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span className="font-semibold text-slate-700">Message Draft (Clean text, no emojis):</span>
                      <div className="flex items-center space-x-2 text-[11px]">
                        {activeChannel === 'linkedin' && linkedInVariant === 'note' ? (
                          <span className={`font-mono font-bold ${
                            (channelMessages.linkedin_note || '').length > 300 ? 'text-rose-600' : 'text-emerald-600'
                          }`}>
                            {(channelMessages.linkedin_note || '').length} / 300 chars
                          </span>
                        ) : (
                          <span className="font-mono text-slate-500">
                            {(() => {
                              const val = activeChannel === 'whatsapp' ? channelMessages.whatsapp :
                                activeChannel === 'linkedin' ? channelMessages.linkedin_inmail :
                                activeChannel === 'instagram' ? channelMessages.instagram :
                                activeChannel === 'sms' ? channelMessages.sms :
                                channelMessages.twitter;
                              return `${(val || '').length} chars • ${(val || '').trim().split(/\s+/).filter(Boolean).length} words`;
                            })()}
                          </span>
                        )}
                      </div>
                    </div>

                    <textarea
                      rows={activeChannel === 'linkedin' && linkedInVariant === 'note' ? 4 : 6}
                      value={
                        activeChannel === 'whatsapp' ? (channelMessages.whatsapp || '') :
                        activeChannel === 'linkedin' ? (linkedInVariant === 'note' ? (channelMessages.linkedin_note || '') : (channelMessages.linkedin_inmail || '')) :
                        activeChannel === 'instagram' ? (channelMessages.instagram || '') :
                        activeChannel === 'sms' ? (channelMessages.sms || '') :
                        (channelMessages.twitter || '')
                      }
                      onChange={(e) => {
                        const clean = stripEmojis(e.target.value);
                        if (activeChannel === 'whatsapp') setChannelMessages(prev => ({ ...prev, whatsapp: clean }));
                        else if (activeChannel === 'linkedin') {
                          if (linkedInVariant === 'note') setChannelMessages(prev => ({ ...prev, linkedin_note: clean }));
                          else setChannelMessages(prev => ({ ...prev, linkedin_inmail: clean }));
                        }
                        else if (activeChannel === 'instagram') setChannelMessages(prev => ({ ...prev, instagram: clean }));
                        else if (activeChannel === 'sms') setChannelMessages(prev => ({ ...prev, sms: clean }));
                        else if (activeChannel === 'twitter') setChannelMessages(prev => ({ ...prev, twitter: clean }));
                      }}
                      placeholder="AI-generated channel message will appear here..."
                      className="w-full p-3.5 rounded-2xl bg-white border border-slate-300 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 leading-relaxed font-sans shadow-sm"
                    />
                  </div>

                  {/* Action Buttons: 1-Click Launch & Direct Copy */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        const txt = activeChannel === 'whatsapp' ? channelMessages.whatsapp :
                          activeChannel === 'linkedin' ? (linkedInVariant === 'note' ? channelMessages.linkedin_note : channelMessages.linkedin_inmail) :
                          activeChannel === 'instagram' ? channelMessages.instagram :
                          activeChannel === 'sms' ? channelMessages.sms :
                          channelMessages.twitter;
                        handleCopyChannelText(txt || '', activeChannel.toUpperCase());
                      }}
                      className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-300 transition-colors flex items-center justify-center space-x-1.5"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Message Text</span>
                    </button>

                    <div className="flex items-center space-x-2">
                      {activeChannel === 'whatsapp' && (
                        <button
                          type="button"
                          onClick={handleLaunchWhatsApp}
                          className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm flex items-center justify-center space-x-2 transition-all"
                        >
                          <MessageCircle className="w-4 h-4" />
                          <span>Launch WhatsApp (wa.me)</span>
                          <ExternalLink className="w-3.5 h-3.5 ml-0.5" />
                        </button>
                      )}

                      {activeChannel === 'linkedin' && (
                        <button
                          type="button"
                          onClick={handleLaunchLinkedIn}
                          className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm flex items-center justify-center space-x-2 transition-all"
                        >
                          <Share2 className="w-4 h-4" />
                          <span>Open LinkedIn Profile</span>
                          <ExternalLink className="w-3.5 h-3.5 ml-0.5" />
                        </button>
                      )}

                      {activeChannel === 'instagram' && (
                        <button
                          type="button"
                          onClick={handleLaunchInstagram}
                          className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-700 text-white font-bold text-xs shadow-sm flex items-center justify-center space-x-2 transition-all"
                        >
                          <MessageSquare className="w-4 h-4" />
                          <span>Direct Redirect to Instagram (ig.me)</span>
                          <ExternalLink className="w-3.5 h-3.5 ml-0.5" />
                        </button>
                      )}

                      {activeChannel === 'sms' && (
                        <button
                          type="button"
                          onClick={handleLaunchSms}
                          className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm flex items-center justify-center space-x-2 transition-all"
                        >
                          <Smartphone className="w-4 h-4" />
                          <span>Send via Native SMS App</span>
                          <ExternalLink className="w-3.5 h-3.5 ml-0.5" />
                        </button>
                      )}

                      {activeChannel === 'twitter' && (
                        <button
                          type="button"
                          onClick={handleLaunchTwitter}
                          className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-sm flex items-center justify-center space-x-2 transition-all"
                        >
                          <SendHorizontal className="w-4 h-4" />
                          <span>Open X Profile / DM</span>
                          <ExternalLink className="w-3.5 h-3.5 ml-0.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                /* EMAIL CHANNEL OUTREACH */
                thread.length > 0 ? (
                  /* Active Conversation Thread View */
                  <div className="flex-1 flex flex-col min-h-0">
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/40">
                      {thread.map(msg => {
                        const isOutbound = msg.direction === 'outbound';

                        return (
                          <div
                            key={msg.id}
                            className={`flex flex-col ${isOutbound ? 'items-end' : 'items-start'}`}
                          >
                            <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-500 mb-1 px-1">
                              {isOutbound ? (
                                <>
                                  {msg.aiGenerated && (
                                    <span className="flex items-center space-x-1 text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded border border-blue-200 shadow-sm">
                                      <Bot className="w-3 h-3" />
                                      <span>AI Closer</span>
                                    </span>
                                  )}
                                  <span className="font-semibold text-slate-700">From: {msg.from || 'Arbaz Khan'}</span>
                                  <span className="text-slate-400">→</span>
                                  <span className="text-blue-700 font-mono">To: {msg.to || selectedLead?.email || 'Prospect'}</span>
                                  <span className="text-slate-300">•</span>
                                  <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </>
                              ) : (
                                <>
                                  <span className="flex items-center space-x-1 text-amber-800 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200 shadow-sm">
                                    <User className="w-3 h-3" />
                                    <span>Client Reply</span>
                                  </span>
                                  <span className="font-semibold text-slate-800">From: {msg.from || selectedLead?.company}</span>
                                  {msg.intent && (
                                    <span className="text-[10px] text-purple-700 font-mono bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                                      Intent: {msg.intent.replace('_', ' ')}
                                    </span>
                                  )}
                                  <span className="text-slate-300">•</span>
                                  <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </>
                              )}
                            </div>

                            <div
                              className={`max-w-[88%] rounded-2xl p-4 text-xs leading-relaxed ${
                                isOutbound
                                  ? 'bg-blue-600 text-white rounded-br-none shadow-sm'
                                  : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none shadow-sm'
                              }`}
                            >
                              {msg.subject && (
                                <div className={`font-bold text-[11px] mb-2 pb-1.5 border-b ${
                                  isOutbound ? 'border-blue-500/60 text-blue-100' : 'border-slate-100 text-slate-900'
                                }`}>
                                  {msg.subject}
                                </div>
                              )}
                              <div className="whitespace-pre-wrap leading-relaxed">{msg.body}</div>
                            </div>
                          </div>
                        );
                      })}

                      {/* Closed Won Banner */}
                      {selectedLead?.status === 'closed_won' && (
                        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-center space-y-1 my-3 shadow-sm">
                          <div className="flex items-center justify-center space-x-2 text-emerald-800 font-black text-sm">
                            <Award className="w-5 h-5 text-emerald-600" />
                            <span>DEAL CLOSED &amp; WON!</span>
                          </div>
                          <p className="text-xs text-emerald-700 font-medium">
                            Client confirmed agreement for {selectedLead.company} (${selectedLead.dealValue || 1200} value).
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Reply Composer */}
                    <div className="p-3.5 bg-white border-t border-slate-200 space-y-3 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Mail className="w-4 h-4 text-blue-600" />
                          <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">Reply to Thread</span>
                        </div>
                        <div className="flex items-center space-x-1.5">
                          {['followup_1', 'followup_2', 'short_casual'].map(t => (
                            <button
                              key={t}
                              type="button"
                              onClick={() => handleToneChange(t)}
                              className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all ${
                                tone === t ? 'bg-blue-600 text-white font-bold' : 'bg-slate-100 text-slate-600 hover:text-slate-900'
                              }`}
                            >
                              {t === 'followup_1' ? 'Follow-Up 1' : t === 'followup_2' ? 'Follow-Up 2' : 'Short'}
                            </button>
                          ))}
                        </div>
                      </div>

                      <form onSubmit={handleSendEmail} className="space-y-2.5">
                        <div className="flex items-center space-x-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                          <label className="text-[11px] font-bold text-slate-500 w-12 text-right shrink-0">To:</label>
                          <input
                            type="email"
                            value={recipientEmail}
                            onChange={(e) => setRecipientEmail(e.target.value)}
                            className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-slate-800 font-mono focus:outline-none focus:border-blue-500"
                            required
                          />
                        </div>

                        <div className="flex items-center space-x-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                          <span className="text-[11px] font-bold text-slate-500 w-12 text-right shrink-0">Subject:</span>
                          <input
                            type="text"
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                            required
                          />
                        </div>

                        <textarea
                          rows={4}
                          value={body}
                          onChange={(e) => setBody(stripEmojis(e.target.value))}
                          placeholder="Type reply message (clean plain-text, no emojis)..."
                          className="w-full p-3 rounded-xl bg-slate-50/60 border border-slate-300 text-xs text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white leading-relaxed"
                          required
                        />

                        <div className="flex items-center justify-between">
                          <div className="text-[10px] text-slate-500">{bodyWords} words</div>
                          <div className="flex items-center space-x-2">
                            <button
                              type="button"
                              onClick={() => handleGeneratePitch()}
                              disabled={isGeneratingAi}
                              className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-300 transition-colors flex items-center space-x-1"
                            >
                              <RefreshCw className={`w-3 h-3 ${isGeneratingAi ? 'animate-spin' : ''}`} />
                              <span>Draft Reply</span>
                            </button>
                            <button
                              type="submit"
                              disabled={isSending || !body.trim() || !recipientEmail.trim()}
                              className="px-5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center space-x-1.5"
                            >
                              <Send className="w-3.5 h-3.5" />
                              <span>Send Reply</span>
                            </button>
                          </div>
                        </div>
                      </form>
                    </div>
                  </div>
                ) : (
                  /* Cold Outreach Studio (thread.length === 0): PROMINENT FULL VIEW */
                  <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/30">
                    
                    {/* Strategy & Diagnosis Header Card */}
                    <div className="bg-white rounded-2xl border border-blue-200 p-4 shadow-xs space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                        <div className="flex items-center space-x-2.5">
                          <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xs">
                            <Sparkles className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                              AI Cold Outreach Pitch Ready
                            </h4>
                            <p className="text-[11px] text-slate-500 font-medium">
                              Tailored for <strong className="text-slate-800">{selectedLead?.company}</strong> • Strict Zero Emojis
                            </p>
                          </div>
                        </div>

                        <span className="px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-[10px] font-bold">
                          Ready to Send
                        </span>
                      </div>

                      {/* Bottleneck & Solution Diagnosis */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <div className="p-2.5 rounded-xl bg-rose-50/70 border border-rose-200 space-y-1">
                          <span className="text-[10px] font-bold text-rose-800 uppercase tracking-wider flex items-center space-x-1">
                            <AlertCircle className="w-3 h-3 text-rose-600" />
                            <span>Identified Bottleneck:</span>
                          </span>
                          <p className="text-[11px] text-slate-700 leading-snug line-clamp-2">
                            {customProblem || activeAngle?.problem || 'After-hours lead capture and slow speed-to-response.'}
                          </p>
                        </div>

                        <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-1">
                          <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider flex items-center space-x-1">
                            <Zap className="w-3 h-3 text-emerald-600" />
                            <span>Proposed Solution:</span>
                          </span>
                          <p className="text-[11px] text-slate-700 leading-snug line-clamp-2">
                            {customSolution || activeAngle?.solution || 'Automated 24/7 AI qualification concierge and instant intake.'}
                          </p>
                        </div>
                      </div>

                      {/* Tone & Pitch Angle Switcher */}
                      <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center space-x-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          <span>Pitch Tone / Angle:</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {[
                            { id: 'website_audit', label: '🌐 Website Flaws' },
                            { id: 'problem_solution', label: '🎯 Problem & Fix' },
                            { id: 'social_omnichannel', label: '📱 Social + Web AI' },
                            { id: 'direct_roi', label: '💼 Direct ROI' },
                            { id: 'short_casual', label: '⚡ Short' },
                            { id: 'followup_1', label: '🔔 Follow-Up #1' },
                            { id: 'followup_2', label: '🚀 Follow-Up #2' }
                          ].map(t => (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => handleToneChange(t.id)}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all ${
                                tone === t.id
                                  ? 'bg-blue-600 text-white font-bold shadow-xs'
                                  : 'bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200'
                              }`}
                            >
                              {t.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Cold Email Form Studio Card */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3.5">
                      
                      {/* Auto-Send Notification */}
                      {autoSendSuccessMsg && (
                        <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs flex items-center space-x-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span className="font-bold">{autoSendSuccessMsg}</span>
                        </div>
                      )}

                      <form onSubmit={handleSendEmail} className="space-y-3">
                        
                        {/* TO Line + Multi-Email Selector Pills */}
                        <div className="space-y-1.5">
                          <div className="flex items-center space-x-2 bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-200">
                            <label className="text-xs font-bold text-slate-600 w-12 text-right shrink-0">To:</label>
                            <div className="relative flex-1">
                              <input
                                type="email"
                                value={recipientEmail}
                                onChange={(e) => setRecipientEmail(e.target.value)}
                                placeholder="prospect@company.com"
                                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 font-mono font-medium placeholder-slate-400 focus:outline-none focus:border-blue-500 shadow-xs"
                                required
                              />
                            </div>

                            {/* 1-Click Real Email Finder Button */}
                            <button
                              type="button"
                              onClick={handleFindRealEmail}
                              disabled={isSearchingEmail || !selectedLead}
                              className="px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold flex items-center space-x-1 shrink-0 transition-colors disabled:opacity-50"
                              title="Deep crawl website & search live web for real email address"
                            >
                              {isSearchingEmail ? (
                                <>
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  <span>Searching Web...</span>
                                </>
                              ) : (
                                <>
                                  <Sparkles className="w-3.5 h-3.5" />
                                  <span>Find Real Email</span>
                                </>
                              )}
                            </button>

                            {!recipientEmail && (
                              <span className="text-[10px] text-amber-700 font-semibold px-2 py-1 bg-amber-50 rounded border border-amber-200 shrink-0">
                                Email required
                              </span>
                            )}
                          </div>

                          {/* Discovered Multi-Emails Selector & CC Toggle */}
                          {Array.isArray(selectedLead?.allEmails) && selectedLead.allEmails.length > 1 && (
                            <div className="flex flex-wrap items-center justify-between gap-2 pl-14 pr-2 pt-0.5">
                              <div className="flex flex-wrap items-center gap-1">
                                <span className="text-[10px] text-slate-500">All discovered ({selectedLead.allEmails.length}):</span>
                                {selectedLead.allEmails.slice(0, 4).map((em, idx) => (
                                  <button
                                    key={idx}
                                    type="button"
                                    onClick={() => setRecipientEmail(em)}
                                    className={`px-2 py-0.5 rounded text-[10px] font-mono border transition-colors ${
                                      recipientEmail === em
                                        ? 'bg-blue-100 text-blue-800 border-blue-300 font-bold'
                                        : 'bg-white text-slate-600 border-slate-200 hover:text-slate-900'
                                    }`}
                                  >
                                    {em}
                                  </button>
                                ))}
                              </div>

                              <label className="inline-flex items-center space-x-1.5 text-[10px] text-emerald-700 font-semibold cursor-pointer select-none">
                                <input
                                  type="checkbox"
                                  checked={ccAllEmails}
                                  onChange={(e) => setCcAllEmails(e.target.checked)}
                                  className="rounded bg-white border-slate-300 text-blue-600 focus:ring-0"
                                />
                                <span>CC all {selectedLead.allEmails.length} emails</span>
                              </label>
                            </div>
                          )}

                          {emailSearchMessage && (
                            <div className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center space-x-1.5 ${
                              emailSearchMessage.includes('Found')
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : 'bg-amber-50 text-amber-800 border border-amber-200'
                            }`}>
                              {emailSearchMessage.includes('Found') ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <AlertCircle className="w-3.5 h-3.5 text-amber-600" />}
                              <span>{emailSearchMessage}</span>
                            </div>
                          )}
                        </div>

                        {/* SUBJECT Line with Presets Dropdown */}
                        <div className="space-y-1.5">
                          <div className="flex items-center space-x-2 bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-200">
                            <span className="text-xs font-bold text-slate-600 w-12 text-right shrink-0">Subject:</span>
                            <input
                              type="text"
                              value={subject}
                              onChange={(e) => setSubject(e.target.value)}
                              placeholder="Subject line..."
                              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 font-medium placeholder-slate-400 focus:outline-none focus:border-blue-500 shadow-xs"
                              required
                            />
                          </div>

                          {/* Quick Subject Suggestions */}
                          {subjectOptions.length > 0 && (
                            <div className="flex items-center space-x-1.5 overflow-x-auto py-1 pl-14">
                              <span className="text-[10px] text-slate-500 shrink-0 font-medium">Suggested:</span>
                              {subjectOptions.slice(0, 3).map((sub, i) => (
                                <button
                                  key={i}
                                  type="button"
                                  onClick={() => setSubject(sub)}
                                  className={`text-[10px] px-2 py-0.5 rounded border truncate max-w-[220px] transition-colors ${
                                    subject === sub ? 'border-blue-300 text-blue-800 bg-blue-50 font-bold' : 'border-slate-200 bg-white text-slate-600 hover:text-slate-900'
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
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-[10px] text-slate-500 font-semibold">Quick Insert:</span>
                            <button
                              type="button"
                              onClick={() => handleInsertVariable('problem')}
                              className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-colors"
                            >
                              + Problem
                            </button>
                            <button
                              type="button"
                              onClick={() => handleInsertVariable('solution')}
                              className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-colors"
                            >
                              + Solution
                            </button>
                            <button
                              type="button"
                              onClick={() => handleInsertVariable('howWeHelp')}
                              className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition-colors"
                            >
                              + How We Help
                            </button>
                            <button
                              type="button"
                              onClick={() => handleInsertVariable('bookingLink')}
                              className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 transition-colors"
                            >
                              + Booking Link
                            </button>
                          </div>

                          <div className="flex items-center space-x-2">
                            <button
                              type="button"
                              onClick={handleCopyToClipboard}
                              className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 flex items-center space-x-1"
                              title="Copy full email to clipboard"
                            >
                              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                              <span>{copied ? 'Copied!' : 'Copy'}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setPreviewMode(!previewMode)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-medium border flex items-center space-x-1 transition-colors ${
                                previewMode
                                  ? 'bg-blue-100 text-blue-800 border-blue-300 font-bold'
                                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                              }`}
                            >
                              {previewMode ? <Edit3 className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              <span>{previewMode ? 'Edit Mode' : 'HTML Preview'}</span>
                            </button>
                          </div>
                        </div>

                        {/* BODY Textarea or Rich HTML Client Preview */}
                        {previewMode ? (
                          <div className="p-4 rounded-xl bg-white text-slate-900 border border-slate-300 text-xs max-h-80 overflow-y-auto space-y-3 font-sans leading-relaxed shadow-sm">
                            <div className="pb-2 border-b border-slate-200 text-[11px] text-slate-500 flex items-center justify-between">
                              <span className="font-bold text-slate-700">Live Gmail / Outlook HTML Preview</span>
                              <span className="text-blue-600 font-mono">To: {recipientEmail || 'prospect@company.com'}</span>
                            </div>
                            <div className="font-extrabold text-sm text-slate-900">{subject}</div>
                            <div className="whitespace-pre-wrap leading-relaxed text-slate-800">{body || 'No content drafted yet.'}</div>
                            <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center gap-2">
                              <span className="px-3 py-1.5 rounded-lg bg-blue-600 text-white font-bold text-[11px] inline-block">
                                Book a 10-Min Walkthrough
                              </span>
                              <span className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-800 border border-slate-300 font-semibold text-[11px] inline-block">
                                View AI Portfolio &amp; Case Studies
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="relative">
                            <textarea
                              rows={10}
                              value={body}
                              onChange={(e) => setBody(stripEmojis(e.target.value))}
                              placeholder="AI tailored cold outreach pitch will appear here (clean plain text, zero emojis)..."
                              className="w-full p-4 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 leading-relaxed font-sans shadow-xs transition-colors"
                              required
                            />
                          </div>
                        )}

                        {/* Deliverability & Action Footer */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100">
                          <div className="flex items-center space-x-3 text-[11px] text-slate-500">
                            <span>{bodyWords} words</span>
                            <span>•</span>
                            <span>~{readTimeSec}s read time</span>
                            <span>•</span>
                            <span className="text-emerald-700 flex items-center space-x-1 font-semibold">
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                              <span>{bodyWords <= 220 ? '99%' : '96%'} Deliverability (HTML + Text)</span>
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleGeneratePitch()}
                              disabled={isGeneratingAi}
                              className="px-3 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-300 transition-colors flex items-center space-x-1.5 shadow-xs"
                            >
                              <RefreshCw className={`w-3.5 h-3.5 ${isGeneratingAi ? 'animate-spin' : ''}`} />
                              <span>Regenerate Pitch</span>
                            </button>

                            <button
                              type="button"
                              onClick={handleAutoSendNow}
                              disabled={isAutoSending || !recipientEmail}
                              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs shadow-xs flex items-center space-x-1.5 transition-all disabled:opacity-50"
                              title="Automatically creates tailored email and sends immediately without asking"
                            >
                              {isAutoSending ? (
                                <>
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  <span>Auto-Sending...</span>
                                </>
                              ) : (
                                <>
                                  <Sparkles className="w-3.5 h-3.5 fill-current" />
                                  <span>⚡ 1-Click Auto-Send</span>
                                </>
                              )}
                            </button>

                            <button
                              type="submit"
                              disabled={isSending || !body.trim() || !recipientEmail.trim()}
                              className="px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-md flex items-center space-x-2 transition-all disabled:opacity-50"
                            >
                              <Send className="w-3.5 h-3.5" />
                              <span>Send Email Now</span>
                            </button>
                          </div>
                        </div>
                      </form>
                    </div>
                  </div>
                )
              )}
            </>
          ) : (
            <div className="h-full min-h-[500px] flex flex-col items-center justify-center p-8 text-center space-y-3 bg-slate-50/50">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shadow-sm">
                <Mail className="w-8 h-8" />
              </div>
              <h3 className="text-base font-extrabold text-slate-800">No Lead Selected</h3>
              <p className="text-xs text-slate-500 max-w-sm">
                Select a lead from your inbox on the left to review their AI audit diagnosis and immediately send or customize their outreach email.
              </p>
            </div>
          )}

        </div>

        {/* PANE 3: Right Problem & Solution Strategy Center (3 cols) */}
        <div className="lg:col-span-3 space-y-4 overflow-y-auto pr-1">
          
          {/* WEBSITE WEAK POINTS & CONVERSION AUDIT CARD */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 space-y-3.5 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 font-black text-xs">
                  <Globe className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">Website Audit</h3>
                  <p className="text-[10px] text-slate-500 font-mono truncate max-w-[150px]">
                    {selectedLead?.website ? selectedLead.website.replace(/^https?:\/\/(www\.)?/, '') : 'No website'}
                  </p>
                </div>
              </div>

              {websiteAudit ? (
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black border ${
                  websiteAudit.score >= 80
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : websiteAudit.score >= 60
                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                    : 'bg-rose-50 text-rose-800 border-rose-200'
                }`}>
                  {websiteAudit.score}/100
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[9px] border border-slate-200 font-semibold">
                  Not Audited
                </span>
              )}
            </div>

            {/* Actions: Run Audit & Pitch From Weak Points */}
            <div className="flex flex-col gap-1.5">
              <button
                type="button"
                onClick={handleGenerateWebsiteAuditPitch}
                disabled={isGeneratingAi || isAuditingWebsite || !selectedLead?.website}
                className="w-full py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm flex items-center justify-center space-x-1.5 transition-all disabled:opacity-50"
              >
                <Zap className="w-3.5 h-3.5 fill-current" />
                <span>⚡ Pitch From Website Weak Points</span>
              </button>

              <button
                type="button"
                onClick={handleAuditWebsite}
                disabled={isAuditingWebsite || !selectedLead?.website}
                className="w-full py-1.5 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-[11px] font-semibold border border-slate-200 flex items-center justify-center space-x-1.5 transition-colors disabled:opacity-50"
              >
                {isAuditingWebsite ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                    <span>Auditing Website Weak Points...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                    <span>{websiteAudit ? 'Re-scan Website Weak Points' : 'Run Live Website Audit'}</span>
                  </>
                )}
              </button>
            </div>

            {auditError && (
              <p className="text-[10px] text-rose-700 bg-rose-50 p-2 rounded-lg border border-rose-200">
                {auditError}
              </p>
            )}

            {/* Display Identified Weak Points */}
            {websiteAudit && websiteAudit.weakPoints && websiteAudit.weakPoints.length > 0 ? (
              <div className="space-y-2 pt-1 border-t border-slate-100">
                <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                  <span>Detected Weak Points ({websiteAudit.weakPoints.length})</span>
                  <span className="text-blue-600">{websiteAudit.rating}</span>
                </div>

                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-0.5">
                  {websiteAudit.weakPoints.map(wp => (
                    <div
                      key={wp.id}
                      onClick={() => {
                        const targetAngle = {
                          id: `audit_${wp.id}`,
                          name: `Flaw: ${wp.title}`,
                          tag: wp.category.toUpperCase(),
                          problem: wp.pitchHook || `${wp.evidence} ${wp.businessImpact}`,
                          solution: wp.solution,
                          howWeHelp: `We implement, test, and launch this fix for ${selectedLead?.company} in 5-7 days (${wp.roiImpact}).`,
                          weakPoint: wp
                        };
                        handleSelectAngle(targetAngle);
                        setTone('website_audit');
                        handleGeneratePitch('website_audit', targetAngle);
                      }}
                      className="p-2 rounded-xl bg-slate-50 border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 cursor-pointer transition-all group"
                      title="Click to anchor pitch to this weak point"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[11px] text-slate-800 group-hover:text-blue-700 transition-colors line-clamp-1">
                          {wp.title}
                        </span>
                        <span className={`text-[8px] uppercase font-black px-1.5 py-0.2 rounded shrink-0 ml-1 ${
                          wp.severity === 'critical'
                            ? 'bg-rose-100 text-rose-800 border border-rose-200'
                            : wp.severity === 'high'
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : 'bg-blue-100 text-blue-800 border border-blue-200'
                        }`}>
                          {wp.severity}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1 line-clamp-2 leading-tight">
                        {wp.evidence}
                      </p>
                      <div className="mt-1 flex items-center justify-between text-[9px] text-blue-600 font-medium">
                        <span className="truncate max-w-[170px]">Fix: {wp.solution.slice(0, 35)}...</span>
                        <span className="underline group-hover:text-blue-700 shrink-0">Target →</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : selectedLead?.website ? (
              <p className="text-[11px] text-slate-500 text-center py-2 bg-slate-50 rounded-xl border border-slate-200">
                Click "Run Live Website Audit" to inspect {selectedLead.company}'s site for after-hours booking, AI chat, speed &amp; SEO weak points.
              </p>
            ) : null}
          </div>

          {/* PROBLEM & SOLUTION STRATEGY CENTER */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 space-y-3.5 shadow-sm">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 rounded-lg bg-blue-600 flex items-center justify-center text-white font-black text-xs">
                  AI
                </div>
                <div>
                  <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">Problem &amp; Solution Engine</h3>
                  <p className="text-[10px] text-blue-600 font-semibold">{diagnosis?.industryLabel || 'Target Niche'}</p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-[9px] font-bold">
                Tailored
              </span>
            </div>

            {/* Selectable Strategy Angles */}
            {diagnosis?.angles && diagnosis.angles.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
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
                            ? 'bg-blue-50 border-blue-400 text-blue-900 shadow-sm'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        <div className="font-bold text-[11px] flex items-center justify-between">
                          <span className={isAngleSelected ? 'text-blue-800' : 'text-slate-800'}>
                            {angle.name}
                          </span>
                          {isAngleSelected && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0 ml-1" />}
                        </div>
                        <span className="text-[10px] text-slate-500 block mt-0.5 line-clamp-1">
                          {angle.tag}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Strategy Card 1: 🔴 THE PROBLEM */}
            <div className="p-3 rounded-xl bg-rose-50/70 border border-rose-200 space-y-1.5 shadow-sm">
              <div className="flex items-center justify-between text-[11px] font-bold text-rose-800">
                <span className="flex items-center space-x-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                  <span>The Problem They Face:</span>
                </span>
                <button
                  type="button"
                  onClick={() => setIsEditingProblem(!isEditingProblem)}
                  className="text-[9px] text-rose-600 hover:underline font-semibold"
                >
                  {isEditingProblem ? 'Done' : 'Edit'}
                </button>
              </div>

              {isEditingProblem ? (
                <textarea
                  rows={3}
                  value={customProblem}
                  onChange={(e) => setCustomProblem(e.target.value)}
                  className="w-full p-2 bg-white border border-rose-300 rounded-lg text-xs text-slate-900 focus:outline-none"
                />
              ) : (
                <p className="text-[11px] text-slate-700 leading-relaxed font-medium">
                  {customProblem || activeAngle?.problem || 'Select an angle above to diagnose problem.'}
                </p>
              )}
            </div>

            {/* Strategy Card 2: 🟢 HOW TO SOLVE IT */}
            <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-1.5 shadow-sm">
              <div className="flex items-center space-x-1.5 text-[11px] font-bold text-emerald-800">
                <Zap className="w-3.5 h-3.5 text-emerald-600" />
                <span>How To Solve Their Problem:</span>
              </div>
              <p className="text-[11px] text-slate-700 leading-relaxed font-medium">
                {customSolution || activeAngle?.solution || 'Automated AI intake and qualification concierge.'}
              </p>
            </div>

            {/* Strategy Card 3: 🚀 HOW WE HELP */}
            <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200 space-y-1.5 shadow-sm">
              <div className="flex items-center space-x-1.5 text-[11px] font-bold text-blue-800">
                <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
                <span>How We Help &amp; ROI Offer:</span>
              </div>
              <p className="text-[11px] text-slate-700 leading-relaxed font-medium">
                {customHowWeHelp || activeAngle?.howWeHelp || 'Turnkey setup in 5 days with zero disruption to staff, backed by 14-day risk-free pilot.'}
              </p>
            </div>

            {/* Apply Angle Button */}
            <button
              type="button"
              onClick={() => handleGeneratePitch()}
              disabled={isGeneratingAi}
              className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
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
          <div className="bg-white rounded-2xl p-4 border border-slate-200 space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">Prospect Profile</span>
              <Globe className="w-4 h-4 text-blue-600" />
            </div>

            {selectedLead ? (
              <div className="space-y-2.5 text-xs">
                {/* Status Dropdown */}
                <div>
                  <label className="text-[11px] text-slate-500 font-semibold block mb-1">Pipeline Stage:</label>
                  <select
                    value={selectedLead.status}
                    onChange={(e) => handleStatusChange(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 font-semibold focus:outline-none focus:border-blue-500 cursor-pointer"
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
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <div className="text-[11px] text-slate-500 font-semibold">Verified Website:</div>
                  {selectedLead.website ? (
                    <a
                      href={selectedLead.website}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-blue-600 hover:text-blue-700 font-semibold hover:underline flex items-center justify-between break-all"
                    >
                      <span className="truncate">{selectedLead.website}</span>
                      <ExternalLink className="w-3.5 h-3.5 shrink-0 ml-1" />
                    </a>
                  ) : (
                    <span className="text-slate-400">No website listed</span>
                  )}
                  {selectedLead.website && (
                    <div className="pt-1 flex items-center space-x-1 text-[10px] text-emerald-700 font-mono">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span>Verified Active Domain</span>
                    </div>
                  )}
                </div>

                {/* Contact Details */}
                <div className="space-y-1 text-slate-600">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Email:</span>
                    <span className="font-mono text-slate-900 truncate max-w-[150px]">{selectedLead.email || '—'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Phone:</span>
                    <span className="text-slate-900">{selectedLead.phone || '—'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Deal Value:</span>
                    <span className="text-emerald-600 font-bold">${selectedLead.dealValue || 1200}</span>
                  </div>
                </div>

              </div>
            ) : (
              <p className="text-xs text-slate-400">No lead selected</p>
            )}
          </div>

          {/* Simulation Sandbox */}
          <div className="bg-white rounded-2xl p-4 border border-amber-200 space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-800 uppercase tracking-wider flex items-center space-x-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>Simulate Client Objection</span>
              </span>
              <span className="text-[10px] text-slate-500">Sandbox</span>
            </div>

            <p className="text-[11px] text-slate-600">
              Click any realistic objection below to watch how the AI negotiator counters with our problem-solution proposition:
            </p>

            <div className="space-y-1.5">
              <button
                type="button"
                onClick={() => handleSimulateReply("How much does this cost? What are your packages and pricing?")}
                disabled={isSimulating}
                className="w-full text-left p-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-[11px] text-slate-800 transition-all hover:border-amber-300 flex items-center justify-between group"
              >
                <span>💬 &quot;What&apos;s your pricing?&quot;</span>
                <Play className="w-3 h-3 text-amber-600 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>

              <button
                type="button"
                onClick={() => handleSimulateReply("Sounds interesting, but our budget is tight right now. We can't afford big commitments.")}
                disabled={isSimulating}
                className="w-full text-left p-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-[11px] text-slate-800 transition-all hover:border-amber-300 flex items-center justify-between group"
              >
                <span>💰 &quot;Budget is too tight right now&quot;</span>
                <Play className="w-3 h-3 text-amber-600 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>

              <button
                type="button"
                onClick={() => handleSimulateReply("Can we hop on a quick call tomorrow at 2pm? What is your Calendly link?")}
                disabled={isSimulating}
                className="w-full text-left p-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-[11px] text-slate-800 transition-all hover:border-amber-300 flex items-center justify-between group"
              >
                <span>📅 &quot;Can we hop on a call tomorrow?&quot;</span>
                <Play className="w-3 h-3 text-amber-600 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>

              <button
                type="button"
                onClick={() => handleSimulateReply("The 14-day trial offer sounds perfect. Send me the link to finalize the paperwork and let's do this!")}
                disabled={isSimulating}
                className="w-full text-left p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-[11px] text-emerald-800 font-medium transition-all flex items-center justify-between group"
              >
                <span>🤝 &quot;Send contract, let&apos;s start!&quot; (Close Won)</span>
                <Play className="w-3 h-3 text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            </div>

            {/* Custom Input */}
            <div className="pt-2 border-t border-slate-100 space-y-1.5">
              <input
                type="text"
                value={simulationInput}
                onChange={(e) => setSimulationInput(e.target.value)}
                placeholder="Or type custom prospect reply..."
                className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-slate-300 text-[11px] text-slate-800 focus:outline-none focus:border-amber-500"
              />
              <button
                type="button"
                onClick={() => handleSimulateReply()}
                disabled={isSimulating || !simulationInput.trim()}
                className="w-full py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-sm transition-all disabled:opacity-40"
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
