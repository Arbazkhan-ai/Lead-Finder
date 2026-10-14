import React, { useState } from 'react';
import { X, Save, Bot, Mail, ShieldCheck, Sparkles, Check, CheckCircle2, MapPin, Key } from 'lucide-react';
import api from '../api/client';

export default function SettingsModal({ isOpen, onClose, settings, onSettingsUpdated, initialTab = 'ai' }) {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState(initialTab || 'ai');

  React.useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab, isOpen]);

  const [formData, setFormData] = useState(() => {
    let localSaved = null;
    try {
      const raw = localStorage.getItem('leads_finder_settings');
      if (raw) localSaved = JSON.parse(raw);
    } catch (_) {}

    const src = localSaved || settings || {};
    return {
      serpApiKey: src?.serpApiKey || settings?.serpApiKey || '',
      googlePlacesApiKey: src?.googlePlacesApiKey || settings?.googlePlacesApiKey || '',
      smtp: {
        host: src?.smtp?.host || settings?.smtp?.host || 'smtp.gmail.com',
        port: src?.smtp?.port || settings?.smtp?.port || 587,
        user: src?.smtp?.user || settings?.smtp?.user || 'arbazkhanofficial140@gmail.com',
        pass: src?.smtp?.pass || settings?.smtp?.pass || '',
        fromName: src?.smtp?.fromName || settings?.smtp?.fromName || 'Arbaz Khan',
        fromEmail: src?.smtp?.fromEmail || settings?.smtp?.fromEmail || 'arbazkhanofficial140@gmail.com',
        secure: src?.smtp?.secure ?? settings?.smtp?.secure ?? false,
        simulatedMode: src?.smtp?.simulatedMode ?? settings?.smtp?.simulatedMode ?? false
      },
      ai: {
        provider: src?.ai?.provider || settings?.ai?.provider || 'built_in',
        apiKey: src?.ai?.apiKey || settings?.ai?.apiKey || '',
        businessName: src?.ai?.businessName || settings?.ai?.businessName || 'Arbaz Khan — AI Systems & Engineering',
        senderName: src?.ai?.senderName || settings?.ai?.senderName || 'Arbaz Khan',
        senderTitle: src?.ai?.senderTitle || settings?.ai?.senderTitle || 'AI Engineer & Systems Architect',
        productService: src?.ai?.productService || settings?.ai?.productService || 'Custom AI Solutions, LLM Pipelines & Intelligent Systems',
        pitchOffer: src?.ai?.pitchOffer || settings?.ai?.pitchOffer || 'I build production-grade AI systems, intelligent automation pipelines, and custom ML solutions that solve high-impact business problems. Portfolio: https://arbazkhaan.vercel.app/',
        pricingModel: src?.ai?.pricingModel || settings?.ai?.pricingModel || 'Project-Based & Retainers: Starting at $1,500. Special Offer: Free AI architectural audit & risk-free proof of concept.',
        bookingLink: src?.ai?.bookingLink || settings?.ai?.bookingLink || 'https://arbazkhaan.vercel.app/#contact',
        portfolioUrl: src?.ai?.portfolioUrl || settings?.ai?.portfolioUrl || 'https://arbazkhaan.vercel.app/',
        autopilot: src?.ai?.autopilot ?? settings?.ai?.autopilot ?? true
      }
    };
  });

  const [isSaving, setIsSaving] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);
  const [isTestingSmtp, setIsTestingSmtp] = useState(false);
  const [smtpTestResult, setSmtpTestResult] = useState(null);

  const handleTestSmtp = async () => {
    setIsTestingSmtp(true);
    setSmtpTestResult(null);
    try {
      const res = await api.settings.testSmtp(formData.smtp);

      // Auto-enable live sending and auto-save on successful test!
      const autoSaved = {
        ...formData,
        smtp: {
          ...formData.smtp,
          simulatedMode: false
        }
      };
      setFormData(autoSaved);
      try {
        localStorage.setItem('leads_finder_settings', JSON.stringify(autoSaved));
      } catch (_) {}

      api.settings.update(autoSaved).then(r => {
        if (onSettingsUpdated) onSettingsUpdated(r.settings || autoSaved);
      }).catch(() => {
        if (onSettingsUpdated) onSettingsUpdated(autoSaved);
      });

      setSmtpTestResult({
        success: true,
        message: `✓ SMTP Connected! Real test email was delivered to ${res.recipient || formData.smtp.user}. Safe Testing & Simulation Mode was automatically turned OFF!`
      });
    } catch (err) {
      setSmtpTestResult({
        success: false,
        message: err.message || 'SMTP Connection failed. Verify your Gmail address and 16-character App Password.'
      });
    } finally {
      setIsTestingSmtp(false);
    }
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    // Persist to localStorage immediately so a browser refresh never loses these settings
    try {
      localStorage.setItem('leads_finder_settings', JSON.stringify(formData));
    } catch (_) {}

    try {
      const res = await api.settings.update(formData);
      if (onSettingsUpdated) onSettingsUpdated(res.settings || formData);
      setSavedNotice(true);
      setTimeout(() => {
        setSavedNotice(false);
        onClose();
      }, 1000);
    } catch (err) {
      if (onSettingsUpdated) onSettingsUpdated(formData);
      alert('Settings saved in browser storage! (Backend response: ' + err.message + ')');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div>
            <h3 className="font-bold text-slate-900 text-base flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-blue-600" />
              <span>Platform Configuration &amp; AI Offer</span>
            </h3>
            <p className="text-xs text-slate-500">Configure your business pitch, closing offer, and email delivery</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-slate-200 bg-slate-50/50 px-4">
          <button
            onClick={() => setActiveTab('ai')}
            className={`py-3 px-4 text-xs font-semibold flex items-center space-x-2 border-b-2 transition-all ${
              activeTab === 'ai'
                ? 'border-blue-600 text-blue-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Bot className="w-4 h-4" />
            <span>AI Sales Closer &amp; Offer</span>
          </button>
          <button
            onClick={() => setActiveTab('smtp')}
            className={`py-3 px-4 text-xs font-semibold flex items-center space-x-2 border-b-2 transition-all ${
              activeTab === 'smtp'
                ? 'border-blue-600 text-blue-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Mail className="w-4 h-4" />
            <span>Email Delivery &amp; SMTP</span>
          </button>
          <button
            onClick={() => setActiveTab('maps')}
            className={`py-3 px-4 text-xs font-semibold flex items-center space-x-2 border-b-2 transition-all ${
              activeTab === 'maps'
                ? 'border-blue-600 text-blue-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <MapPin className="w-4 h-4 text-red-500" />
            <span>Google Maps &amp; Search API</span>
          </button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs max-h-[70vh] overflow-y-auto">
          
          {/* TAB 1: AI Closer & Offer Settings */}
          {activeTab === 'ai' && (
            <div className="space-y-4">
              
              {/* Autopilot Toggle */}
              <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 text-xs flex items-center space-x-1.5">
                    <ShieldCheck className="w-4 h-4 text-blue-600" />
                    <span>Autonomous AI Auto-Reply (Autopilot)</span>
                  </h4>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    When a lead replies with an objection or inquiry, AI automatically crafts and sends the counter-reply to drive towards closing.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.ai.autopilot}
                    onChange={(e) => setFormData({
                      ...formData,
                      ai: { ...formData.ai, autopilot: e.target.checked }
                    })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {/* Business Name & Sender */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-600 font-semibold block mb-1">Your Business / Agency Name</label>
                  <input
                    type="text"
                    value={formData.ai.businessName}
                    onChange={(e) => setFormData({ ...formData, ai: { ...formData.ai, businessName: e.target.value } })}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-800 focus:border-blue-500 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="text-slate-600 font-semibold block mb-1">Sender Name &amp; Title</label>
                  <input
                    type="text"
                    value={formData.ai.senderName}
                    onChange={(e) => setFormData({ ...formData, ai: { ...formData.ai, senderName: e.target.value } })}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-800 focus:border-blue-500 focus:outline-none"
                    placeholder="e.g. Alex Sterling, Founder"
                    required
                  />
                </div>
              </div>

              {/* Pitch Offer */}
              <div>
                <label className="text-slate-600 font-semibold block mb-1">Primary Value Proposition / Outreach Pitch</label>
                <textarea
                  rows={2}
                  value={formData.ai.pitchOffer}
                  onChange={(e) => setFormData({ ...formData, ai: { ...formData.ai, pitchOffer: e.target.value } })}
                  className="w-full p-3 rounded-xl bg-white border border-slate-300 text-slate-800 focus:border-blue-500 focus:outline-none text-xs"
                />
              </div>

              {/* Pricing & Deal Closing Offer */}
              <div>
                <label className="text-slate-600 font-semibold block mb-1">Pricing &amp; Objection-Crushing Closing Offer</label>
                <textarea
                  rows={2}
                  value={formData.ai.pricingModel}
                  onChange={(e) => setFormData({ ...formData, ai: { ...formData.ai, pricingModel: e.target.value } })}
                  className="w-full p-3 rounded-xl bg-white border border-slate-300 text-slate-800 focus:border-blue-500 focus:outline-none text-xs"
                  placeholder="Standard pricing and special discount / pilot offer when client objects on price"
                />
              </div>

              {/* Booking Link */}
              <div>
                <label className="text-slate-600 font-semibold block mb-1">Booking Calendar Link (Calendly / Cal.com / Meet)</label>
                <input
                  type="url"
                  value={formData.ai.bookingLink}
                  onChange={(e) => setFormData({ ...formData, ai: { ...formData.ai, bookingLink: e.target.value } })}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-800 focus:border-blue-500 focus:outline-none"
                  placeholder="https://calendly.com/yourname/intro"
                />
              </div>

              {/* AI Engine Provider */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-600 font-semibold block mb-1">AI Engine</label>
                  <select
                    value={formData.ai.provider}
                    onChange={(e) => setFormData({ ...formData, ai: { ...formData.ai, provider: e.target.value } })}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-800 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="built_in">Built-in Sales Closer (No API key required)</option>
                    <option value="openai">OpenAI (GPT-4o)</option>
                    <option value="gemini">Google Gemini</option>
                  </select>
                </div>

                {formData.ai.provider !== 'built_in' && (
                  <div>
                    <label className="text-slate-600 font-semibold block mb-1">API Key</label>
                    <input
                      type="password"
                      value={formData.ai.apiKey}
                      onChange={(e) => setFormData({ ...formData, ai: { ...formData.ai, apiKey: e.target.value } })}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-800 focus:border-blue-500 focus:outline-none"
                      placeholder="sk-..."
                    />
                  </div>
                )}
              </div>

            </div>
          )}

          {/* TAB 2: SMTP Settings */}
          {activeTab === 'smtp' && (
            <div className="space-y-4">

              {/* Gmail Live Connection Guide */}
              <div className="p-4 rounded-xl bg-blue-50/80 border border-blue-200 space-y-2">
                <div className="flex items-center space-x-2 text-blue-900 font-bold text-xs">
                  <Mail className="w-4 h-4 text-blue-600" />
                  <span>Send Real Emails from Your Gmail ({formData.smtp.user || 'arbazkhanofficial140@gmail.com'})</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  When Gmail is connected, every email you send through this platform will be sent directly from your Gmail account and <strong>will appear directly inside your Gmail Sent folder and Inbox</strong>!
                </p>
                <div className="bg-white p-3.5 rounded-lg border border-blue-200/70 text-[11px] text-slate-600 space-y-1.5 shadow-xs">
                  <div className="font-semibold text-slate-900 flex items-center justify-between">
                    <span>How to get your 16-character Gmail App Password (30 sec):</span>
                    <a
                      href="https://myaccount.google.com/apppasswords"
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 hover:underline inline-flex items-center space-x-1 text-[10px]"
                    >
                      <span>Google App Passwords Link &rarr;</span>
                    </a>
                  </div>
                  <ol className="list-decimal list-inside space-y-1 text-slate-600 text-[11px]">
                    <li>Open <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer" className="text-blue-600 underline">Google App Passwords</a> (ensure 2-Step Verification is active on your Google account).</li>
                    <li>Type App name: <code className="text-blue-700 bg-blue-50 px-1 py-0.5 rounded">Leads Finder</code> and click <strong>Create</strong>.</li>
                    <li>Copy the 16-character password (e.g. <code className="text-blue-700 bg-blue-50 px-1 py-0.5 rounded">xxxx xxxx xxxx xxxx</code>) and paste it into <strong>SMTP Password</strong> below.</li>
                    <li>Uncheck <strong>Safe Testing & Simulation Mode</strong> below and click <strong>Save Settings</strong>.</li>
                  </ol>
                </div>
              </div>
              
              {/* Simulation Mode Switch */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-slate-900 text-xs">Safe Testing & Simulation Mode</h4>
                    <p className="text-[11px] text-slate-600">
                      When checked, cold emails and replies are processed in test mode without emailing real inboxes. Uncheck this once you add your Gmail App Password to send real live emails!
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.smtp.simulatedMode}
                    onChange={(e) => setFormData({
                      ...formData,
                      smtp: { ...formData.smtp, simulatedMode: e.target.checked }
                    })}
                    className="rounded bg-white border-slate-300 text-blue-600 focus:ring-0 w-4 h-4 cursor-pointer"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-600 font-semibold block mb-1">Sender From Name</label>
                  <input
                    type="text"
                    value={formData.smtp.fromName}
                    onChange={(e) => setFormData({ ...formData, smtp: { ...formData.smtp, fromName: e.target.value } })}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-slate-600 font-semibold block mb-1">Sender From Email</label>
                  <input
                    type="email"
                    value={formData.smtp.fromEmail}
                    onChange={(e) => setFormData({ ...formData, smtp: { ...formData.smtp, fromEmail: e.target.value } })}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 focus:border-blue-500 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="text-slate-600 font-semibold block mb-1">SMTP Host</label>
                  <input
                    type="text"
                    value={formData.smtp.host}
                    onChange={(e) => setFormData({ ...formData, smtp: { ...formData.smtp, host: e.target.value } })}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 focus:border-blue-500 focus:outline-none font-mono"
                    placeholder="smtp.gmail.com"
                  />
                </div>
                <div>
                  <label className="text-slate-600 font-semibold block mb-1">Port</label>
                  <input
                    type="number"
                    value={formData.smtp.port}
                    onChange={(e) => setFormData({ ...formData, smtp: { ...formData.smtp, port: Number(e.target.value) } })}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 focus:border-blue-500 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-600 font-semibold block mb-1">SMTP Username / Email</label>
                  <input
                    type="text"
                    value={formData.smtp.user}
                    onChange={(e) => setFormData({ ...formData, smtp: { ...formData.smtp, user: e.target.value } })}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 focus:border-blue-500 focus:outline-none font-mono"
                    placeholder="your-email@gmail.com"
                  />
                </div>
                <div>
                  <label className="text-slate-600 font-semibold block mb-1">SMTP Password / App Password</label>
                  <input
                    type="password"
                    value={formData.smtp.pass}
                    onChange={(e) => setFormData({ ...formData, smtp: { ...formData.smtp, pass: e.target.value } })}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 focus:border-blue-500 focus:outline-none font-mono"
                    placeholder="••••••••••••"
                  />
                </div>
              </div>

              {/* Test Connection Button & Result */}
              <div className="pt-2 border-t border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h5 className="text-xs font-bold text-slate-800">Test Live Delivery</h5>
                    <p className="text-[11px] text-slate-500">Sends an instant test email to your Gmail address to verify connection.</p>
                  </div>
                  <button
                    type="button"
                    disabled={isTestingSmtp || !formData.smtp.pass}
                    onClick={handleTestSmtp}
                    className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition-all disabled:opacity-50 flex items-center space-x-1.5 shadow-xs"
                  >
                    {isTestingSmtp ? (
                      <>
                        <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                        <span>Verifying...</span>
                      </>
                    ) : (
                      <>
                        <Mail className="w-3.5 h-3.5 text-blue-400" />
                        <span>Send Test Email</span>
                      </>
                    )}
                  </button>
                </div>

                {smtpTestResult && (
                  <div
                    className={`p-3 rounded-xl text-xs font-medium border animate-in fade-in duration-150 ${
                      smtpTestResult.success
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-rose-50 text-rose-800 border-rose-200'
                    }`}
                  >
                    {smtpTestResult.message}
                  </div>
                )}
              </div>

            </div>
          )}

          {/* TAB 3: Google Maps & SerpAPI Settings */}
          {activeTab === 'maps' && (
            <div className="space-y-4">
              
              <div className="p-4 rounded-xl bg-blue-50/80 border border-blue-200 space-y-1">
                <h4 className="font-bold text-slate-900 text-xs flex items-center space-x-1.5">
                  <MapPin className="w-4 h-4 text-blue-600" />
                  <span>Real Google Maps & Places Lead Discovery</span>
                </h4>
                <p className="text-[11px] text-slate-600">
                  Enter your free SerpAPI or Google Places key to search live Google Maps for any industry in any city worldwide with verified physical addresses, phone numbers, and websites.
                </p>
              </div>

              {/* SerpAPI Key */}
              <div className="space-y-1.5 p-3.5 rounded-xl bg-white border border-slate-200">
                <div className="flex items-center justify-between">
                  <label className="text-slate-700 font-semibold flex items-center space-x-1">
                    <Key className="w-3.5 h-3.5 text-blue-600" />
                    <span>SerpAPI Key (Recommended • 100 Free Searches/Month)</span>
                  </label>
                  <a
                    href="https://serpapi.com/"
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 hover:underline text-[11px] font-semibold"
                  >
                    Get Free Key at SerpAPI.com &rarr;
                  </a>
                </div>
                <input
                  type="password"
                  value={formData.serpApiKey}
                  onChange={(e) => setFormData({ ...formData, serpApiKey: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-none font-mono text-xs"
                  placeholder="Paste your SerpAPI key here..."
                />
                <p className="text-[10px] text-slate-500">
                  Scrapes Google Maps Places directly with zero bot blocks, pulling official websites, reviews, and phone numbers.
                </p>
              </div>

              {/* Google Places API Key */}
              <div className="space-y-1.5 p-3.5 rounded-xl bg-white border border-slate-200">
                <div className="flex items-center justify-between">
                  <label className="text-slate-700 font-semibold flex items-center space-x-1">
                    <Key className="w-3.5 h-3.5 text-blue-600" />
                    <span>Google Places API Key ($200 Monthly Free Credit)</span>
                  </label>
                  <a
                    href="https://console.cloud.google.com/google/maps-apis/"
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 hover:underline text-[11px] font-semibold"
                  >
                    Google Cloud Console &rarr;
                  </a>
                </div>
                <input
                  type="password"
                  value={formData.googlePlacesApiKey}
                  onChange={(e) => setFormData({ ...formData, googlePlacesApiKey: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-none font-mono text-xs"
                  placeholder="AIzaSy..."
                />
                <p className="text-[10px] text-slate-500">
                  Official Google Maps Platform Text Search & Place Details API.
                </p>
              </div>

            </div>
          )}

          {/* Footer Save Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
            {savedNotice ? (
              <span className="text-xs text-emerald-600 font-semibold flex items-center space-x-1">
                <CheckCircle2 className="w-4 h-4" />
                <span>Settings saved successfully!</span>
              </span>
            ) : (
              <span></span>
            )}

            <div className="flex space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs transition-colors"
              >
                Close
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm flex items-center space-x-1.5 transition-colors"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'Saving...' : 'Save Settings'}</span>
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
}
