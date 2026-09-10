import React, { useState } from 'react';
import { 
  Search, Globe, Mail, Phone, MapPin, Plus, Check, Loader2, 
  ExternalLink, Sparkles, Filter, RefreshCw, Send, CheckCircle2 
} from 'lucide-react';
import api from '../api/client';

export default function LeadFinder({ onLeadsAdded, onStartOutreach, settings, onOpenSettings }) {
  const [tab, setTab] = useState('search'); // 'search' | 'scrape'
  
  // Search state
  const [query, setQuery] = useState('Dental Clinics');
  const [location, setLocation] = useState('Austin, TX');
  const [limit, setLimit] = useState(15);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [selectedIndices, setSelectedIndices] = useState(new Set());
  const [isAddingBulk, setIsAddingBulk] = useState(false);
  const [addedSuccess, setAddedSuccess] = useState('');
  const [autoSendingRowIndex, setAutoSendingRowIndex] = useState(null);
  const [sentRowIndices, setSentRowIndices] = useState(new Set());
  const [isBulkAutoSending, setIsBulkAutoSending] = useState(false);

  // Scrape single domain state
  const [scrapeUrl, setScrapeUrl] = useState('');
  const [isScraping, setIsScraping] = useState(false);
  const [scrapedData, setScrapedData] = useState(null);
  const [scrapeError, setScrapeError] = useState('');

  // Individual scraping within results table
  const [scrapingIndex, setScrapingIndex] = useState(null);

  const hasMapsApiKey = Boolean(settings?.serpApiKey || settings?.googlePlacesApiKey);

  const getLeadProblemSnippet = (lead) => {
    const cat = ((lead.category || '') + ' ' + (lead.company || '')).toLowerCase();
    if (cat.includes('dent') || cat.includes('clinic') || cat.includes('med') || cat.includes('doctor') || cat.includes('health')) {
      return { pain: 'Missing 30%+ after-hours patient inquiries', sol: '24/7 AI Intake & Appointment Concierge' };
    }
    if (cat.includes('law') || cat.includes('attorney') || cat.includes('legal') || cat.includes('counsel')) {
      return { pain: 'Slow case response times & lost retainers', sol: '60s Instant Case Screening & Booking' };
    }
    if (cat.includes('agency') || cat.includes('marketing') || cat.includes('seo') || cat.includes('design') || cat.includes('media')) {
      return { pain: 'Account management overhead & client churn', sol: 'Automated Client Ops, Reporting & Upsells' };
    }
    if (cat.includes('real estate') || cat.includes('realt') || cat.includes('property') || cat.includes('broker')) {
      return { pain: 'Weekend buyer lead dropoff & tour scheduling', sol: '24/7 Showing Concierge & Qualification' };
    }
    if (cat.includes('roof') || cat.includes('plumb') || cat.includes('hvac') || cat.includes('contractor') || cat.includes('electric')) {
      return { pain: 'Unanswered emergency calls & lost job quotes', sol: 'Instant Quote & Dispatch Workflow' };
    }
    if (cat.includes('account') || cat.includes('cpa') || cat.includes('tax') || cat.includes('financ')) {
      return { pain: 'Client document chasing & onboarding lag', sol: 'Automated Discovery & Tax Document Sync' };
    }
    if (cat.includes('tech') || cat.includes('software') || cat.includes('saas') || cat.includes('app')) {
      return { pain: 'Inbound demo dropoff & slow support resolution', sol: 'Automated Enterprise Demo Triage & AI Support' };
    }
    return { pain: 'Delayed responses & unclosed pipeline leads', sol: 'Automated 24/7 AI Lead Capture & Follow-up' };
  };

  const quickPresets = [
    { q: 'Dental Clinics', loc: 'Austin, TX', tag: 'Free OSM' },
    { q: 'Law Firms', loc: 'Austin, TX', tag: 'Free OSM' },
    { q: 'Medical Clinics', loc: 'New York, NY', tag: 'Free OSM' },
    { q: 'Digital Marketing Agency', loc: 'Austin, TX', tag: 'Needs Maps API' },
    { q: 'Software Companies', loc: 'San Francisco, CA', tag: 'Needs Maps API' }
  ];

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;

    setIsSearching(true);
    setHasSearched(true);
    setAddedSuccess('');
    setSelectedIndices(new Set());

    try {
      const res = await api.leads.search({ query, location, limit });
      setSearchResults(res.leads || []);
      // Pre-select all by default
      const all = new Set((res.leads || []).map((_, i) => i));
      setSelectedIndices(all);
    } catch (err) {
      console.error('Search error:', err);
      alert('Search failed: ' + err.message);
    } finally {
      setIsSearching(false);
    }
  };

  const toggleSelect = (index) => {
    const next = new Set(selectedIndices);
    if (next.has(index)) next.delete(index);
    else next.add(index);
    setSelectedIndices(next);
  };

  const toggleSelectAll = () => {
    if (selectedIndices.size === searchResults.length) {
      setSelectedIndices(new Set());
    } else {
      setSelectedIndices(new Set(searchResults.map((_, i) => i)));
    }
  };

  const handleBulkAdd = async () => {
    if (selectedIndices.size === 0) return;
    setIsAddingBulk(true);
    const leadsToAdd = searchResults.filter((_, idx) => selectedIndices.has(idx));

    try {
      const res = await api.leads.bulkAdd(leadsToAdd);
      setAddedSuccess(`Successfully imported ${res.count} leads into the sales pipeline!`);
      if (onLeadsAdded) onLeadsAdded();
    } catch (err) {
      alert('Failed to add leads: ' + err.message);
    } finally {
      setIsAddingBulk(false);
    }
  };

  // 1-Click Autonomous Pitch & Instant Send for a single row without asking
  const handleRowAutoSend = async (index, lead) => {
    setAutoSendingRowIndex(index);
    try {
      let leadId = lead.id;
      if (!leadId) {
        const createRes = await api.leads.create(lead);
        leadId = createRes.lead.id;
        lead = createRes.lead;
      }

      await api.outreach.autoSend(leadId, lead.email || null);
      setSentRowIndices(prev => new Set([...prev, index]));
      setAddedSuccess(`⚡ Auto-Sent tailored outreach to ${lead.company}!`);
      if (onLeadsAdded) onLeadsAdded();
    } catch (err) {
      alert(`Auto-send failed for ${lead.company}: ` + err.message);
    } finally {
      setAutoSendingRowIndex(null);
    }
  };

  // Bulk Autonomous Outreach to all selected leads
  const handleBulkAutoSend = async () => {
    if (selectedIndices.size === 0) return;
    setIsBulkAutoSending(true);
    const leadsToProcess = searchResults.filter((_, idx) => selectedIndices.has(idx));

    try {
      const res = await api.outreach.bulkAutoSend(leadsToProcess);
      setAddedSuccess(`⚡ Auto-Sent ${res.count} customized cold outreach emails without interruption!`);
      setSentRowIndices(prev => new Set([...prev, ...selectedIndices]));
      if (onLeadsAdded) onLeadsAdded();
    } catch (err) {
      alert('Bulk auto-send failed: ' + err.message);
    } finally {
      setIsBulkAutoSending(false);
    }
  };

  // Deep scrape & live web search an individual result to fetch real verified email
  const handleDeepScrapeRow = async (index, lead) => {
    setScrapingIndex(index);

    try {
      let foundEmail = '';
      if (lead.website) {
        try {
          const res = await api.leads.scrapeDomain(lead.website);
          if (res.data?.primaryEmail) {
            foundEmail = res.data.primaryEmail;
          }
        } catch (_) {}
      }

      // If website crawl didn't find an email, search live web hunter
      if (!foundEmail) {
        const hunterRes = await api.leads.findEmail(null, {
          company: lead.company,
          website: lead.website
        });
        if (hunterRes.email) {
          foundEmail = hunterRes.email;
        }
      }

      setSearchResults(prev => {
        const copy = [...prev];
        copy[index] = {
          ...copy[index],
          email: foundEmail || copy[index].email,
          scrapedDetails: true
        };
        return copy;
      });

      if (foundEmail) {
        setAddedSuccess(`Discovered verified email for ${lead.company}: ${foundEmail}`);
      } else {
        alert(`No verified email found for ${lead.company}. You can still click "Draft & Solve Problem" to add one manually.`);
      }
    } catch (err) {
      console.warn('Scraping error for row:', err.message);
    } finally {
      setScrapingIndex(null);
    }
  };

  // Single Domain Deep Scrape handler
  const handleSingleScrape = async (e) => {
    e.preventDefault();
    if (!scrapeUrl.trim()) return;

    setIsScraping(true);
    setScrapedData(null);
    setScrapeError('');

    try {
      const res = await api.leads.scrapeDomain(scrapeUrl);
      setScrapedData(res.data);
    } catch (err) {
      setScrapeError('Failed to scrape website: ' + err.message);
    } finally {
      setIsScraping(false);
    }
  };

  const handleSaveScrapedLead = async () => {
    if (!scrapedData) return;
    try {
      const domain = new URL(scrapedData.url).hostname.replace(/^www\./, '');
      const companyName = scrapedData.title.split(/[-–|:]/)[0].trim() || domain;

      const newLead = await api.leads.create({
        name: 'Managing Director',
        company: companyName,
        email: scrapedData.primaryEmail || `contact@${domain}`,
        phone: scrapedData.primaryPhone || '',
        website: scrapedData.url,
        notes: scrapedData.description || 'Deep website scan verified.',
        category: 'Website Scraped Prospect',
        source: 'Deep URL Scanner'
      });

      setAddedSuccess(`Saved "${companyName}" to pipeline! Opening AI Closer...`);
      if (onLeadsAdded) onLeadsAdded();
      if (onStartOutreach) onStartOutreach(newLead.lead);
    } catch (err) {
      alert('Could not save lead: ' + err.message);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Lead Prospecting & Scraper Engine</h1>
          <p className="text-xs text-slate-400">Discover businesses by industry, extract emails and contacts directly from their websites</p>
        </div>

        <div className="flex items-center space-x-2 bg-slate-900 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setTab('search')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center space-x-2 transition-all ${
              tab === 'search'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>Search by Niche & City</span>
          </button>
          <button
            onClick={() => setTab('scrape')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center space-x-2 transition-all ${
              tab === 'scrape'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Deep Single Website Scanner</span>
          </button>
        </div>
      </div>

      {addedSuccess && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span>{addedSuccess}</span>
          </div>
          <button onClick={() => setAddedSuccess('')} className="text-xs text-emerald-400 hover:underline">Dismiss</button>
        </div>
      )}

      {/* TAB 1: Search by Niche & Location */}
      {tab === 'search' && (
        <div className="space-y-6">
          
          {/* Live Google Maps API Status Banner */}
          {hasMapsApiKey ? (
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between shadow-sm">
              <div className="flex items-center space-x-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  <strong className="text-white">Live Google Maps API Connected:</strong> Searching real-time Google Places directory across any business niche worldwide.
                </span>
              </div>
              <button
                type="button"
                onClick={onOpenSettings}
                className="text-emerald-400 hover:text-emerald-300 underline font-semibold text-xs shrink-0 ml-3"
              >
                API Settings
              </button>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-950/60 via-slate-900 to-slate-900 border border-blue-500/30 text-xs text-slate-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
              <div className="space-y-1">
                <div className="flex items-center space-x-2 text-cyan-300 font-semibold">
                  <MapPin className="w-4 h-4 text-red-400 shrink-0" />
                  <span>Connect Live Google Maps & Places Search API</span>
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Free public OpenStreetMap is active for physical offices (Dentists, Lawyers, Clinics, Restaurants). To search Google Maps live for <strong>any niche</strong> (like Digital Marketing Agencies, SaaS, Tech Companies), connect a free <span className="text-cyan-300 font-semibold">SerpAPI Key</span> (100 free searches/month at serpapi.com) or <span className="text-cyan-300 font-semibold">Google Places Key</span>.
                </p>
              </div>
              <button
                type="button"
                onClick={onOpenSettings}
                className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shrink-0 transition-all shadow-md shadow-cyan-500/20"
              >
                Add Free Key in Settings
              </button>
            </div>
          )}

          {/* Search Form Card */}
          <div className="bg-slate-900/80 rounded-2xl p-6 border border-slate-800 shadow-xl">
            <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-12 gap-4">
              
              <div className="md:col-span-5 space-y-1">
                <label className="text-xs font-semibold text-slate-300">Industry / Keyword</label>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="e.g. Digital Marketing, Law Firms, Dentists..."
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700/70 text-white text-sm focus:outline-none focus:border-cyan-400"
                    required
                  />
                </div>
              </div>

              <div className="md:col-span-4 space-y-1">
                <label className="text-xs font-semibold text-slate-300">Location / City</label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Austin, TX or London or New York"
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700/70 text-white text-sm focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              <div className="md:col-span-3 flex items-end">
                <button
                  type="submit"
                  disabled={isSearching}
                  className="w-full py-2.5 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm shadow-lg shadow-cyan-500/25 flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
                >
                  {isSearching ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Scanning Web & Maps...</span>
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4" />
                      <span>Find Leads Now</span>
                    </>
                  )}
                </button>
              </div>

            </form>

            {/* Quick Presets */}
            <div className="mt-4 flex flex-wrap items-center gap-2 pt-3 border-t border-slate-800">
              <span className="text-xs text-slate-400">Quick Searches:</span>
              {quickPresets.map((p, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => { setQuery(p.q); setLocation(p.loc); }}
                  className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs transition-colors border border-slate-700/50"
                >
                  {p.q} • {p.loc}
                </button>
              ))}
            </div>
          </div>

          {/* Search Results Table */}
          {searchResults.length > 0 && (
            <div className="bg-slate-900/80 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
              
              {/* Table Header Controls */}
              <div className="p-4 bg-slate-900 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center space-x-3">
                  <button
                    onClick={toggleSelectAll}
                    className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium transition-colors"
                  >
                    {selectedIndices.size === searchResults.length ? 'Deselect All' : 'Select All'}
                  </button>
                  <span className="text-xs text-slate-400">
                    Showing <strong className="text-white">{searchResults.length}</strong> prospects • <strong className="text-cyan-400">{selectedIndices.size}</strong> selected
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={handleBulkAutoSend}
                    disabled={isBulkAutoSending || selectedIndices.size === 0}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 hover:from-amber-300 hover:to-rose-400 text-slate-950 text-xs font-extrabold shadow-md shadow-orange-500/20 flex items-center space-x-1.5 transition-all disabled:opacity-40"
                    title="Automatically generates tailored email for each business and sends immediately without asking"
                  >
                    {isBulkAutoSending ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Auto-Sending to All...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 fill-current" />
                        <span>⚡ Auto-Send to Selected ({selectedIndices.size})</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleBulkAdd}
                    disabled={isAddingBulk || selectedIndices.size === 0}
                    className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 flex items-center space-x-1.5 transition-all disabled:opacity-40"
                  >
                    {isAddingBulk ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Importing...</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-3.5 h-3.5" />
                        <span>Import Only</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-950/60 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
                      <th className="p-3.5 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={selectedIndices.size === searchResults.length && searchResults.length > 0}
                          onChange={toggleSelectAll}
                          className="rounded bg-slate-800 border-slate-700 text-cyan-500 focus:ring-0 cursor-pointer"
                        />
                      </th>
                      <th className="p-3.5">Company & Category</th>
                      <th className="p-3.5">Website & Verified Contacts</th>
                      <th className="p-3.5">Live Reach (Maps & LinkedIn)</th>
                      <th className="p-3.5">Location & Phone</th>
                      <th className="p-3.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-xs">
                    {searchResults.map((lead, idx) => {
                      const isSelected = selectedIndices.has(idx);
                      const isRowScraping = scrapingIndex === idx;

                      return (
                        <tr
                          key={idx}
                          className={`transition-colors hover:bg-slate-800/40 ${
                            isSelected ? 'bg-cyan-500/5' : ''
                          }`}
                        >
                          {/* Checkbox */}
                          <td className="p-3.5 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelect(idx)}
                              className="rounded bg-slate-800 border-slate-700 text-cyan-500 focus:ring-0 cursor-pointer"
                            />
                          </td>

                          {/* Company Name & Problem-Solution Diagnosis */}
                          <td className="p-3.5 max-w-[280px]">
                            <div className="font-bold text-white text-sm truncate" title={lead.company}>{lead.company}</div>
                            <span className="text-[11px] text-slate-400 capitalize">{lead.category}</span>
                            
                            {/* Problem & Solution Tags */}
                            {(() => {
                              const snippet = getLeadProblemSnippet(lead);
                              return (
                                <div className="mt-1.5 space-y-1">
                                  <div className="flex items-center space-x-1 text-[10px] text-rose-300 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20 truncate" title={`Problem: ${snippet.pain}`}>
                                    <span className="font-bold text-rose-400 shrink-0">Problem:</span>
                                    <span className="truncate">{snippet.pain}</span>
                                  </div>
                                  <div className="flex items-center space-x-1 text-[10px] text-emerald-300 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 truncate" title={`Solution: ${snippet.sol}`}>
                                    <span className="font-bold text-emerald-400 shrink-0">Solution:</span>
                                    <span className="truncate">{snippet.sol}</span>
                                  </div>
                                </div>
                              );
                            })()}
                          </td>

                          {/* Website & Email */}
                          <td className="p-3.5 space-y-1.5">
                            {lead.website ? (
                              <a
                                href={lead.website}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center space-x-1 text-cyan-400 hover:text-cyan-300 hover:underline max-w-[220px] truncate block font-semibold"
                                title={lead.website}
                              >
                                <Globe className="w-3.5 h-3.5 shrink-0" />
                                <span className="truncate">{lead.website.replace(/^https?:\/\/(www\.)?/, '')}</span>
                                <ExternalLink className="w-3 h-3 shrink-0 opacity-70 ml-1" />
                              </a>
                            ) : (
                              <span className="text-slate-500 text-[11px]">No official site listed</span>
                            )}

                            <div>
                              {lead.email ? (
                                <span className="inline-flex items-center space-x-1 text-slate-200 font-mono text-[11px] px-2 py-0.5 rounded bg-slate-800 border border-cyan-500/30">
                                  <Mail className="w-3 h-3 text-cyan-400" />
                                  <span>{lead.email}</span>
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleDeepScrapeRow(idx, lead)}
                                  disabled={isRowScraping}
                                  className="inline-flex items-center space-x-1 text-[11px] text-cyan-400 hover:text-cyan-300 font-bold underline disabled:opacity-50"
                                  title="Search website & live web for verified email"
                                >
                                  {isRowScraping ? (
                                    <>
                                      <Loader2 className="w-3 h-3 animate-spin text-cyan-400" />
                                      <span>Hunting email...</span>
                                    </>
                                  ) : (
                                    <>
                                      <Sparkles className="w-3 h-3" />
                                      <span>Find Real Email</span>
                                    </>
                                  )}
                                </button>
                              )}
                            </div>
                          </td>

                          {/* Live Reach: Google Maps & LinkedIn */}
                          <td className="p-3.5 space-y-1.5">
                            {/* Google Maps Button */}
                            {lead.mapsUrl && (
                              <div>
                                <a
                                  href={lead.mapsUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center space-x-1 px-2 py-1 rounded bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 hover:text-blue-300 border border-blue-500/30 text-[11px] font-semibold transition-colors"
                                >
                                  <MapPin className="w-3 h-3 text-red-400" />
                                  <span>View on Google Maps</span>
                                  <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                                </a>
                              </div>
                            )}

                            {/* LinkedIn Links */}
                            <div className="flex flex-wrap gap-1">
                              {lead.linkedinUrl && (
                                <a
                                  href={lead.linkedinUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-[#0077B5]/20 hover:bg-[#0077B5]/30 text-[#00a0dc] border border-[#0077B5]/40 text-[10px] font-semibold transition-colors"
                                >
                                  <span>LinkedIn Company</span>
                                  <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                                </a>
                              )}

                              {lead.linkedinPeopleUrl && (
                                <a
                                  href={lead.linkedinPeopleUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-semibold transition-colors"
                                >
                                  <span>Find Founder on LinkedIn</span>
                                  <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                                </a>
                              )}
                            </div>
                          </td>

                          {/* Location & Phone */}
                          <td className="p-3.5">
                            {lead.phone ? (
                              <div className="text-slate-200 font-mono text-[11px] flex items-center space-x-1 mb-0.5">
                                <Phone className="w-3 h-3 text-emerald-400" />
                                <span>{lead.phone}</span>
                              </div>
                            ) : (
                              <div className="text-slate-500 text-[11px] mb-0.5">No phone in directory</div>
                            )}
                            <div className="text-[11px] text-slate-400 truncate max-w-[200px]" title={lead.address}>
                              {lead.address}
                            </div>
                          </td>

                          {/* Action */}
                          <td className="p-3.5 text-right space-y-1.5 whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => handleRowAutoSend(idx, lead)}
                              disabled={autoSendingRowIndex === idx}
                              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold shadow transition-all inline-flex items-center space-x-1.5 ${
                                sentRowIndices.has(idx)
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : 'bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 hover:from-amber-300 hover:to-rose-400 text-slate-950 shadow-orange-500/20'
                              }`}
                              title="Generates tailored cold pitch and sends email immediately without asking"
                            >
                              {autoSendingRowIndex === idx ? (
                                <>
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                  <span>Auto-Sending...</span>
                                </>
                              ) : sentRowIndices.has(idx) ? (
                                <>
                                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                  <span>Sent!</span>
                                </>
                              ) : (
                                <>
                                  <Sparkles className="w-3 h-3 fill-current" />
                                  <span>⚡ Auto-Send</span>
                                </>
                              )}
                            </button>

                            <div>
                              <button
                                type="button"
                                onClick={async () => {
                                  const res = await api.leads.create(lead);
                                  if (onLeadsAdded) onLeadsAdded();
                                  if (onStartOutreach) onStartOutreach(res.lead);
                                }}
                                className="text-[10px] text-cyan-400 hover:text-cyan-300 font-bold hover:underline inline-flex items-center space-x-1"
                              >
                                <Sparkles className="w-2.5 h-2.5" />
                                <span>Draft &amp; Solve Problem</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

            </div>
          )}

          {/* Empty State when 0 leads found */}
          {hasSearched && searchResults.length === 0 && !isSearching && (
            <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-8 text-center shadow-xl space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 mx-auto flex items-center justify-center">
                <Search className="w-6 h-6" />
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h3 className="text-base font-bold text-white">0 Businesses Found for "{query}" in "{location}"</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  OpenStreetMap's public directory indexes registered physical amenities (e.g. Dental Clinics, Law Offices, Medical Centers).
                  {!hasMapsApiKey ? (
                    <>
                      {" "}To search Google Maps live for any industry or online business (e.g. Digital Marketing, SaaS), connect your free <strong className="text-cyan-400">SerpAPI Key</strong> (100 free searches at serpapi.com) or <strong className="text-cyan-400">Google Places Key</strong> in Settings.
                    </>
                  ) : (
                    <>
                      {" "}Try adjusting the keyword or searching a broader city.
                    </>
                  )}
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                {!hasMapsApiKey && (
                  <button
                    type="button"
                    onClick={onOpenSettings}
                    className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-md transition-all"
                  >
                    Open Settings & Add API Key
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => { setQuery('Dental Clinics'); setLocation('Austin, TX'); }}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs border border-slate-700 transition-colors"
                >
                  Try "Dental Clinics"
                </button>
                <button
                  type="button"
                  onClick={() => { setQuery('Law Firms'); setLocation('Austin, TX'); }}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs border border-slate-700 transition-colors"
                >
                  Try "Law Firms"
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Deep Single Website Scanner */}
      {tab === 'scrape' && (
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="bg-slate-900/80 rounded-2xl p-6 border border-slate-800 shadow-xl">
            <h2 className="text-lg font-bold text-white mb-2">Deep Website Contact Crawler</h2>
            <p className="text-xs text-slate-400 mb-5">
              Enter any company website. Our crawler scans the homepage, `/contact`, `/about`, and team pages to extract emails, phone numbers, and social links.
            </p>

            <form onSubmit={handleSingleScrape} className="flex gap-3">
              <div className="relative flex-1">
                <Globe className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                <input
                  type="text"
                  value={scrapeUrl}
                  onChange={(e) => setScrapeUrl(e.target.value)}
                  placeholder="e.g. https://acmedigital.com or stripe.com"
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700/70 text-white text-sm focus:outline-none focus:border-cyan-400"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isScraping}
                className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm shadow-md flex items-center space-x-2 transition-all disabled:opacity-50"
              >
                {isScraping ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Crawling Website...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Scrape Contacts</span>
                  </>
                )}
              </button>
            </form>

            {scrapeError && (
              <p className="text-xs text-rose-400 mt-3">{scrapeError}</p>
            )}
          </div>

          {/* Scraped Results Card */}
          {scrapedData && (
            <div className="bg-slate-900/90 rounded-2xl p-6 border border-slate-800 shadow-2xl space-y-5">
              <div className="flex items-start justify-between border-b border-slate-800 pb-4">
                <div>
                  <span className="px-2 py-0.5 text-[10px] uppercase font-bold rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Crawl Successful
                  </span>
                  <h3 className="text-xl font-bold text-white mt-1">{scrapedData.title || 'Target Website'}</h3>
                  <a
                    href={scrapedData.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-cyan-400 hover:underline inline-flex items-center space-x-1 mt-1"
                  >
                    <span>{scrapedData.url}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <button
                  onClick={handleSaveScrapedLead}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white text-xs font-bold shadow-lg shadow-cyan-500/20 flex items-center space-x-2 transition-all"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Add Lead & Start AI Outreach</span>
                </button>
              </div>

              {scrapedData.description && (
                <div>
                  <h4 className="text-xs font-semibold text-slate-400 mb-1">Company Summary:</h4>
                  <p className="text-xs text-slate-300 bg-slate-950 p-3 rounded-xl border border-slate-800">
                    {scrapedData.description}
                  </p>
                </div>
              )}

              {/* Extracted Emails */}
              <div>
                <h4 className="text-xs font-semibold text-slate-400 mb-2 flex items-center space-x-1.5">
                  <Mail className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Discovered Emails ({scrapedData.emails?.length || 0}):</span>
                </h4>
                <div className="flex flex-wrap gap-2">
                  {scrapedData.emails && scrapedData.emails.length > 0 ? (
                    scrapedData.emails.map((em, i) => (
                      <span key={i} className="px-3 py-1 rounded-lg bg-slate-950 border border-cyan-500/30 text-cyan-300 font-mono text-xs">
                        {em}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-500">No raw emails found in text. Generated domain email will be used.</span>
                  )}
                </div>
              </div>

              {/* Extracted Phone numbers */}
              {scrapedData.phones && scrapedData.phones.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-slate-400 mb-2 flex items-center space-x-1.5">
                    <Phone className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Discovered Phone Numbers:</span>
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {scrapedData.phones.map((ph, i) => (
                      <span key={i} className="px-3 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 text-xs">
                        {ph}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Discovered Socials */}
              {scrapedData.socials && Object.values(scrapedData.socials).some(Boolean) && (
                <div>
                  <h4 className="text-xs font-semibold text-slate-400 mb-2">Social Profiles:</h4>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(scrapedData.socials).map(([key, val]) => {
                      if (!val) return null;
                      return (
                        <a
                          key={key}
                          href={val}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 uppercase tracking-wider font-semibold border border-slate-700 transition-colors inline-flex items-center space-x-1"
                        >
                          <span>{key}</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}

            </div>
          )}
        </div>
      )}

    </div>
  );
}
