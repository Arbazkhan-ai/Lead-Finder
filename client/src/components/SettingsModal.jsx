import React, { useState } from 'react';
import { X, Save, Bot, Mail, ShieldCheck, Sparkles, Check, CheckCircle2, MapPin, Key } from 'lucide-react';
import api from '../api/client';

export default function SettingsModal({ isOpen, onClose, settings, onSettingsUpdated }) {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState('ai'); // 'ai' | 'smtp' | 'maps'
  const [formData, setFormData] = useState({
    serpApiKey: settings?.serpApiKey || '',
    googlePlacesApiKey: settings?.googlePlacesApiKey || '',
    smtp: {
      host: settings?.smtp?.host || 'smtp.gmail.com',
      port: settings?.smtp?.port || 587,
      user: settings?.smtp?.user || 'arbazkhanofficial@gmail.com',
      pass: settings?.smtp?.pass || '',
      fromName: settings?.smtp?.fromName || 'Arbaz Khan',
      fromEmail: settings?.smtp?.fromEmail || 'arbazkhanofficial@gmail.com',
      secure: settings?.smtp?.secure || false,
      simulatedMode: settings?.smtp?.simulatedMode ?? true
    },
    ai: {
      provider: settings?.ai?.provider || 'built_in',
      apiKey: settings?.ai?.apiKey || '',
      businessName: settings?.ai?.businessName || 'Arbaz Khan — AI Systems & Engineering',
      senderName: settings?.ai?.senderName || 'Arbaz Khan',
      senderTitle: settings?.ai?.senderTitle || 'AI Engineer & Systems Architect',
      productService: settings?.ai?.productService || 'Custom AI Solutions, LLM Pipelines & Intelligent Systems',
      pitchOffer: settings?.ai?.pitchOffer || 'I build production-grade AI systems, intelligent automation pipelines, and custom ML solutions that solve high-impact business problems. Portfolio: https://arbazkhaan.vercel.app/',
      pricingModel: settings?.ai?.pricingModel || 'Project-Based & Retainers: Starting at $1,500. Special Offer: Free AI architectural audit & risk-free proof of concept.',
      bookingLink: settings?.ai?.bookingLink || 'https://arbazkhaan.vercel.app/#contact',
      portfolioUrl: settings?.ai?.portfolioUrl || 'https://arbazkhaan.vercel.app/',
      autopilot: settings?.ai?.autopilot ?? true
    }
  });

  const [isSaving, setIsSaving] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await api.settings.update(formData);
      if (onSettingsUpdated) onSettingsUpdated(res.settings);
      setSavedNotice(true);
      setTimeout(() => {
        setSavedNotice(false);
        onClose();
      }, 1000);
    } catch (err) {
      alert('Failed to save settings: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div>
            <h3 className="font-bold text-white text-base flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-cyan-400" />
              <span>Platform Configuration & AI Offer</span>
            </h3>
            <p className="text-xs text-slate-400">Configure your business pitch, closing offer, and email delivery</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-slate-800 bg-slate-950/30 px-4">
          <button
            onClick={() => setActiveTab('ai')}
            className={`py-3 px-4 text-xs font-semibold flex items-center space-x-2 border-b-2 transition-all ${
              activeTab === 'ai'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Bot className="w-4 h-4" />
            <span>AI Sales Closer & Offer</span>
          </button>
          <button
            onClick={() => setActiveTab('smtp')}
            className={`py-3 px-4 text-xs font-semibold flex items-center space-x-2 border-b-2 transition-all ${
              activeTab === 'smtp'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Mail className="w-4 h-4" />
            <span>Email Delivery & SMTP</span>
          </button>
          <button
            onClick={() => setActiveTab('maps')}
            className={`py-3 px-4 text-xs font-semibold flex items-center space-x-2 border-b-2 transition-all ${
              activeTab === 'maps'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <MapPin className="w-4 h-4 text-red-400" />
            <span>Google Maps & Search API</span>
          </button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs max-h-[70vh] overflow-y-auto">
          
          {/* TAB 1: AI Closer & Offer Settings */}
          {activeTab === 'ai' && (
            <div className="space-y-4">
              
              {/* Autopilot Toggle */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-cyan-950/40 to-blue-950/40 border border-cyan-500/30 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-white text-xs flex items-center space-x-1.5">
                    <ShieldCheck className="w-4 h-4 text-cyan-400" />
                    <span>Autonomous AI Auto-Reply (Autopilot)</span>
                  </h4>
                  <p className="text-[11px] text-slate-300 mt-0.5">
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
                  <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
                </label>
              </div>

              {/* Business Name & Sender */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 font-semibold block mb-1">Your Business / Agency Name</label>
                  <input
                    type="text"
                    value={formData.ai.businessName}
                    onChange={(e) => setFormData({ ...formData, ai: { ...formData.ai, businessName: e.target.value } })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:border-cyan-400 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="text-slate-400 font-semibold block mb-1">Sender Name & Title</label>
                  <input
                    type="text"
                    value={formData.ai.senderName}
                    onChange={(e) => setFormData({ ...formData, ai: { ...formData.ai, senderName: e.target.value } })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:border-cyan-400 focus:outline-none"
                    placeholder="e.g. Alex Sterling, Founder"
                    required
                  />
                </div>
              </div>

              {/* Pitch Offer */}
              <div>
                <label className="text-slate-400 font-semibold block mb-1">Primary Value Proposition / Outreach Pitch</label>
                <textarea
                  rows={2}
                  value={formData.ai.pitchOffer}
                  onChange={(e) => setFormData({ ...formData, ai: { ...formData.ai, pitchOffer: e.target.value } })}
                  className="w-full p-3 rounded-xl bg-slate-950 border border-slate-700 text-white focus:border-cyan-400 focus:outline-none text-xs"
                />
              </div>

              {/* Pricing & Deal Closing Offer */}
              <div>
                <label className="text-slate-400 font-semibold block mb-1">Pricing & Objection-Crushing Closing Offer</label>
                <textarea
                  rows={2}
                  value={formData.ai.pricingModel}
                  onChange={(e) => setFormData({ ...formData, ai: { ...formData.ai, pricingModel: e.target.value } })}
                  className="w-full p-3 rounded-xl bg-slate-950 border border-slate-700 text-white focus:border-cyan-400 focus:outline-none text-xs"
                  placeholder="Standard pricing and special discount / pilot offer when client objects on price"
                />
              </div>

              {/* Booking Link */}
              <div>
                <label className="text-slate-400 font-semibold block mb-1">Booking Calendar Link (Calendly / Cal.com / Meet)</label>
                <input
                  type="url"
                  value={formData.ai.bookingLink}
                  onChange={(e) => setFormData({ ...formData, ai: { ...formData.ai, bookingLink: e.target.value } })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:border-cyan-400 focus:outline-none"
                  placeholder="https://calendly.com/yourname/intro"
                />
              </div>

              {/* AI Engine Provider */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 font-semibold block mb-1">AI Engine</label>
                  <select
                    value={formData.ai.provider}
                    onChange={(e) => setFormData({ ...formData, ai: { ...formData.ai, provider: e.target.value } })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:border-cyan-400 focus:outline-none"
                  >
                    <option value="built_in">Built-in Sales Closer (No API key required)</option>
                    <option value="openai">OpenAI (GPT-4o)</option>
                    <option value="gemini">Google Gemini</option>
                  </select>
                </div>

                {formData.ai.provider !== 'built_in' && (
                  <div>
                    <label className="text-slate-400 font-semibold block mb-1">API Key</label>
                    <input
                      type="password"
                      value={formData.ai.apiKey}
                      onChange={(e) => setFormData({ ...formData, ai: { ...formData.ai, apiKey: e.target.value } })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:border-cyan-400 focus:outline-none"
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
              <div className="p-4 rounded-xl bg-gradient-to-r from-blue-950/60 to-slate-900 border border-blue-500/30 space-y-2">
                <div className="flex items-center space-x-2 text-cyan-300 font-bold text-xs">
                  <Mail className="w-4 h-4 text-cyan-400" />
                  <span>Send Real Emails from Your Gmail (arbazkhanofficial@gmail.com)</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  When Gmail is connected, every email you send through this platform will be sent directly from your Gmail account and <strong>will appear directly inside your Gmail Sent folder and Inbox</strong>!
                </p>
                <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800 text-[11px] text-slate-300 space-y-1.5">
                  <div className="font-semibold text-white flex items-center justify-between">
                    <span>How to get your 16-character Gmail App Password (30 sec):</span>
                    <a
                      href="https://myaccount.google.com/apppasswords"
                      target="_blank"
                      rel="noreferrer"
                      className="text-cyan-400 hover:underline inline-flex items-center space-x-1 text-[10px]"
                    >
                      <span>Google App Passwords Link →</span>
                    </a>
                  </div>
                  <ol className="list-decimal list-inside space-y-1 text-slate-400 text-[11px]">
                    <li>Open <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer" className="text-cyan-400 underline">Google App Passwords</a> (ensure 2-Step Verification is active on your Google account).</li>
                    <li>Type App name: <code className="text-cyan-300 bg-slate-900 px-1 py-0.5 rounded">Leads Finder</code> and click <strong>Create</strong>.</li>
                    <li>Copy the 16-character password (e.g. <code className="text-cyan-300 bg-slate-900 px-1 py-0.5 rounded">xxxx xxxx xxxx xxxx</code>) and paste it into <strong>SMTP Password</strong> below.</li>
                    <li>Uncheck <strong>Safe Testing & Simulation Mode</strong> below and click <strong>Save Settings</strong>.</li>
                  </ol>
                </div>
              </div>
              
              {/* Simulation Mode Switch */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-white text-xs">Safe Testing & Simulation Mode</h4>
                    <p className="text-[11px] text-slate-400">
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
                    className="rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-0 w-4 h-4 cursor-pointer"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 font-semibold block mb-1">Sender From Name</label>
                  <input
                    type="text"
                    value={formData.smtp.fromName}
                    onChange={(e) => setFormData({ ...formData, smtp: { ...formData.smtp, fromName: e.target.value } })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:border-cyan-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-slate-400 font-semibold block mb-1">Sender From Email</label>
                  <input
                    type="email"
                    value={formData.smtp.fromEmail}
                    onChange={(e) => setFormData({ ...formData, smtp: { ...formData.smtp, fromEmail: e.target.value } })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:border-cyan-400 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="text-slate-400 font-semibold block mb-1">SMTP Host</label>
                  <input
                    type="text"
                    value={formData.smtp.host}
                    onChange={(e) => setFormData({ ...formData, smtp: { ...formData.smtp, host: e.target.value } })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:border-cyan-400 focus:outline-none font-mono"
                    placeholder="smtp.gmail.com"
                  />
                </div>
                <div>
                  <label className="text-slate-400 font-semibold block mb-1">Port</label>
                  <input
                    type="number"
                    value={formData.smtp.port}
                    onChange={(e) => setFormData({ ...formData, smtp: { ...formData.smtp, port: Number(e.target.value) } })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:border-cyan-400 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 font-semibold block mb-1">SMTP Username / Email</label>
                  <input
                    type="text"
                    value={formData.smtp.user}
                    onChange={(e) => setFormData({ ...formData, smtp: { ...formData.smtp, user: e.target.value } })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:border-cyan-400 focus:outline-none font-mono"
                    placeholder="your-email@gmail.com"
                  />
                </div>
                <div>
                  <label className="text-slate-400 font-semibold block mb-1">SMTP Password / App Password</label>
                  <input
                    type="password"
                    value={formData.smtp.pass}
                    onChange={(e) => setFormData({ ...formData, smtp: { ...formData.smtp, pass: e.target.value } })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:border-cyan-400 focus:outline-none font-mono"
                    placeholder="••••••••••••"
                  />
                </div>
              </div>

            </div>
          )}

          {/* TAB 3: Google Maps & SerpAPI Settings */}
          {activeTab === 'maps' && (
            <div className="space-y-4">
              
              <div className="p-4 rounded-xl bg-gradient-to-r from-blue-950/40 to-slate-900 border border-blue-500/30 space-y-1">
                <h4 className="font-bold text-white text-xs flex items-center space-x-1.5">
                  <MapPin className="w-4 h-4 text-red-400" />
                  <span>Real Google Maps & Places Lead Discovery</span>
                </h4>
                <p className="text-[11px] text-slate-300">
                  Enter your free SerpAPI or Google Places key to search live Google Maps for any industry in any city worldwide with verified physical addresses, phone numbers, and websites.
                </p>
              </div>

              {/* SerpAPI Key */}
              <div className="space-y-1.5 p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="text-slate-300 font-semibold flex items-center space-x-1">
                    <Key className="w-3.5 h-3.5 text-cyan-400" />
                    <span>SerpAPI Key (Recommended • 100 Free Searches/Month)</span>
                  </label>
                  <a
                    href="https://serpapi.com/"
                    target="_blank"
                    rel="noreferrer"
                    className="text-cyan-400 hover:underline text-[11px] font-semibold"
                  >
                    Get Free Key at SerpAPI.com →
                  </a>
                </div>
                <input
                  type="password"
                  value={formData.serpApiKey}
                  onChange={(e) => setFormData({ ...formData, serpApiKey: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white focus:border-cyan-400 focus:outline-none font-mono text-xs"
                  placeholder="Paste your SerpAPI key here..."
                />
                <p className="text-[10px] text-slate-400">
                  Scrapes Google Maps Places directly with zero bot blocks, pulling official websites, reviews, and phone numbers.
                </p>
              </div>

              {/* Google Places API Key */}
              <div className="space-y-1.5 p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="text-slate-300 font-semibold flex items-center space-x-1">
                    <Key className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Google Places API Key ($200 Monthly Free Credit)</span>
                  </label>
                  <a
                    href="https://console.cloud.google.com/google/maps-apis/"
                    target="_blank"
                    rel="noreferrer"
                    className="text-cyan-400 hover:underline text-[11px] font-semibold"
                  >
                    Google Cloud Console →
                  </a>
                </div>
                <input
                  type="password"
                  value={formData.googlePlacesApiKey}
                  onChange={(e) => setFormData({ ...formData, googlePlacesApiKey: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white focus:border-cyan-400 focus:outline-none font-mono text-xs"
                  placeholder="AIzaSy..."
                />
                <p className="text-[10px] text-slate-400">
                  Official Google Maps Platform Text Search & Place Details API.
                </p>
              </div>

            </div>
          )}

          {/* Footer Save Actions */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
            {savedNotice ? (
              <span className="text-xs text-emerald-400 font-semibold flex items-center space-x-1">
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
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium"
              >
                Close
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold shadow-md shadow-cyan-500/20 flex items-center space-x-1.5"
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
