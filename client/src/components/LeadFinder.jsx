import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, Globe, Mail, Phone, MapPin, Plus, Check, Loader2, 
  ExternalLink, Sparkles, Filter, RefreshCw, Send, CheckCircle2,
  FileSpreadsheet, Download, Database, Share2, Copy, LayoutGrid,
  List, ShieldAlert, FolderDown, Award, Layers, Upload
} from 'lucide-react';
import api from '../api/client';

export default function LeadFinder({ onLeadsAdded, onStartOutreach, settings, onOpenSettings }) {
  const [tab, setTab] = useState('search'); // 'search' | 'scrape' | 'upload' | 'vault'
  
  // Search state (default to 100 leads across Websites, Facebook, Instagram & LinkedIn)
  const [query, setQuery] = useState('Dental Clinics');
  const [location, setLocation] = useState('Austin, TX');
  const [limit, setLimit] = useState(100);
  const [platforms, setPlatforms] = useState(['websites', 'facebook', 'instagram', 'linkedin']);
  const [autoDownloadExcel, setAutoDownloadExcel] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [scrapePhase, setScrapePhase] = useState(0);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [latestExcelFile, setLatestExcelFile] = useState(null);
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [selectedIndices, setSelectedIndices] = useState(new Set());
  const [isAddingBulk, setIsAddingBulk] = useState(false);
  const [addedSuccess, setAddedSuccess] = useState('');
  const [autoSendingRowIndex, setAutoSendingRowIndex] = useState(null);
  const [sentRowIndices, setSentRowIndices] = useState(new Set());
  const [isBulkAutoSending, setIsBulkAutoSending] = useState(false);

  // Results interactive filter & view state
  const [resultFilter, setResultFilter] = useState('all'); // 'all' | 'email' | 'phone' | 'social' | 'audited'
  const [resultSearchText, setResultSearchText] = useState('');
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'grid'
  const [copiedEmailsToast, setCopiedEmailsToast] = useState(false);

  // Scrape single domain / social URL state
  const [scrapeUrl, setScrapeUrl] = useState('');
  const [isScraping, setIsScraping] = useState(false);
  const [scrapedData, setScrapedData] = useState(null);
  const [singleExcelFile, setSingleExcelFile] = useState(null);
  const [scrapeError, setScrapeError] = useState('');

  // Manual Scraper File Upload (.xlsx / .xls / .csv) to Email state
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [uploadedFileBase64, setUploadedFileBase64] = useState('');
  const [uploadedFileSize, setUploadedFileSize] = useState(0);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [enrichMissingEmails, setEnrichMissingEmails] = useState(true);
  const [uploadEmailMode, setUploadEmailMode] = useState('ai_tailored'); // 'ai_tailored' | 'custom_template'
  const [customSubject, setCustomSubject] = useState('Quick question regarding {company}');
  const [customBody, setCustomBody] = useState(
    'Hi {firstName},\n\nI came across {company} ({website}) and noticed an opportunity to help you capture and convert more inbound clients automatically 24/7.\n\nWould you be open to a quick 5-minute walkthrough this week?\n\nBest regards,\nArbaz Khan'
  );
  const [isProcessingUpload, setIsProcessingUpload] = useState(false);
  const [uploadActionType, setUploadActionType] = useState(''); // 'load' | 'email_all'
  const [uploadError, setUploadError] = useState('');
  const [uploadReport, setUploadReport] = useState(null);
  const [vaultLoadingFile, setVaultLoadingFile] = useState('');

  // Excel Vault state
  const [exportedFiles, setExportedFiles] = useState([]);
  const [exportsDir, setExportsDir] = useState('');
  const [isLoadingVault, setIsLoadingVault] = useState(false);

  // Individual scraping within results table
  const [scrapingIndex, setScrapingIndex] = useState(null);

  const hasMapsApiKey = Boolean(settings?.serpApiKey || settings?.googlePlacesApiKey);

  // Animate scraping progress steps while isSearching is true
  useEffect(() => {
    if (!isSearching) {
      setScrapePhase(0);
      return;
    }
    setScrapePhase(1);
    const t1 = setTimeout(() => setScrapePhase(2), 2500);
    const t2 = setTimeout(() => setScrapePhase(3), 6000);
    const t3 = setTimeout(() => setScrapePhase(4), 11000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [isSearching]);

  // Load saved Excel files when switching to Vault tab
  useEffect(() => {
    if (tab === 'vault') {
      loadExcelVault();
    }
  }, [tab]);

  const loadExcelVault = async () => {
    setIsLoadingVault(true);
    try {
      const res = await api.leads.getExports();
      setExportedFiles(res.files || []);
      setExportsDir(res.exportsDir || '');
    } catch (err) {
      console.error('Vault load error:', err);
    } finally {
      setIsLoadingVault(false);
    }
  };

  const togglePlatform = (p) => {
    setPlatforms(prev => {
      if (prev.includes(p)) {
        if (prev.length === 1) return prev;
        return prev.filter(item => item !== p);
      }
      return [...prev, p];
    });
  };

  const triggerExcelDownload = (downloadUrl, fileName) => {
    if (!downloadUrl) return;
    const link = document.createElement('a');
    link.href = downloadUrl;
    if (fileName) link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
    { q: 'Dental Clinics', loc: 'Austin, TX', icon: '🦷' },
    { q: 'Law Firms', loc: 'Austin, TX', icon: '⚖️' },
    { q: 'Medical Clinics', loc: 'New York, NY', icon: '🏥' },
    { q: 'Real Estate', loc: 'Miami, FL', icon: '🏢' },
    { q: 'Digital Marketing Agency', loc: 'Austin, TX', icon: '📈' },
    { q: 'Software Companies', loc: 'San Francisco, CA', icon: '💻' },
    { q: 'Roofing Contractors', loc: 'Dallas, TX', icon: '🔨' }
  ];

  // Computed metrics & filtered results
  const metrics = useMemo(() => {
    const total = searchResults.length;
    const withEmail = searchResults.filter(l => Boolean(l.email)).length;
    const withPhone = searchResults.filter(l => Boolean(l.phone)).length;
    const withSocial = searchResults.filter(l => Boolean(l.socials?.facebook || l.socials?.instagram || l.socials?.linkedin)).length;
    const withAudit = searchResults.filter(l => Boolean(l.websiteAudit)).length;
    return { total, withEmail, withPhone, withSocial, withAudit };
  }, [searchResults]);

  const filteredResults = useMemo(() => {
    return searchResults
      .map((lead, originalIndex) => ({ lead, originalIndex }))
      .filter(({ lead }) => {
        if (resultFilter === 'email' && !lead.email) return false;
        if (resultFilter === 'phone' && !lead.phone) return false;
        if (resultFilter === 'social' && !(lead.socials?.facebook || lead.socials?.instagram || lead.socials?.linkedin)) return false;
        if (resultFilter === 'audited' && !lead.websiteAudit) return false;

        if (resultSearchText.trim()) {
          const q = resultSearchText.toLowerCase();
          const hay = `${lead.company || ''} ${lead.name || ''} ${lead.email || ''} ${lead.phone || ''} ${lead.website || ''} ${lead.source || ''}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      });
  }, [searchResults, resultFilter, resultSearchText]);

  const handleCopyAllEmails = () => {
    const emails = searchResults
      .flatMap(l => (Array.isArray(l.allEmails) && l.allEmails.length > 0 ? l.allEmails : l.email ? [l.email] : []))
      .filter(Boolean);
    const uniqueEmails = Array.from(new Set(emails));
    if (uniqueEmails.length === 0) {
      alert('No verified emails in current results to copy yet.');
      return;
    }
    navigator.clipboard.writeText(uniqueEmails.join('\n'));
    setCopiedEmailsToast(true);
    setTimeout(() => setCopiedEmailsToast(false), 3000);
  };

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;

    setIsSearching(true);
    setHasSearched(true);
    setAddedSuccess('');
    setLatestExcelFile(null);
    setResultFilter('all');
    setResultSearchText('');
    setSelectedIndices(new Set());

    try {
      const res = await api.leads.search({
        query,
        location,
        limit: Number(limit),
        platforms
      });
      const leads = res.leads || [];
      setSearchResults(leads);
      const all = new Set(leads.map((_, i) => i));
      setSelectedIndices(all);

      if (res.excelFile) {
        setLatestExcelFile(res.excelFile);
        if (autoDownloadExcel) {
          triggerExcelDownload(res.excelFile.downloadUrl, res.excelFile.fileName);
        }
      }
    } catch (err) {
      console.error('Search error:', err);
      alert('Search failed: ' + err.message);
    } finally {
      setIsSearching(false);
    }
  };

  const handleExportSelectedToExcel = async () => {
    const leadsToExport = selectedIndices.size > 0
      ? searchResults.filter((_, idx) => selectedIndices.has(idx))
      : searchResults;

    if (leadsToExport.length === 0) return;
    setIsExportingExcel(true);
    try {
      const res = await api.leads.exportExcel({
        leads: leadsToExport,
        query,
        location
      });
      if (res.excelFile) {
        setLatestExcelFile(res.excelFile);
        triggerExcelDownload(res.excelFile.downloadUrl, res.excelFile.fileName);
        setAddedSuccess(`📊 Generated & downloaded Excel file "${res.excelFile.fileName}" with ${res.excelFile.rowCount} leads!`);
      }
    } catch (err) {
      alert('Excel export failed: ' + err.message);
    } finally {
      setIsExportingExcel(false);
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

  const handleDeepScrapeRow = async (index, lead) => {
    setScrapingIndex(index);

    try {
      let foundEmail = '';
      let audit = null;
      let scrapedSocials = null;

      if (lead.website) {
        try {
          const res = await api.leads.scrapeDomain(lead.website);
          if (res.data?.primaryEmail) {
            foundEmail = res.data.primaryEmail;
          }
          if (res.data?.websiteAudit) {
            audit = res.data.websiteAudit;
          }
          if (res.data?.socials) {
            scrapedSocials = res.data.socials;
          }
        } catch (_) {}
      }

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
          websiteAudit: audit || copy[index].websiteAudit,
          socials: scrapedSocials ? { ...copy[index].socials, ...scrapedSocials } : copy[index].socials,
          qualityScore: Math.min(100, (copy[index].qualityScore || 50) + (foundEmail ? 30 : 10)),
          scrapedDetails: true
        };
        return copy;
      });

      if (foundEmail) {
        setAddedSuccess(`Discovered verified email for ${lead.company}: ${foundEmail}`);
      } else if (audit) {
        setAddedSuccess(`Audited website for ${lead.company}: Score ${audit.score}/100 with ${audit.weakPoints.length} weak points!`);
      } else {
        alert(`No verified email found for ${lead.company}. You can still click "Draft & Solve Problem" to add one manually.`);
      }
    } catch (err) {
      console.warn('Scraping error for row:', err.message);
    } finally {
      setScrapingIndex(null);
    }
  };

  const handleSingleScrape = async (e) => {
    e.preventDefault();
    if (!scrapeUrl.trim()) return;

    setIsScraping(true);
    setScrapedData(null);
    setSingleExcelFile(null);
    setScrapeError('');

    try {
      const res = await api.leads.scrapeDomain(scrapeUrl);
      setScrapedData(res.data);
      if (res.excelFile) {
        setSingleExcelFile(res.excelFile);
        if (autoDownloadExcel) {
          triggerExcelDownload(res.excelFile.downloadUrl, res.excelFile.fileName);
        }
      }
    } catch (err) {
      setScrapeError('Failed to scrape URL: ' + err.message);
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
        notes: scrapedData.description || 'Deep website & social scan verified.',
        category: 'Website / Social Scraped Prospect',
        source: 'Deep URL Scanner',
        websiteAudit: scrapedData.websiteAudit || null
      });

      setAddedSuccess(`Saved "${companyName}" to pipeline! Opening AI Closer...`);
      if (onLeadsAdded) onLeadsAdded();
      if (onStartOutreach) onStartOutreach(newLead.lead);
    } catch (err) {
      alert('Could not save lead: ' + err.message);
    }
  };

  // Read selected or dropped .xlsx / .xls / .csv file into Base64
  const handleSelectUploadFile = (file) => {
    if (!file) return;
    setUploadError('');
    setUploadReport(null);

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['xlsx', 'xls', 'csv'].includes(ext)) {
      setUploadError('Please upload a valid .xlsx, .xls, or .csv scraper file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      setUploadedFileName(file.name);
      setUploadedFileSize(file.size);
      setUploadedFileBase64(ev.target.result);
    };
    reader.onerror = () => {
      setUploadError('Could not read the selected file.');
    };
    reader.readAsDataURL(file);
  };

  // Execute Upload: either load into table & pipeline ('load') or immediately email all ('email_all')
  const handleExecuteFileUpload = async (autoSendAll = false) => {
    if (!uploadedFileBase64) {
      setUploadError('Please choose an Excel (.xlsx / .xls) or CSV (.csv) scraper file first.');
      return;
    }

    setIsProcessingUpload(true);
    setUploadActionType(autoSendAll ? 'email_all' : 'load');
    setUploadError('');
    setUploadReport(null);

    try {
      const res = await api.leads.uploadFile({
        fileName: uploadedFileName,
        fileDataBase64: uploadedFileBase64,
        importToPipeline: true,
        enrichMissingEmails,
        autoSendAll,
        customSubject: uploadEmailMode === 'custom_template' ? customSubject : '',
        customBody: uploadEmailMode === 'custom_template' ? customBody : ''
      });

      const parsedLeads = res.leads || [];
      setSearchResults(parsedLeads);
      setHasSearched(true);
      setSelectedIndices(new Set(parsedLeads.map((_, i) => i)));
      if (onLeadsAdded) onLeadsAdded();

      if (autoSendAll && res.autoSendReport) {
        setUploadReport(res);
        const sentIds = new Set(
          (res.autoSendReport.sent || []).map(s => s.lead?.id)
        );
        const sentIdxSet = new Set();
        parsedLeads.forEach((l, i) => {
          if (sentIds.has(l.id) || l.status === 'contacted') sentIdxSet.add(i);
        });
        setSentRowIndices(sentIdxSet);
        setAddedSuccess(
          `⚡ Uploaded "${uploadedFileName}" (${res.totalParsed} leads) and automatically sent ${res.autoSendReport.count} outreach emails!`
        );
      } else {
        setUploadReport(res);
        setAddedSuccess(
          `📥 Loaded ${res.totalParsed} leads (${res.withEmailCount} with verified emails) from "${uploadedFileName}"! Switching to results table so you can email them.`
        );
        setTab('search');
      }
    } catch (err) {
      setUploadError(err.message || 'Failed to process uploaded scraper file.');
    } finally {
      setIsProcessingUpload(false);
      setUploadActionType('');
    }
  };

  // Load any saved Excel file directly from the Vault to table or auto-email all
  const handleVaultFileToEmail = async (fileName, autoSendAll = false) => {
    setVaultLoadingFile(`${fileName}_${autoSendAll ? 'email' : 'load'}`);
    try {
      const res = await api.leads.loadExportFile({
        fileName,
        importToPipeline: true,
        enrichMissingEmails: false,
        autoSendAll
      });
      const parsedLeads = res.leads || [];
      setSearchResults(parsedLeads);
      setHasSearched(true);
      setSelectedIndices(new Set(parsedLeads.map((_, i) => i)));
      if (onLeadsAdded) onLeadsAdded();

      if (autoSendAll && res.autoSendReport) {
        setAddedSuccess(
          `⚡ Loaded "${fileName}" and automatically sent ${res.autoSendReport.count} tailored outreach emails!`
        );
      } else {
        setAddedSuccess(
          `📥 Loaded ${res.totalParsed} leads from "${fileName}" into the interactive table & pipeline!`
        );
      }
      setTab('search');
    } catch (err) {
      alert('Failed to load Excel file: ' + err.message);
    } finally {
      setVaultLoadingFile('');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-7">
      
      {/* Top Command Center Header & Mode Switcher */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900/95 via-slate-900/90 to-cyan-950/60 p-6 border border-slate-800/90 shadow-2xl">
        <div className="absolute -right-12 -top-12 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="inline-flex items-center space-x-2 px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/25 text-cyan-300 text-[11px] font-bold uppercase tracking-wider">
              <Sparkles className="w-3 h-3" />
              <span>Multi-Engine Intelligence &amp; Auto-Excel Exporter</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Lead Prospecting &amp; Multi-Platform Scraper
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
              Extract large datasets from <strong className="text-white">Websites, Facebook, Instagram, LinkedIn &amp; Business Directories</strong> with automatic <code className="text-emerald-400 font-mono">.xlsx</code> creation, or <strong className="text-amber-300">upload any scraper file to email leads</strong> in 1 click.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 bg-slate-950/80 p-1.5 rounded-2xl border border-slate-800 shrink-0">
            <button
              onClick={() => setTab('search')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 transition-all ${
                tab === 'search'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 shadow-lg shadow-cyan-500/25'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              <span>Multi-Platform Scraper</span>
            </button>
            <button
              onClick={() => setTab('upload')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 transition-all ${
                tab === 'upload'
                  ? 'bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 text-slate-950 shadow-lg shadow-orange-500/25'
                  : 'text-amber-300 hover:text-amber-200 bg-amber-500/10 border border-amber-500/20'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload File to Email</span>
            </button>
            <button
              onClick={() => setTab('scrape')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 transition-all ${
                tab === 'scrape'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 shadow-lg shadow-cyan-500/25'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Deep URL Scanner</span>
            </button>
            <button
              onClick={() => setTab('vault')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 transition-all ${
                tab === 'vault'
                  ? 'bg-gradient-to-r from-emerald-400 to-teal-500 text-slate-950 shadow-lg shadow-emerald-500/25'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FolderDown className="w-3.5 h-3.5" />
              <span>Excel Vault (.xlsx)</span>
            </button>
          </div>
        </div>
      </div>

      {addedSuccess && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm flex items-center justify-between shadow-lg">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>{addedSuccess}</span>
          </div>
          <button onClick={() => setAddedSuccess('')} className="text-xs text-emerald-400 hover:underline ml-4">Dismiss</button>
        </div>
      )}

      {/* =====================================================================
          TAB 1: MULTI-PLATFORM NICHE SCRAPER
      ===================================================================== */}
      {tab === 'search' && (
        <div className="space-y-6">
          
          {/* Search Control Card */}
          <div className="bg-slate-900/85 backdrop-blur-md rounded-2xl p-6 border border-slate-800/90 shadow-2xl space-y-5">
            <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-12 gap-4">
              
              <div className="md:col-span-4 space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center justify-between">
                  <span>Target Niche / Industry</span>
                  <span className="text-[10px] text-cyan-400 font-normal">Auto-expands 8+ synonyms</span>
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 text-cyan-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="e.g. Dental Clinics, Law Firms, Med Spas..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/90 border border-slate-700/80 text-white text-sm focus:outline-none focus:border-cyan-400 transition-colors"
                    required
                  />
                </div>
              </div>

              <div className="md:col-span-3 space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  City / Location
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-rose-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Austin, TX or New York, NY"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/90 border border-slate-700/80 text-white text-sm focus:outline-none focus:border-cyan-400 transition-colors"
                  />
                </div>
              </div>

              <div className="md:col-span-2 space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Dataset Size
                </label>
                <div className="relative">
                  <Database className="w-4 h-4 text-emerald-400 absolute left-3.5 top-3 pointer-events-none" />
                  <select
                    value={limit}
                    onChange={(e) => setLimit(Number(e.target.value))}
                    className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-slate-950/90 border border-slate-700/80 text-white text-sm focus:outline-none focus:border-cyan-400 cursor-pointer"
                  >
                    <option value={50}>50 Leads</option>
                    <option value={100}>100 Leads (Large)</option>
                    <option value={200}>200 Leads (Massive)</option>
                    <option value={350}>350 Leads (Deep)</option>
                    <option value={500}>500 Leads (Max)</option>
                  </select>
                </div>
              </div>

              <div className="md:col-span-3 flex items-end">
                <button
                  type="submit"
                  disabled={isSearching}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-400 via-cyan-500 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 font-extrabold text-sm shadow-lg shadow-cyan-500/25 flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
                >
                  {isSearching ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Scraping Multi-Platforms...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 fill-current" />
                      <span>Scrape Data &amp; Create Excel</span>
                    </>
                  )}
                </button>
              </div>

            </form>

            {/* Target Platforms Selector Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3.5 border-t border-slate-800/80">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-slate-400 mr-1">Active Data Sources:</span>

                <button
                  type="button"
                  onClick={() => togglePlatform('websites')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center space-x-1.5 ${
                    platforms.includes('websites')
                      ? 'bg-cyan-500/20 text-cyan-200 border-cyan-500/50 shadow-sm'
                      : 'bg-slate-950 text-slate-500 border-slate-800'
                  }`}
                >
                  <span>🌐 Websites, Overpass &amp; Directories</span>
                  {platforms.includes('websites') && <Check className="w-3 h-3 text-cyan-400" />}
                </button>

                <button
                  type="button"
                  onClick={() => togglePlatform('facebook')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center space-x-1.5 ${
                    platforms.includes('facebook')
                      ? 'bg-[#1877F2]/20 text-blue-200 border-[#1877F2]/50 shadow-sm'
                      : 'bg-slate-950 text-slate-500 border-slate-800'
                  }`}
                >
                  <span>📘 Facebook Pages</span>
                  {platforms.includes('facebook') && <Check className="w-3 h-3 text-blue-400" />}
                </button>

                <button
                  type="button"
                  onClick={() => togglePlatform('instagram')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center space-x-1.5 ${
                    platforms.includes('instagram')
                      ? 'bg-pink-500/20 text-pink-200 border-pink-500/50 shadow-sm'
                      : 'bg-slate-950 text-slate-500 border-slate-800'
                  }`}
                >
                  <span>📸 Instagram Profiles</span>
                  {platforms.includes('instagram') && <Check className="w-3 h-3 text-pink-400" />}
                </button>

                <button
                  type="button"
                  onClick={() => togglePlatform('linkedin')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center space-x-1.5 ${
                    platforms.includes('linkedin')
                      ? 'bg-[#0A66C2]/25 text-sky-200 border-[#0A66C2]/60 shadow-sm'
                      : 'bg-slate-950 text-slate-500 border-slate-800'
                  }`}
                >
                  <span>💼 LinkedIn Companies &amp; Founders</span>
                  {platforms.includes('linkedin') && <Check className="w-3 h-3 text-sky-400" />}
                </button>
              </div>

              <label className="inline-flex items-center space-x-2 cursor-pointer select-none bg-emerald-500/10 hover:bg-emerald-500/15 border border-emerald-500/30 px-3.5 py-1.5 rounded-xl transition-colors">
                <input
                  type="checkbox"
                  checked={autoDownloadExcel}
                  onChange={(e) => setAutoDownloadExcel(e.target.checked)}
                  className="rounded bg-slate-900 border-emerald-500/50 text-emerald-500 focus:ring-0 cursor-pointer"
                />
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-xs font-bold text-emerald-300">Auto-Download Excel (.xlsx)</span>
              </label>
            </div>

            {/* Quick Presets */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-800/60">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-semibold text-slate-400 mr-1">1-Click Presets:</span>
                {quickPresets.map((p, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => { setQuery(p.q); setLocation(p.loc); }}
                    className="px-2.5 py-1 rounded-lg bg-slate-800/70 hover:bg-slate-700/90 text-slate-200 text-xs transition-all border border-slate-700/60 hover:border-cyan-500/40"
                  >
                    <span>{p.icon} {p.q}</span>
                    <span className="text-slate-400 ml-1">• {p.loc}</span>
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={onOpenSettings}
                className="text-[11px] text-cyan-400 hover:text-cyan-300 underline font-semibold"
              >
                {hasMapsApiKey ? 'Google Maps API Active ✓' : '+ Connect Optional SerpAPI / Places Key'}
              </button>
            </div>
          </div>

          {/* LIVE SCRAPING TELEMETRY STEPPER */}
          {isSearching && (
            <div className="bg-slate-900/90 rounded-2xl p-6 border border-cyan-500/40 shadow-2xl space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
                    <Loader2 className="w-5 h-5 animate-spin" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      Multi-Engine Scraper Extracting "{query}" in "{location}" (Target: {limit} Leads)...
                    </h3>
                    <p className="text-xs text-slate-400">
                      Crawling Websites, Facebook, Instagram, LinkedIn, Overpass &amp; YellowPages + compiling Excel (.xlsx)
                    </p>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 text-xs font-bold animate-pulse">
                  Phase {scrapePhase} of 4
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                {[
                  { step: 1, title: 'Social Discovery', desc: 'Scanning Facebook Pages, Instagram Bios & LinkedIn Founders' },
                  { step: 2, title: 'City-Wide Directories', desc: 'Querying Overpass POI mirrors, YellowPages & Nominatim' },
                  { step: 3, title: 'Deep Website Crawl', desc: '25 concurrent workers extracting emails, phones & Cloudflare hashes' },
                  { step: 4, title: 'Audit & Excel Export', desc: 'Scoring website weak points & writing 34-column .xlsx file' }
                ].map(item => {
                  const active = scrapePhase === item.step;
                  const done = scrapePhase > item.step;
                  return (
                    <div
                      key={item.step}
                      className={`p-3.5 rounded-xl border transition-all ${
                        active
                          ? 'bg-cyan-500/15 border-cyan-400/60 text-white shadow-md'
                          : done
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                          : 'bg-slate-950/60 border-slate-800 text-slate-500'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-extrabold">{item.step}. {item.title}</span>
                        {done ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        ) : active ? (
                          <Loader2 className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
                        ) : null}
                      </div>
                      <p className="text-[11px] opacity-80 leading-snug">{item.desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Generated Excel File Banner */}
          {latestExcelFile && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/80 via-slate-900 to-slate-900 border border-emerald-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
              <div className="flex items-start space-x-3.5">
                <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 shrink-0">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-extrabold text-white">Excel (.xlsx) File Saved Automatically:</span>
                    <span className="px-2.5 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 font-mono text-xs border border-emerald-500/30">
                      {latestExcelFile.fileName}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300">
                    Disk Path: <code className="text-emerald-300 font-mono bg-slate-950 px-2 py-0.5 rounded border border-slate-800">{latestExcelFile.filePath}</code>
                  </p>
                  <div className="flex flex-wrap gap-3 text-[11px] text-slate-400 pt-0.5">
                    <span>Total Rows: <strong className="text-white">{latestExcelFile.rowCount}</strong></span>
                    <span>• Emails: <strong className="text-cyan-400">{latestExcelFile.withEmailCount}</strong></span>
                    <span>• Phones: <strong className="text-emerald-400">{latestExcelFile.withPhoneCount}</strong></span>
                    <span>• Websites: <strong className="text-indigo-400">{latestExcelFile.withWebsiteCount}</strong></span>
                    <span>• Facebook: <strong className="text-blue-400">{latestExcelFile.withFacebookCount || 0}</strong></span>
                    <span>• Instagram: <strong className="text-pink-400">{latestExcelFile.withInstagramCount || 0}</strong></span>
                    <span>• LinkedIn: <strong className="text-sky-400">{latestExcelFile.withLinkedinCount || 0}</strong></span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => triggerExcelDownload(latestExcelFile.downloadUrl, latestExcelFile.fileName)}
                  className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs shadow-lg shadow-emerald-500/25 flex items-center space-x-2 transition-all"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Excel (.xlsx)</span>
                </button>
              </div>
            </div>
          )}

          {/* INTERACTIVE KPI FILTER BAR & RESULTS TABLE */}
          {searchResults.length > 0 && (
            <div className="space-y-4">
              
              {/* Clickable KPI Filter Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {[
                  { id: 'all', label: 'Total Scraped Leads', count: metrics.total, color: 'border-cyan-500/40 text-cyan-300 bg-cyan-500/10' },
                  { id: 'email', label: 'Verified Emails', count: metrics.withEmail, color: 'border-emerald-500/40 text-emerald-300 bg-emerald-500/10' },
                  { id: 'phone', label: 'Direct Phones', count: metrics.withPhone, color: 'border-blue-500/40 text-blue-300 bg-blue-500/10' },
                  { id: 'social', label: 'FB / IG / LinkedIn', count: metrics.withSocial, color: 'border-pink-500/40 text-pink-300 bg-pink-500/10' },
                  { id: 'audited', label: 'Audited Websites', count: metrics.withAudit, color: 'border-indigo-500/40 text-indigo-300 bg-indigo-500/10' }
                ].map(card => {
                  const isActive = resultFilter === card.id;
                  return (
                    <button
                      key={card.id}
                      type="button"
                      onClick={() => setResultFilter(card.id)}
                      className={`p-3.5 rounded-2xl border text-left transition-all ${
                        isActive
                          ? `${card.color} shadow-lg scale-[1.01]`
                          : 'bg-slate-900/70 border-slate-800/90 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider opacity-85">{card.label}</span>
                        {isActive && <span className="text-[10px] px-1.5 py-0.2 rounded bg-white/10 font-bold">Filter ON</span>}
                      </div>
                      <div className="text-2xl font-black text-white mt-1">{card.count}</div>
                    </button>
                  );
                })}
              </div>

              <div className="bg-slate-900/85 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
                
                {/* Table Header Controls */}
                <div className="p-4 bg-slate-900 border-b border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <button
                      onClick={toggleSelectAll}
                      className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold transition-colors"
                    >
                      {selectedIndices.size === searchResults.length ? 'Deselect All' : 'Select All'}
                    </button>

                    {/* Live instant search inside results */}
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        value={resultSearchText}
                        onChange={(e) => setResultSearchText(e.target.value)}
                        placeholder="Filter results by name, email, phone..."
                        className="pl-8 pr-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700/80 text-xs text-white focus:outline-none focus:border-cyan-400 w-56"
                      />
                    </div>

                    <span className="text-xs text-slate-400">
                      Showing <strong className="text-white">{filteredResults.length}</strong> of {searchResults.length} • <strong className="text-cyan-400">{selectedIndices.size}</strong> selected
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* View Switcher: Table vs Card Grid */}
                    <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
                      <button
                        type="button"
                        onClick={() => setViewMode('table')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center space-x-1 ${
                          viewMode === 'table' ? 'bg-slate-800 text-cyan-400' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <List className="w-3.5 h-3.5" />
                        <span>Table</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setViewMode('grid')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center space-x-1 ${
                          viewMode === 'grid' ? 'bg-slate-800 text-cyan-400' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <LayoutGrid className="w-3.5 h-3.5" />
                        <span>Cards</span>
                      </button>
                    </div>

                    {/* Copy All Emails Button */}
                    <button
                      type="button"
                      onClick={handleCopyAllEmails}
                      className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 text-xs font-bold flex items-center space-x-1.5 transition-all"
                      title="Copy all verified emails to clipboard"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>{copiedEmailsToast ? 'Copied Emails! ✓' : `Copy Emails (${metrics.withEmail})`}</span>
                    </button>

                    {/* Export Excel Button */}
                    <button
                      onClick={handleExportSelectedToExcel}
                      disabled={isExportingExcel || searchResults.length === 0}
                      className="px-3.5 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold flex items-center space-x-1.5 transition-all disabled:opacity-40"
                    >
                      {isExportingExcel ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Creating Excel...</span>
                        </>
                      ) : (
                        <>
                          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Export Excel (.xlsx)</span>
                        </>
                      )}
                    </button>

                    {/* Auto-Send Bulk Outreach */}
                    <button
                      onClick={handleBulkAutoSend}
                      disabled={isBulkAutoSending || selectedIndices.size === 0}
                      className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 hover:from-amber-300 hover:to-rose-400 text-slate-950 text-xs font-extrabold shadow-md shadow-orange-500/20 flex items-center space-x-1.5 transition-all disabled:opacity-40"
                    >
                      {isBulkAutoSending ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Sending...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5 fill-current" />
                          <span>⚡ Auto-Send ({selectedIndices.size})</span>
                        </>
                      )}
                    </button>

                    {/* Import to Pipeline */}
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
                          <span>Import</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* VIEW MODE 1: TABLE VIEW */}
                {viewMode === 'table' ? (
                  <div className="overflow-x-auto max-h-[740px]">
                    <table className="w-full text-left border-collapse">
                      <thead className="sticky top-0 z-10 bg-slate-950">
                        <tr className="bg-slate-950/95 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
                          <th className="p-3.5 w-10 text-center">
                            <input
                              type="checkbox"
                              checked={selectedIndices.size === searchResults.length && searchResults.length > 0}
                              onChange={toggleSelectAll}
                              className="rounded bg-slate-800 border-slate-700 text-cyan-500 focus:ring-0 cursor-pointer"
                            />
                          </th>
                          <th className="p-3.5 w-14 text-center">Score</th>
                          <th className="p-3.5">Company, Role &amp; Source</th>
                          <th className="p-3.5">Website, Tech &amp; Verified Email</th>
                          <th className="p-3.5">Facebook, Instagram, LinkedIn &amp; Maps</th>
                          <th className="p-3.5">Phone &amp; Location</th>
                          <th className="p-3.5 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 text-xs">
                        {filteredResults.map(({ lead, originalIndex: idx }) => {
                          const isSelected = selectedIndices.has(idx);
                          const isRowScraping = scrapingIndex === idx;
                          const hasDirectFb = Boolean(lead.socials?.facebook);
                          const hasDirectIg = Boolean(lead.socials?.instagram);
                          const hasDirectLi = Boolean(lead.socials?.linkedin);
                          const qScore = lead.qualityScore || 65;

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

                              {/* Quality Score Badge */}
                              <td className="p-3.5 text-center">
                                <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-lg text-[11px] font-black border ${
                                  qScore >= 75
                                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/35'
                                    : qScore >= 50
                                    ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/35'
                                    : 'bg-slate-800 text-slate-400 border-slate-700'
                                }`} title="Lead Quality & Contact Completeness Score">
                                  {qScore}%
                                </span>
                              </td>

                              {/* Company Name, Decision Maker & Problem-Solution Diagnosis */}
                              <td className="p-3.5 max-w-[280px]">
                                <div className="font-bold text-white text-sm truncate" title={lead.company}>{lead.company}</div>
                                <div className="text-[11px] text-cyan-300/90 font-medium truncate" title={lead.name}>
                                  👤 {lead.name || 'Owner / Decision Maker'}
                                </div>
                                <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                                  <span className="text-[10px] text-slate-400 capitalize">{lead.category}</span>
                                  {lead.source && (
                                    <span className={`text-[9px] px-1.5 py-0.2 rounded border font-semibold ${
                                      lead.source.includes('Facebook')
                                        ? 'bg-blue-500/15 text-blue-300 border-blue-500/30'
                                        : lead.source.includes('Instagram')
                                        ? 'bg-pink-500/15 text-pink-300 border-pink-500/30'
                                        : lead.source.includes('LinkedIn')
                                        ? 'bg-sky-500/15 text-sky-300 border-sky-500/30'
                                        : 'bg-slate-800 text-slate-400 border-slate-700'
                                    }`}>
                                      {lead.source}
                                    </span>
                                  )}
                                </div>
                                
                                {(() => {
                                  const snippet = getLeadProblemSnippet(lead);
                                  return (
                                    <div className="mt-1.5 space-y-1">
                                      <div className="flex items-center space-x-1 text-[10px] text-rose-300 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20 truncate" title={`Problem: ${snippet.pain}`}>
                                        <span className="font-bold text-rose-400 shrink-0">Pain:</span>
                                        <span className="truncate">{snippet.pain}</span>
                                      </div>
                                      <div className="flex items-center space-x-1 text-[10px] text-emerald-300 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 truncate" title={`Solution: ${snippet.sol}`}>
                                        <span className="font-bold text-emerald-400 shrink-0">Pitch:</span>
                                        <span className="truncate">{snippet.sol}</span>
                                      </div>
                                    </div>
                                  );
                                })()}
                              </td>

                              {/* Website, Tech Stack & Email */}
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
                                  <span className="text-slate-500 text-[11px]">Social / Directory Profile</span>
                                )}

                                {/* Website Audit & Tech Stack Badges */}
                                <div className="flex flex-wrap items-center gap-1">
                                  {lead.websiteAudit && (
                                    <span className={`px-1.5 py-0.2 rounded text-[9px] font-black border ${
                                      lead.websiteAudit.score >= 80 
                                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                        : lead.websiteAudit.score >= 60
                                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                                        : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                                    }`} title={lead.websiteAudit.topWeakPoint?.title || 'Website Audited'}>
                                      Audit: {lead.websiteAudit.score}% ({lead.websiteAudit.weakPoints?.length || 0} flaws)
                                    </span>
                                  )}
                                  {Array.isArray(lead.techStack) && lead.techStack.slice(0, 2).map((tech, tIdx) => (
                                    <span key={tIdx} className="px-1.5 py-0.2 rounded text-[9px] bg-slate-800 text-slate-300 border border-slate-700">
                                      {tech}
                                    </span>
                                  ))}
                                </div>

                                <div>
                                  {lead.email ? (
                                    <div className="space-y-0.5">
                                      <span className="inline-flex items-center space-x-1 text-slate-100 font-mono text-[11px] px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/40">
                                        <Mail className="w-3 h-3 text-emerald-400" />
                                        <span>{lead.email}</span>
                                      </span>
                                      {Array.isArray(lead.allEmails) && lead.allEmails.length > 1 && (
                                        <div className="text-[10px] text-cyan-400/80 font-mono">
                                          +{lead.allEmails.length - 1} more email(s) in Excel
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => handleDeepScrapeRow(idx, lead)}
                                      disabled={isRowScraping}
                                      className="inline-flex items-center space-x-1 text-[11px] text-cyan-400 hover:text-cyan-300 font-bold underline disabled:opacity-50"
                                    >
                                      {isRowScraping ? (
                                        <>
                                          <Loader2 className="w-3 h-3 animate-spin text-cyan-400" />
                                          <span>Hunting email...</span>
                                        </>
                                      ) : (
                                        <>
                                          <Sparkles className="w-3 h-3" />
                                          <span>Deep Hunt Email</span>
                                        </>
                                      )}
                                    </button>
                                  )}
                                </div>
                              </td>

                              {/* Facebook, Instagram, LinkedIn & Google Maps */}
                              <td className="p-3.5 space-y-1.5">
                                <div className="flex flex-wrap gap-1.5">
                                  <a
                                    href={lead.socials?.facebook || lead.facebookUrl || `https://www.facebook.com/search/pages/?q=${encodeURIComponent(lead.company)}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                                      hasDirectFb
                                        ? 'bg-[#1877F2]/25 hover:bg-[#1877F2]/35 text-blue-200 border-[#1877F2]/60'
                                        : 'bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border-blue-500/25'
                                    }`}
                                  >
                                    <span>{hasDirectFb ? '📘 Facebook ✓' : '📘 Facebook'}</span>
                                    <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                                  </a>

                                  <a
                                    href={lead.socials?.instagram || lead.instagramUrl || `https://www.instagram.com/explore/search/keyword/?q=${encodeURIComponent(lead.company)}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                                      hasDirectIg
                                        ? 'bg-pink-500/25 hover:bg-pink-500/35 text-pink-200 border-pink-500/60'
                                        : 'bg-pink-500/10 hover:bg-pink-500/20 text-pink-400 border-pink-500/25'
                                    }`}
                                  >
                                    <span>{lead.socials?.instagramHandle ? `📸 ${lead.socials.instagramHandle}` : hasDirectIg ? '📸 Instagram ✓' : '📸 Instagram'}</span>
                                    <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                                  </a>
                                </div>

                                <div className="flex flex-wrap gap-1.5">
                                  {lead.linkedinUrl && (
                                    <a
                                      href={lead.linkedinUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                                        hasDirectLi
                                          ? 'bg-[#0077B5]/30 hover:bg-[#0077B5]/40 text-sky-200 border-[#0077B5]/60'
                                          : 'bg-[#0077B5]/15 hover:bg-[#0077B5]/25 text-[#00a0dc] border-[#0077B5]/35'
                                      }`}
                                    >
                                      <span>{hasDirectLi ? '💼 LinkedIn ✓' : '💼 LinkedIn Co.'}</span>
                                      <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                                    </a>
                                  )}

                                  {lead.linkedinPeopleUrl && (
                                    <a
                                      href={lead.linkedinPeopleUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/35 text-[10px] font-semibold transition-colors"
                                    >
                                      <span>Founder</span>
                                      <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                                    </a>
                                  )}

                                  {lead.mapsUrl && (
                                    <a
                                      href={lead.mapsUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[10px] font-semibold transition-colors"
                                    >
                                      <MapPin className="w-2.5 h-2.5 text-red-400" />
                                      <span>Maps</span>
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
                                  <div className="text-slate-500 text-[11px] mb-0.5">No phone listed</div>
                                )}
                                <div className="text-[11px] text-slate-400 truncate max-w-[190px]" title={lead.address}>
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
                                >
                                  {autoSendingRowIndex === idx ? (
                                    <>
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                      <span>Sending...</span>
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
                ) : (
                  /* VIEW MODE 2: EXECUTIVE CARD GRID VIEW */
                  <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[740px] overflow-y-auto">
                    {filteredResults.map(({ lead, originalIndex: idx }) => {
                      const isSelected = selectedIndices.has(idx);
                      const qScore = lead.qualityScore || 65;
                      const snippet = getLeadProblemSnippet(lead);

                      return (
                        <div
                          key={idx}
                          className={`rounded-2xl p-4 border transition-all flex flex-col justify-between space-y-3 ${
                            isSelected
                              ? 'bg-slate-900/95 border-cyan-500/40 shadow-lg'
                              : 'bg-slate-950/80 border-slate-800'
                          }`}
                        >
                          <div className="space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center space-x-2 min-w-0">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleSelect(idx)}
                                  className="rounded bg-slate-800 border-slate-700 text-cyan-500 focus:ring-0 cursor-pointer"
                                />
                                <h4 className="font-bold text-white text-sm truncate" title={lead.company}>
                                  {lead.company}
                                </h4>
                              </div>
                              <span className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shrink-0">
                                {qScore}% Match
                              </span>
                            </div>

                            <div className="text-[11px] text-cyan-300 font-medium">
                              👤 {lead.name || 'Owner / Decision Maker'} • <span className="text-slate-400">{lead.source}</span>
                            </div>

                            <div className="space-y-1 text-xs pt-1">
                              {lead.email ? (
                                <div className="flex items-center space-x-1.5 text-emerald-300 font-mono text-[11px]">
                                  <Mail className="w-3.5 h-3.5 shrink-0" />
                                  <span className="truncate">{lead.email}</span>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleDeepScrapeRow(idx, lead)}
                                  className="text-[11px] text-cyan-400 underline font-semibold"
                                >
                                  + Hunt Verified Email
                                </button>
                              )}

                              {lead.phone && (
                                <div className="flex items-center space-x-1.5 text-slate-200 font-mono text-[11px]">
                                  <Phone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                  <span>{lead.phone}</span>
                                </div>
                              )}

                              {lead.website && (
                                <a
                                  href={lead.website}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="flex items-center space-x-1.5 text-cyan-400 hover:underline text-[11px] truncate"
                                >
                                  <Globe className="w-3.5 h-3.5 shrink-0" />
                                  <span className="truncate">{lead.website}</span>
                                </a>
                              )}
                            </div>

                            {/* Social Pills */}
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              <a
                                href={lead.socials?.facebook || lead.facebookUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="px-2 py-0.5 rounded bg-blue-500/15 text-blue-300 border border-blue-500/30 text-[10px] font-bold"
                              >
                                📘 Facebook
                              </a>
                              <a
                                href={lead.socials?.instagram || lead.instagramUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="px-2 py-0.5 rounded bg-pink-500/15 text-pink-300 border border-pink-500/30 text-[10px] font-bold"
                              >
                                📸 Instagram
                              </a>
                              <a
                                href={lead.linkedinUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="px-2 py-0.5 rounded bg-sky-500/15 text-sky-300 border border-sky-500/30 text-[10px] font-bold"
                              >
                                💼 LinkedIn
                              </a>
                            </div>

                            <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-[10px] text-slate-300">
                              <strong className="text-emerald-400">AI Pitch:</strong> {snippet.sol}
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                            <button
                              type="button"
                              onClick={() => handleRowAutoSend(idx, lead)}
                              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-rose-500 text-slate-950 font-extrabold text-xs"
                            >
                              ⚡ Auto-Send Pitch
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                const res = await api.leads.create(lead);
                                if (onLeadsAdded) onLeadsAdded();
                                if (onStartOutreach) onStartOutreach(res.lead);
                              }}
                              className="text-xs text-cyan-400 hover:underline font-bold"
                            >
                              Open AI Closer →
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

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
                  Try adjusting the keyword or searching a broader city.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          TAB 2: DEEP SINGLE WEBSITE / SOCIAL URL SCANNER
      ===================================================================== */}
      {tab === 'scrape' && (
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="bg-slate-900/85 rounded-2xl p-6 border border-slate-800 shadow-xl">
            <h2 className="text-lg font-bold text-white mb-2">Deep Website, Facebook, Instagram &amp; LinkedIn URL Crawler</h2>
            <p className="text-xs text-slate-400 mb-5">
              Enter any company website URL, Facebook Business Page URL, Instagram Profile URL, or LinkedIn URL. Our crawler decodes Cloudflare email protection, crawls up to 6 subpages, detects the tech stack, and automatically generates an Excel (<code className="text-emerald-400">.xlsx</code>) report.
            </p>

            <form onSubmit={handleSingleScrape} className="flex gap-3">
              <div className="relative flex-1">
                <Globe className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                <input
                  type="text"
                  value={scrapeUrl}
                  onChange={(e) => setScrapeUrl(e.target.value)}
                  placeholder="e.g. https://acmedigital.com, facebook.com/business, instagram.com/brand..."
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
                    <span>Crawling &amp; Creating Excel...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Scrape &amp; Export Excel</span>
                  </>
                )}
              </button>
            </form>

            {scrapeError && (
              <p className="text-xs text-rose-400 mt-3">{scrapeError}</p>
            )}
          </div>

          {singleExcelFile && (
            <div className="p-4 rounded-2xl bg-emerald-950/50 border border-emerald-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-emerald-300 flex items-center space-x-1.5">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                  <span>Saved Excel Report: {singleExcelFile.fileName}</span>
                </div>
                <p className="text-[11px] text-slate-400 font-mono truncate max-w-lg">{singleExcelFile.filePath}</p>
              </div>
              <button
                type="button"
                onClick={() => triggerExcelDownload(singleExcelFile.downloadUrl, singleExcelFile.fileName)}
                className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs flex items-center space-x-1.5 shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Excel (.xlsx)</span>
              </button>
            </div>
          )}

          {scrapedData && (
            <div className="bg-slate-900/90 rounded-2xl p-6 border border-slate-800 shadow-2xl space-y-5">
              <div className="flex items-start justify-between border-b border-slate-800 pb-4">
                <div>
                  <span className="px-2 py-0.5 text-[10px] uppercase font-bold rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Crawl Successful ({scrapedData.crawledPages?.length || 1} Pages Scanned)
                  </span>
                  <h3 className="text-xl font-bold text-white mt-1">{scrapedData.title || 'Target Website / Profile'}</h3>
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
                  <span>Add Lead &amp; Start AI Outreach</span>
                </button>
              </div>

              {scrapedData.description && (
                <div>
                  <h4 className="text-xs font-semibold text-slate-400 mb-1">Company / Profile Summary:</h4>
                  <p className="text-xs text-slate-300 bg-slate-950 p-3 rounded-xl border border-slate-800">
                    {scrapedData.description}
                  </p>
                </div>
              )}

              {/* Website Weak Points Audit */}
              {scrapedData.websiteAudit && (
                <div className="p-4 rounded-xl bg-slate-950 border border-indigo-500/30 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <div className="flex items-center space-x-2">
                      <Globe className="w-4 h-4 text-indigo-400" />
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                        Website Audit &amp; Weak Points Report
                      </h4>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-black border ${
                      scrapedData.websiteAudit.score >= 80
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : scrapedData.websiteAudit.score >= 60
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                        : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                    }`}>
                      Health Score: {scrapedData.websiteAudit.score}/100 ({scrapedData.websiteAudit.rating})
                    </span>
                  </div>

                  <p className="text-xs text-slate-300">
                    {scrapedData.websiteAudit.summary}
                  </p>

                  {scrapedData.websiteAudit.weakPoints && scrapedData.websiteAudit.weakPoints.length > 0 && (
                    <div className="space-y-2 pt-1">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                        Detected Vulnerabilities ({scrapedData.websiteAudit.weakPoints.length}):
                      </span>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {scrapedData.websiteAudit.weakPoints.map(wp => (
                          <div key={wp.id} className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-xs text-white line-clamp-1">{wp.title}</span>
                              <span className={`text-[9px] font-black uppercase px-1.5 py-0.2 rounded ${
                                wp.severity === 'critical'
                                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                  : wp.severity === 'high'
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                  : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                              }`}>
                                {wp.severity}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 leading-tight">{wp.evidence}</p>
                            <p className="text-[10px] text-emerald-400 font-medium pt-1">Fix: {wp.solution}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
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
                    <span>Discovered Phone Numbers ({scrapedData.phones.length}):</span>
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
                  <h4 className="text-xs font-semibold text-slate-400 mb-2">Discovered Social Profiles:</h4>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(scrapedData.socials).map(([key, val]) => {
                      if (!val || key === 'instagramHandle') return null;
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

      {/* =====================================================================
          TAB 3: MANUAL UPLOAD SCRAPER FILE (.XLSX / .XLS / .CSV) TO EMAIL LEADS
      ===================================================================== */}
      {tab === 'upload' && (
        <div className="bg-slate-900/90 rounded-2xl p-6 border border-slate-800 shadow-2xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div className="space-y-1">
              <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-bold uppercase tracking-wider">
                <Upload className="w-3 h-3" />
                <span>Manual Scraper File Importer &amp; Instant Outreach</span>
              </div>
              <h2 className="text-lg font-extrabold text-white flex items-center space-x-2">
                <span>Upload Any Scraped File (.xlsx, .xls, or .csv) to Email Leads</span>
              </h2>
              <p className="text-xs text-slate-400">
                Upload a scraper Excel or CSV file from your computer. We automatically detect <strong className="text-slate-200">Company Name, Email, Phone, Website &amp; Social columns</strong>, hunt missing emails, and let you email them in 1 click.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setTab('vault')}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 text-xs font-bold border border-emerald-500/30 inline-flex items-center space-x-1.5 self-start shrink-0"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Or Pick from Saved Excel Vault</span>
            </button>
          </div>

          {/* Drag & Drop File Upload Zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDraggingFile(true);
            }}
            onDragLeave={() => setIsDraggingFile(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDraggingFile(false);
              const file = e.dataTransfer.files?.[0];
              if (file) handleSelectUploadFile(file);
            }}
            className={`relative rounded-2xl border-2 border-dashed p-8 text-center transition-all ${
              isDraggingFile
                ? 'border-amber-400 bg-amber-500/10'
                : uploadedFileName
                ? 'border-emerald-500/50 bg-emerald-950/20'
                : 'border-slate-700 hover:border-cyan-400/60 bg-slate-950/60'
            }`}
          >
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleSelectUploadFile(file);
              }}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />

            {uploadedFileName ? (
              <div className="space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <div className="text-sm font-extrabold text-white font-mono">
                  {uploadedFileName}
                </div>
                <div className="text-xs text-emerald-300 font-semibold">
                  {(uploadedFileSize / 1024).toFixed(1)} KB • Ready to parse &amp; email leads
                </div>
                <p className="text-[11px] text-slate-400 pt-1">
                  Click anywhere here or drag another <code className="text-cyan-300">.xlsx</code> / <code className="text-cyan-300">.csv</code> file to replace
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto">
                  <Upload className="w-6 h-6" />
                </div>
                <div className="text-sm font-bold text-white">
                  Click to Browse or Drag &amp; Drop Your Scraper File Here
                </div>
                <p className="text-xs text-slate-400 max-w-lg mx-auto">
                  Supports <code className="text-emerald-400 font-mono">.xlsx</code>, <code className="text-emerald-400 font-mono">.xls</code>, and <code className="text-emerald-400 font-mono">.csv</code> files (including Lead-Finder exports, Apollo/Hunter exports, Google Maps scrapers, or any custom spreadsheet).
                </p>
              </div>
            )}
          </div>

          {/* Options & Email Pitch Strategy */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-1">
            {/* Left column: Enrichment & Pitch Mode */}
            <div className="lg:col-span-5 space-y-4 bg-slate-950/70 p-4 rounded-xl border border-slate-800">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Email &amp; Enrichment Settings</span>
              </h3>

              <label className="flex items-start space-x-2.5 cursor-pointer select-none p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-700">
                <input
                  type="checkbox"
                  checked={enrichMissingEmails}
                  onChange={(e) => setEnrichMissingEmails(e.target.checked)}
                  className="mt-0.5 rounded bg-slate-950 border-slate-700 text-cyan-500 focus:ring-0"
                />
                <div>
                  <div className="text-xs font-bold text-white">
                    🔍 Auto-Hunt Missing Emails on Upload
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed mt-0.5">
                    If a row in your file only has a Company Name or Website URL but no email, automatically crawl their site to discover a verified email.
                  </p>
                </div>
              </label>

              <div className="space-y-2">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Outreach Email Mode:
                </label>
                <div className="grid grid-cols-1 gap-2">
                  <button
                    type="button"
                    onClick={() => setUploadEmailMode('ai_tailored')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      uploadEmailMode === 'ai_tailored'
                        ? 'bg-cyan-500/15 border-cyan-500/50 text-white'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="text-xs font-bold flex items-center justify-between">
                      <span>🤖 AI Tailored Pitch per Business (Recommended)</span>
                      {uploadEmailMode === 'ai_tailored' && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Automatically diagnoses each lead&apos;s industry &amp; website flaws and writes a unique cold pitch for every row.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setUploadEmailMode('custom_template')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      uploadEmailMode === 'custom_template'
                        ? 'bg-amber-500/15 border-amber-500/50 text-white'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="text-xs font-bold flex items-center justify-between">
                      <span>✍️ Custom Subject &amp; Message Template</span>
                      {uploadEmailMode === 'custom_template' && <Check className="w-3.5 h-3.5 text-amber-400" />}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Write your own email template using dynamic placeholders like <code className="text-amber-300">{'{company}'}</code> and <code className="text-amber-300">{'{firstName}'}</code>.
                    </p>
                  </button>
                </div>
              </div>
            </div>

            {/* Right column: Template Preview or Custom Editor + Action Buttons */}
            <div className="lg:col-span-7 flex flex-col justify-between space-y-4 bg-slate-950/70 p-4 rounded-xl border border-slate-800">
              {uploadEmailMode === 'custom_template' ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                      Custom Outreach Template
                    </span>
                    <div className="flex flex-wrap items-center gap-1">
                      <span className="text-[10px] text-slate-500 mr-1">Insert tag:</span>
                      {['{company}', '{firstName}', '{website}', '{category}'].map(tag => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => setCustomBody(prev => `${prev} ${tag}`)}
                          className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 font-mono text-[10px] border border-slate-700"
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Subject Line</label>
                    <input
                      type="text"
                      value={customSubject}
                      onChange={(e) => setCustomSubject(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Email Body</label>
                    <textarea
                      rows={5}
                      value={customBody}
                      onChange={(e) => setCustomBody(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-400 font-sans leading-relaxed"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="text-xs font-bold text-cyan-300 uppercase tracking-wider">
                    How AI Tailored File Outreach Works
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
                      <div className="text-xs font-bold text-white">1. Smart Column Mapping</div>
                      <p className="text-[11px] text-slate-400">
                        Automatically extracts Company, Decision Maker, Emails, Phones, Websites &amp; Socials from any spreadsheet.
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
                      <div className="text-xs font-bold text-white">2. Problem &amp; Solution Pitch</div>
                      <p className="text-[11px] text-slate-400">
                        Crafts a personalized email for each company&apos;s specific niche and pain point.
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
                      <div className="text-xs font-bold text-white">3. 1-Click or Individual Send</div>
                      <p className="text-[11px] text-slate-400">
                        Load into the table to review &amp; email one-by-one, or blast all leads in the file at once.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {uploadError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold">
                  {uploadError}
                </div>
              )}

              {/* Primary Action Buttons */}
              <div className="flex flex-wrap items-center justify-end gap-3 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  disabled={!uploadedFileBase64 || isProcessingUpload}
                  onClick={() => handleExecuteFileUpload(false)}
                  className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold text-xs border border-cyan-500/30 flex items-center space-x-2 transition-all disabled:opacity-50"
                >
                  {isProcessingUpload && uploadActionType === 'load' ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Parsing &amp; Loading Leads...</span>
                    </>
                  ) : (
                    <>
                      <Database className="w-4 h-4" />
                      <span>📥 Upload &amp; Load Leads into Table (Review &amp; Email)</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  disabled={!uploadedFileBase64 || isProcessingUpload}
                  onClick={() => handleExecuteFileUpload(true)}
                  className="px-5 py-3 rounded-xl bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 hover:from-amber-300 hover:to-rose-400 text-slate-950 font-extrabold text-xs shadow-lg shadow-orange-500/25 flex items-center space-x-2 transition-all disabled:opacity-50"
                >
                  {isProcessingUpload && uploadActionType === 'email_all' ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Uploading &amp; Sending Emails...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>⚡ Upload File &amp; Auto-Email All Leads Now</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Live Upload & Auto-Email Report */}
          {uploadReport && (
            <div className="p-5 rounded-2xl bg-slate-950/90 border border-emerald-500/40 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center space-x-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div>
                    <h4 className="text-sm font-extrabold text-white">
                      Processed &ldquo;{uploadReport.fileName}&rdquo; — {uploadReport.totalParsed} Leads Imported ({uploadReport.withEmailCount} with Verified Emails)
                    </h4>
                    {uploadReport.autoSendReport && (
                      <p className="text-xs text-emerald-300 font-semibold mt-0.5">
                        ⚡ Successfully Sent {uploadReport.autoSendReport.count} Outreach Emails!
                        {uploadReport.autoSendReport.errors?.length > 0 && (
                          <span className="text-amber-300 ml-2">
                            ({uploadReport.autoSendReport.errors.length} skipped due to missing email)
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setTab('search')}
                    className="px-3.5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold text-xs"
                  >
                    View Uploaded Leads in Table →
                  </button>
                  {uploadReport.leads?.[0] && onStartOutreach && (
                    <button
                      type="button"
                      onClick={() => onStartOutreach(uploadReport.leads[0])}
                      className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700"
                    >
                      Open in AI Closer Hub
                    </button>
                  )}
                </div>
              </div>

              {uploadReport.autoSendReport?.sent?.length > 0 && (
                <div className="max-h-60 overflow-y-auto divide-y divide-slate-800/80 rounded-xl border border-slate-800 bg-slate-900/60">
                  {uploadReport.autoSendReport.sent.map((item, idx) => (
                    <div key={idx} className="p-3 flex items-center justify-between gap-3 text-xs">
                      <div className="min-w-0">
                        <span className="font-bold text-white">{item.lead?.company}</span>
                        <span className="text-slate-500 mx-2">→</span>
                        <span className="font-mono text-cyan-300">{item.email?.to}</span>
                        <div className="text-[11px] text-slate-400 truncate mt-0.5">
                          Subject: {item.email?.subject}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onStartOutreach && onStartOutreach(item.lead)}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 text-[11px] font-semibold border border-slate-700 shrink-0"
                      >
                        View Thread
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          TAB 4: SAVED EXCEL EXPORTS VAULT (.XLSX)
      ===================================================================== */}
      {tab === 'vault' && (
        <div className="bg-slate-900/85 rounded-2xl p-6 border border-slate-800 shadow-2xl space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                <span>Saved Excel (.xlsx) Datasets Vault</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Every scrape automatically saves a permanent Excel workbook in <code className="text-emerald-300 font-mono">{exportsDir || 'd:\\Lead-Finder\\exports'}</code>. You can download any file or <strong className="text-amber-300">load &amp; email its leads in 1 click</strong>.
              </p>
            </div>
            <div className="flex items-center gap-2 self-start">
              <button
                type="button"
                onClick={() => setTab('upload')}
                className="px-3.5 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 text-xs font-bold border border-amber-500/30 inline-flex items-center space-x-1.5"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload External File</span>
              </button>
              <button
                type="button"
                onClick={loadExcelVault}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 inline-flex items-center space-x-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingVault ? 'animate-spin' : ''}`} />
                <span>Refresh Vault</span>
              </button>
            </div>
          </div>

          {isLoadingVault ? (
            <div className="py-12 text-center text-slate-400 text-xs flex items-center justify-center space-x-2">
              <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
              <span>Loading saved Excel files...</span>
            </div>
          ) : exportedFiles.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <FileSpreadsheet className="w-10 h-10 text-slate-600 mx-auto" />
              <p className="text-sm font-bold text-white">No Excel Exports Yet</p>
              <p className="text-xs text-slate-400">Run a scrape in the Multi-Platform Scraper tab to automatically create your first .xlsx file.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {exportedFiles.map((file, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-emerald-500/40 transition-all flex flex-col justify-between gap-3"
                >
                  <div className="flex items-start space-x-3 min-w-0">
                    <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 shrink-0">
                      <FileSpreadsheet className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 space-y-0.5">
                      <div className="font-mono text-xs font-bold text-white truncate" title={file.fileName}>
                        {file.fileName}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {(file.sizeBytes / 1024).toFixed(1)} KB • {new Date(file.createdAt).toLocaleString()}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono truncate" title={file.filePath}>
                        {file.filePath}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-slate-800/80">
                    <button
                      type="button"
                      disabled={Boolean(vaultLoadingFile)}
                      onClick={() => handleVaultFileToEmail(file.fileName, false)}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold text-[11px] border border-cyan-500/30 flex items-center space-x-1"
                    >
                      {vaultLoadingFile === `${file.fileName}_load` ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Database className="w-3 h-3" />
                      )}
                      <span>Load Leads</span>
                    </button>

                    <button
                      type="button"
                      disabled={Boolean(vaultLoadingFile)}
                      onClick={() => handleVaultFileToEmail(file.fileName, true)}
                      className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 font-extrabold text-[11px] flex items-center space-x-1 shadow-sm"
                    >
                      {vaultLoadingFile === `${file.fileName}_email` ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Send className="w-3 h-3" />
                      )}
                      <span>⚡ Auto-Email All</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => triggerExcelDownload(file.downloadUrl, file.fileName)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-[11px] flex items-center space-x-1 shadow-sm"
                    >
                      <Download className="w-3 h-3" />
                      <span>Download</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
}

