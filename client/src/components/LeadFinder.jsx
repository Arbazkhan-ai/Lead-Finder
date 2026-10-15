import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, Globe, Mail, Phone, MapPin, Plus, Check, Loader2, 
  ExternalLink, Sparkles, Filter, RefreshCw, Send, CheckCircle2,
  FileSpreadsheet, Download, Database, Share2, Copy, LayoutGrid,
  List, ShieldAlert, ShieldCheck, FolderDown, Award, Layers, Upload,
  MessageSquare, MessageCircle, Zap
} from 'lucide-react';
import api from '../api/client';
import { 
  openSocialDirectMessage, 
  getDirectInboxUrl, 
  extractInstagramHandle, 
  extractFacebookUsername 
} from '../utils/socialDirectLinks';

export default function LeadFinder({ onLeadsAdded, onStartOutreach, settings, onOpenSettings }) {
  const [tab, setTab] = useState('search'); // 'search' | 'scrape' | 'upload' | 'vault'
  
  const hasMapsApiKey = Boolean(settings?.serpApiKey || settings?.googlePlacesApiKey);

  // Search state (default to 100 leads across Websites, Facebook, Instagram & LinkedIn)
  const [query, setQuery] = useState('Dental Clinics');
  const [location, setLocation] = useState('Austin, TX');
  const [limit, setLimit] = useState(100);
  const [platforms, setPlatforms] = useState(['websites', 'facebook', 'instagram', 'linkedin']);
  const [searchMode, setSearchMode] = useState(hasMapsApiKey ? 'api' : 'auto'); // 'api' | 'scraper' | 'hybrid' | 'auto'
  const [autoDownloadExcel, setAutoDownloadExcel] = useState(true);
  const [excludeExisting, setExcludeExisting] = useState(true);
  const [skippedCount, setSkippedCount] = useState(0);
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
  const [bulkProgress, setBulkProgress] = useState(null);

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

  // Sync searchMode if API key becomes available
  useEffect(() => {
    if (hasMapsApiKey && searchMode === 'scraper') {
      setSearchMode('api');
    }
  }, [hasMapsApiKey]);

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
    const withWhatsapp = searchResults.filter(l => Boolean(l.phone || l.socials?.whatsapp)).length;
    const withInstagram = searchResults.filter(l => Boolean(l.socials?.instagram || l.socials?.instagramHandle || l.instagramUrl)).length;
    const withFacebook = searchResults.filter(l => Boolean(l.socials?.facebook || l.facebookUrl)).length;
    const withLinkedin = searchResults.filter(l => Boolean(l.socials?.linkedin || l.linkedinUrl)).length;
    const withSocial = searchResults.filter(l => Boolean(l.socials?.facebook || l.socials?.instagram || l.socials?.linkedin || l.facebookUrl || l.instagramUrl || l.linkedinUrl)).length;
    const withAudit = searchResults.filter(l => Boolean(l.websiteAudit)).length;
    const primeCount = searchResults.filter(l => (l.qualityScore || 0) >= 75 || l.healthStatus === 'prime').length;
    return { total, withEmail, withPhone, withWhatsapp, withInstagram, withFacebook, withLinkedin, withSocial, withAudit, primeCount };
  }, [searchResults]);

  const filteredResults = useMemo(() => {
    return searchResults
      .map((lead, originalIndex) => ({ lead, originalIndex }))
      .filter(({ lead }) => {
        if (resultFilter === 'prime' && (lead.qualityScore || 0) < 75 && lead.healthStatus !== 'prime') return false;
        if (resultFilter === 'email' && !lead.email) return false;
        if (resultFilter === 'phone' && !lead.phone) return false;
        if (resultFilter === 'whatsapp' && !lead.phone && !lead.socials?.whatsapp) return false;
        if (resultFilter === 'instagram' && !lead.socials?.instagram && !lead.socials?.instagramHandle && !lead.instagramUrl) return false;
        if (resultFilter === 'facebook' && !lead.socials?.facebook && !lead.facebookUrl) return false;
        if (resultFilter === 'linkedin' && !lead.socials?.linkedin && !lead.linkedinUrl) return false;
        if (resultFilter === 'social' && !(lead.socials?.facebook || lead.socials?.instagram || lead.socials?.linkedin || lead.facebookUrl || lead.instagramUrl || lead.linkedinUrl)) return false;
        if (resultFilter === 'audited' && !lead.websiteAudit) return false;

        if (resultSearchText.trim()) {
          const q = resultSearchText.toLowerCase();
          const hay = `${lead.company || ''} ${lead.name || ''} ${lead.email || ''} ${lead.phone || ''} ${lead.website || ''} ${lead.source || ''}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      });
  }, [searchResults, resultFilter, resultSearchText]);

  const handleSelectByCriteria = (criteria) => {
    const indices = new Set();
    searchResults.forEach((lead, idx) => {
      if (criteria === 'instagram' && (lead.socials?.instagram || lead.socials?.instagramHandle || lead.instagramUrl)) {
        indices.add(idx);
      } else if (criteria === 'whatsapp' && (lead.phone || lead.socials?.whatsapp)) {
        indices.add(idx);
      } else if (criteria === 'email' && lead.email) {
        indices.add(idx);
      }
    });
    setSelectedIndices(indices);
    setResultFilter(criteria);
  };

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
    setSkippedCount(0);

    try {
      const res = await api.leads.search({
        query,
        location,
        limit: Number(limit),
        platforms,
        excludeExisting,
        searchMode
      });
      const leads = res.leads || [];
      setSearchResults(leads);
      setSkippedCount(res.skippedCount || 0);
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

  const handleClearHistory = async () => {
    if (!window.confirm('Reset generation history? Previously generated leads will be eligible for re-discovery.')) return;
    try {
      await api.leads.clearHistory();
      setAddedSuccess('✓ Generation history reset! Leads can now be re-discovered.');
    } catch (err) {
      alert('Failed to reset history: ' + err.message);
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

  const handleBulkAutoSend = async (onlyWithEmails = false) => {
    let leadsToProcess = [];
    let targetedIndices = [];

    if (onlyWithEmails) {
      searchResults.forEach((l, idx) => {
        if (l.email) {
          leadsToProcess.push(l);
          targetedIndices.push(idx);
        }
      });
    } else {
      searchResults.forEach((l, idx) => {
        if (selectedIndices.has(idx)) {
          leadsToProcess.push(l);
          targetedIndices.push(idx);
        }
      });
    }

    if (leadsToProcess.length === 0) {
      alert('No leads selected or no leads with verified emails found.');
      return;
    }

    const hasNoEmailCount = leadsToProcess.filter(l => !l.email).length;
    if (!onlyWithEmails && hasNoEmailCount > 0) {
      const validCount = leadsToProcess.length - hasNoEmailCount;
      if (validCount === 0) {
        alert('None of the selected leads have a verified email address.');
        return;
      }
      const confirmAll = window.confirm(
        `Out of ${leadsToProcess.length} selected leads, ${validCount} have verified emails and ${hasNoEmailCount} have no email.\n\nClick OK to automatically send outreach to all ${validCount} leads with verified emails!`
      );
      if (!confirmAll) return;
      const filtered = [];
      const newIndices = [];
      leadsToProcess.forEach((l, i) => {
        if (l.email) {
          filtered.push(l);
          newIndices.push(targetedIndices[i]);
        }
      });
      leadsToProcess = filtered;
      targetedIndices = newIndices;
    }

    setIsBulkAutoSending(true);
    try {
      const res = await api.outreach.bulkAutoSend(leadsToProcess);
      const sentCount = res.count || 0;
      const errorCount = res.errors?.length || 0;
      const skippedCount = res.skippedNoEmail?.length || 0;

      let msg = `⚡ Auto-Sent ${sentCount} outreach emails successfully!`;
      if (errorCount > 0) {
        msg += ` (${errorCount} failed: ${res.errors[0]?.error || 'delivery error'})`;
      }
      if (skippedCount > 0) {
        msg += ` (${skippedCount} skipped without email)`;
      }
      setAddedSuccess(msg);
      setSentRowIndices(prev => new Set([...prev, ...targetedIndices]));
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
      <div className="relative overflow-hidden rounded-2xl bg-white p-6 border border-slate-200 shadow-sm">
        <div className="absolute -right-12 -top-12 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="inline-flex items-center space-x-2 px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-[11px] font-bold uppercase tracking-wider">
              <Sparkles className="w-3 h-3" />
              <span>Multi-Engine Intelligence &amp; Auto-Excel Exporter</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Lead Prospecting &amp; Multi-Platform Scraper
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 max-w-2xl">
              Extract large datasets from <strong className="text-slate-900">Websites, Facebook, Instagram, LinkedIn &amp; Business Directories</strong> with automatic <code className="text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded font-mono font-bold">.xlsx</code> creation, or <strong className="text-blue-700">upload any scraper file to email leads</strong> in 1 click.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl border border-slate-200 shrink-0">
            <button
              onClick={() => setTab('search')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 transition-all ${
                tab === 'search'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              <span>Multi-Platform Scraper</span>
            </button>
            <button
              onClick={() => setTab('upload')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 transition-all ${
                tab === 'upload'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload File to Email</span>
            </button>
            <button
              onClick={() => setTab('scrape')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 transition-all ${
                tab === 'scrape'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Deep URL Scanner</span>
            </button>
            <button
              onClick={() => setTab('vault')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 transition-all ${
                tab === 'vault'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FolderDown className="w-3.5 h-3.5" />
              <span>Excel Vault (.xlsx)</span>
            </button>
          </div>
        </div>
      </div>

      {addedSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center justify-between shadow-xs">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="font-medium">{addedSuccess}</span>
          </div>
          <button onClick={() => setAddedSuccess('')} className="text-xs text-emerald-700 hover:underline ml-4 font-semibold">Dismiss</button>
        </div>
      )}

      {/* =====================================================================
          TAB 1: MULTI-PLATFORM NICHE SCRAPER
      ===================================================================== */}
      {tab === 'search' && (
        <div className="space-y-6">
          
          {/* Search Control Card */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-5">
            <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-12 gap-4">
              
              <div className="md:col-span-4 space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center justify-between">
                  <span>Target Niche / Industry</span>
                  <span className="text-[10px] text-blue-600 font-normal">Auto-expands 8+ synonyms</span>
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 text-blue-600 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="e.g. Dental Clinics, Law Firms, Med Spas..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-sm focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
                    required
                  />
                </div>
              </div>

              <div className="md:col-span-3 space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  City / Location
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-rose-500 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Austin, TX or New York, NY"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-sm focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
                  />
                </div>
              </div>

              <div className="md:col-span-2 space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Dataset Size
                </label>
                <div className="relative">
                  <Database className="w-4 h-4 text-emerald-600 absolute left-3.5 top-3 pointer-events-none" />
                  <select
                    value={limit}
                    onChange={(e) => setLimit(Number(e.target.value))}
                    className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-sm focus:outline-none focus:border-blue-500 focus:bg-white cursor-pointer"
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
                  className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm shadow-sm flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
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

            {/* Discovery Engine Selector: Pure API vs Web Scraper vs Hybrid */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3.5 border-t border-slate-200">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-slate-700 mr-1 flex items-center space-x-1">
                  <span>Discovery Engine:</span>
                </span>

                <button
                  type="button"
                  onClick={() => setSearchMode('api')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center space-x-1.5 ${
                    searchMode === 'api'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-400 shadow-xs ring-1 ring-emerald-300'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                  title="Uses Google Places / SerpAPI ONLY without fallback scraping"
                >
                  <Zap className="w-3.5 h-3.5 text-emerald-600" />
                  <span>⚡ Google Maps API Only</span>
                  {searchMode === 'api' && <Check className="w-3 h-3 text-emerald-600" />}
                </button>

                <button
                  type="button"
                  onClick={() => setSearchMode('scraper')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center space-x-1.5 ${
                    searchMode === 'scraper'
                      ? 'bg-purple-50 text-purple-800 border-purple-400 shadow-xs ring-1 ring-purple-300'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                  title="Uses Web Scrapers (Overpass, YellowPages, Bing) - No API Key Needed"
                >
                  <Globe className="w-3.5 h-3.5 text-purple-600" />
                  <span>🌐 Web Scraper (No API Key)</span>
                  {searchMode === 'scraper' && <Check className="w-3 h-3 text-purple-600" />}
                </button>

                <button
                  type="button"
                  onClick={() => setSearchMode('hybrid')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center space-x-1.5 ${
                    searchMode === 'hybrid'
                      ? 'bg-blue-50 text-blue-800 border-blue-400 shadow-xs ring-1 ring-blue-300'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                  title="Uses API first, fills any remaining quota with web directory scrapers"
                >
                  <Layers className="w-3.5 h-3.5 text-blue-600" />
                  <span>🔀 Hybrid (API + Scraper)</span>
                  {searchMode === 'hybrid' && <Check className="w-3 h-3 text-blue-600" />}
                </button>
              </div>

              <div className="text-[11px] font-semibold">
                {searchMode === 'api' ? (
                  <span className="text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                    Pure API Mode: Scraper fallback disabled
                  </span>
                ) : searchMode === 'scraper' ? (
                  <span className="text-purple-700 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-200">
                    Scraper Mode: Free web directory extraction
                  </span>
                ) : (
                  <span className="text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
                    Hybrid Mode: API prioritized with scraper backup
                  </span>
                )}
              </div>
            </div>

            {/* Target Platforms Selector Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-slate-600 mr-1">Active Data Sources:</span>

                <button
                  type="button"
                  onClick={() => togglePlatform('websites')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center space-x-1.5 ${
                    platforms.includes('websites')
                      ? 'bg-blue-50 text-blue-700 border-blue-300 shadow-xs'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span>🌐 Websites, Overpass &amp; Directories</span>
                  {platforms.includes('websites') && <Check className="w-3 h-3 text-blue-600" />}
                </button>

                <button
                  type="button"
                  onClick={() => togglePlatform('facebook')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center space-x-1.5 ${
                    platforms.includes('facebook')
                      ? 'bg-blue-50 text-blue-700 border-blue-300 shadow-xs'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span>📘 Facebook Pages</span>
                  {platforms.includes('facebook') && <Check className="w-3 h-3 text-blue-600" />}
                </button>

                <button
                  type="button"
                  onClick={() => togglePlatform('instagram')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center space-x-1.5 ${
                    platforms.includes('instagram')
                      ? 'bg-pink-50 text-pink-700 border-pink-300 shadow-xs'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span>📸 Instagram Profiles</span>
                  {platforms.includes('instagram') && <Check className="w-3 h-3 text-pink-600" />}
                </button>

                <button
                  type="button"
                  onClick={() => togglePlatform('linkedin')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center space-x-1.5 ${
                    platforms.includes('linkedin')
                      ? 'bg-sky-50 text-sky-700 border-sky-300 shadow-xs'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span>💼 LinkedIn Companies &amp; Founders</span>
                  {platforms.includes('linkedin') && <Check className="w-3 h-3 text-sky-600" />}
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <label className="inline-flex items-center space-x-2 cursor-pointer select-none bg-blue-50 hover:bg-blue-100/70 border border-blue-200 px-3.5 py-1.5 rounded-xl transition-colors">
                  <input
                    type="checkbox"
                    checked={excludeExisting}
                    onChange={(e) => setExcludeExisting(e.target.checked)}
                    className="rounded bg-white border-blue-400 text-blue-600 focus:ring-0 cursor-pointer"
                  />
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                  <span className="text-xs font-bold text-blue-800">Skip Previously Generated Leads</span>
                </label>

                <label className="inline-flex items-center space-x-2 cursor-pointer select-none bg-emerald-50 hover:bg-emerald-100/70 border border-emerald-200 px-3.5 py-1.5 rounded-xl transition-colors">
                  <input
                    type="checkbox"
                    checked={autoDownloadExcel}
                    onChange={(e) => setAutoDownloadExcel(e.target.checked)}
                    className="rounded bg-white border-emerald-400 text-emerald-600 focus:ring-0 cursor-pointer"
                  />
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-xs font-bold text-emerald-800">Auto-Download Excel (.xlsx)</span>
                </label>
              </div>
            </div>

            {/* Quick Presets */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-200">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-semibold text-slate-500 mr-1">1-Click Presets:</span>
                {quickPresets.map((p, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => { setQuery(p.q); setLocation(p.loc); }}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs transition-all border border-slate-200 hover:border-blue-300 font-medium"
                  >
                    <span>{p.icon} {p.q}</span>
                    <span className="text-slate-500 ml-1">• {p.loc}</span>
                  </button>
                ))}
              </div>

              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={handleClearHistory}
                  className="text-[11px] text-slate-500 hover:text-rose-600 font-semibold transition-colors"
                  title="Reset lead generation history so previously generated leads can be re-scraped"
                >
                  Reset History
                </button>
                <span className="text-slate-300">•</span>
                <button
                  type="button"
                  onClick={onOpenSettings}
                  className="text-[11px] text-blue-600 hover:text-blue-700 underline font-semibold"
                >
                  {hasMapsApiKey ? 'Google Maps API Active ✓' : '+ Connect Optional SerpAPI / Places Key'}
                </button>
              </div>
            </div>
          </div>

          {/* LIVE SCRAPING TELEMETRY STEPPER */}
          {isSearching && (
            <div className="bg-white rounded-2xl p-6 border border-blue-200 shadow-sm space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
                    <Loader2 className="w-5 h-5 animate-spin" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Multi-Engine Scraper Extracting "{query}" in "{location}" (Target: {limit} Leads)...
                    </h3>
                    <p className="text-xs text-slate-500">
                      Crawling Websites, Facebook, Instagram, LinkedIn, Overpass &amp; YellowPages + compiling Excel (.xlsx)
                    </p>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold animate-pulse">
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
                          ? 'bg-blue-50/80 border-blue-300 text-slate-900 shadow-xs'
                          : done
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                          : 'bg-slate-50 border-slate-200 text-slate-500'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-extrabold">{item.step}. {item.title}</span>
                        {done ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        ) : active ? (
                          <Loader2 className="w-3.5 h-3.5 text-blue-600 animate-spin" />
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
            <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
              <div className="flex items-start space-x-3.5">
                <div className="p-3 rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-700 shrink-0">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-extrabold text-slate-900">Excel (.xlsx) File Saved Automatically:</span>
                    <span className="px-2.5 py-0.5 rounded-lg bg-emerald-100 text-emerald-800 font-mono text-xs border border-emerald-300 font-semibold">
                      {latestExcelFile.fileName}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600">
                    Disk Path: <code className="text-slate-700 font-mono bg-white px-2 py-0.5 rounded border border-slate-200">{latestExcelFile.filePath}</code>
                  </p>
                  <div className="flex flex-wrap gap-3 text-[11px] text-slate-600 pt-0.5">
                    <span>Total Rows: <strong className="text-slate-900">{latestExcelFile.rowCount}</strong></span>
                    <span>• Emails: <strong className="text-blue-700">{latestExcelFile.withEmailCount}</strong></span>
                    <span>• Phones: <strong className="text-emerald-700">{latestExcelFile.withPhoneCount}</strong></span>
                    <span>• Websites: <strong className="text-indigo-700">{latestExcelFile.withWebsiteCount}</strong></span>
                    <span>• Facebook: <strong className="text-blue-600">{latestExcelFile.withFacebookCount || 0}</strong></span>
                    <span>• Instagram: <strong className="text-pink-600">{latestExcelFile.withInstagramCount || 0}</strong></span>
                    <span>• LinkedIn: <strong className="text-sky-600">{latestExcelFile.withLinkedinCount || 0}</strong></span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => triggerExcelDownload(latestExcelFile.downloadUrl, latestExcelFile.fileName)}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-xs flex items-center space-x-2 transition-all"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Excel (.xlsx)</span>
                </button>
              </div>
            </div>
          )}

          {/* Skipped Previously Generated Leads Banner */}
          {skippedCount > 0 && (
            <div className="p-3.5 rounded-2xl bg-blue-50/90 border border-blue-200 flex items-center justify-between gap-3 text-xs text-blue-900 shadow-xs">
              <div className="flex items-center space-x-2.5">
                <div className="p-1.5 rounded-lg bg-blue-100 text-blue-700 shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-extrabold">{skippedCount} previously generated leads skipped:</span>
                  <span className="text-blue-700 ml-1.5">
                    Our deduplication engine filtered out businesses you have already discovered, ensuring 100% fresh, non-duplicate prospects.
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* INTERACTIVE KPI FILTER BAR & RESULTS TABLE */}
          {searchResults.length > 0 && (
            <div className="space-y-4">
              
              {/* Clickable KPI Filter Cards with Dedicated Instagram & WhatsApp Accounts */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {[
                  { id: 'all', label: 'All Scraped Leads', count: metrics.total, color: 'border-slate-400 text-slate-900 bg-slate-50 ring-1 ring-slate-400' },
                  { id: 'instagram', label: '📸 Instagram Account', count: metrics.withInstagram, color: 'border-pink-500 text-pink-900 bg-pink-50 ring-2 ring-pink-400' },
                  { id: 'whatsapp', label: '💬 WhatsApp Ready', count: metrics.withWhatsapp, color: 'border-emerald-500 text-emerald-950 bg-emerald-50 ring-2 ring-emerald-400' },
                  { id: 'email', label: '✉️ Verified Emails', count: metrics.withEmail, color: 'border-blue-400 text-blue-900 bg-blue-50 ring-1 ring-blue-400' },
                  { id: 'facebook', label: '📘 Facebook Pages', count: metrics.withFacebook, color: 'border-indigo-400 text-indigo-900 bg-indigo-50 ring-1 ring-indigo-400' },
                  { id: 'prime', label: '🟢 Prime Verified', count: metrics.primeCount, color: 'border-teal-500 text-teal-950 bg-teal-50 ring-1 ring-teal-500' }
                ].map(card => {
                  const isActive = resultFilter === card.id;
                  return (
                    <button
                      key={card.id}
                      type="button"
                      onClick={() => setResultFilter(card.id)}
                      className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                        isActive
                          ? `${card.color} shadow-xs scale-[1.01]`
                          : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 shadow-xs'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">{card.label}</span>
                        {isActive && <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-900 text-white font-bold">Active</span>}
                      </div>
                      <div className="text-2xl font-black text-slate-900 mt-1">{card.count}</div>
                    </button>
                  );
                })}
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                
                {/* Account Filter Tags Bar: Filter & Choose which leads actually have Instagram / WhatsApp */}
                <div className="flex flex-wrap items-center justify-between gap-2.5 px-4 py-3 bg-gradient-to-r from-slate-50 to-slate-100/70 border-b border-slate-200 text-xs">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-extrabold text-slate-700 mr-1 flex items-center space-x-1">
                      <span>Filter by Actual Account:</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setResultFilter('all')}
                      className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        resultFilter === 'all'
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-300'
                      }`}
                    >
                      All Leads ({metrics.total})
                    </button>
                    <button
                      type="button"
                      onClick={() => setResultFilter('instagram')}
                      className={`px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                        resultFilter === 'instagram'
                          ? 'bg-pink-600 text-white shadow-xs ring-2 ring-pink-300'
                          : 'bg-pink-50 text-pink-700 hover:bg-pink-100 border border-pink-300'
                      }`}
                      title="Filter and show ONLY leads that have an actual verified Instagram account / handle"
                    >
                      <span>📸 Instagram Account</span>
                      <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${resultFilter === 'instagram' ? 'bg-white/30 text-white' : 'bg-pink-200 text-pink-800'}`}>
                        {metrics.withInstagram}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setResultFilter('whatsapp')}
                      className={`px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                        resultFilter === 'whatsapp'
                          ? 'bg-emerald-600 text-white shadow-xs ring-2 ring-emerald-300'
                          : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-300'
                      }`}
                      title="Filter and show ONLY leads that have an actual WhatsApp contact / direct number"
                    >
                      <span>💬 WhatsApp Ready</span>
                      <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${resultFilter === 'whatsapp' ? 'bg-white/30 text-white' : 'bg-emerald-200 text-emerald-800'}`}>
                        {metrics.withWhatsapp}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setResultFilter('email')}
                      className={`px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                        resultFilter === 'email'
                          ? 'bg-blue-600 text-white shadow-xs ring-2 ring-blue-300'
                          : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-300'
                      }`}
                    >
                      <span>✉️ Verified Email</span>
                      <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${resultFilter === 'email' ? 'bg-white/30 text-white' : 'bg-blue-200 text-blue-800'}`}>
                        {metrics.withEmail}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setResultFilter('facebook')}
                      className={`px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                        resultFilter === 'facebook'
                          ? 'bg-indigo-600 text-white shadow-xs ring-2 ring-indigo-300'
                          : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-300'
                      }`}
                    >
                      <span>📘 Facebook</span>
                      <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${resultFilter === 'facebook' ? 'bg-white/30 text-white' : 'bg-indigo-200 text-indigo-800'}`}>
                        {metrics.withFacebook}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setResultFilter('linkedin')}
                      className={`px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                        resultFilter === 'linkedin'
                          ? 'bg-sky-600 text-white shadow-xs ring-2 ring-sky-300'
                          : 'bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-300'
                      }`}
                    >
                      <span>💼 LinkedIn</span>
                      <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${resultFilter === 'linkedin' ? 'bg-white/30 text-white' : 'bg-sky-200 text-sky-800'}`}>
                        {metrics.withLinkedin}
                      </span>
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 shrink-0 text-[11px]">
                    <span className="text-slate-500 font-semibold">1-Click Select:</span>
                    <button
                      type="button"
                      onClick={() => handleSelectByCriteria('instagram')}
                      className="px-2.5 py-1 rounded-lg bg-pink-100/80 hover:bg-pink-200 text-pink-800 font-bold border border-pink-300 transition-colors cursor-pointer"
                      title="Select all leads that actually have an Instagram account"
                    >
                      + Select All IG ({metrics.withInstagram})
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectByCriteria('whatsapp')}
                      className="px-2.5 py-1 rounded-lg bg-emerald-100/80 hover:bg-emerald-200 text-emerald-800 font-bold border border-emerald-300 transition-colors cursor-pointer"
                      title="Select all leads that actually have a WhatsApp number"
                    >
                      + Select All WA ({metrics.withWhatsapp})
                    </button>
                  </div>
                </div>

                {/* Table Header Controls */}
                <div className="p-4 bg-slate-50/70 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <button
                      onClick={toggleSelectAll}
                      className="text-xs px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-semibold transition-colors shadow-xs"
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
                        className="pl-8 pr-3 py-1.5 rounded-lg bg-white border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-blue-500 w-56"
                      />
                    </div>

                    <span className="text-xs text-slate-600">
                      Showing <strong className="text-slate-900">{filteredResults.length}</strong> of {searchResults.length} • <strong className="text-blue-600">{selectedIndices.size}</strong> selected
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* View Switcher: Table vs Card Grid */}
                    <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
                      <button
                        type="button"
                        onClick={() => setViewMode('table')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center space-x-1 ${
                          viewMode === 'table' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <List className="w-3.5 h-3.5" />
                        <span>Table</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setViewMode('grid')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center space-x-1 ${
                          viewMode === 'grid' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
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
                      className="px-3 py-2 rounded-xl bg-white hover:bg-slate-50 text-blue-700 border border-blue-200 text-xs font-bold flex items-center space-x-1.5 transition-all shadow-xs"
                      title="Copy all verified emails to clipboard"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>{copiedEmailsToast ? 'Copied Emails! ✓' : `Copy Emails (${metrics.withEmail})`}</span>
                    </button>

                    {/* Export Excel Button */}
                    <button
                      onClick={handleExportSelectedToExcel}
                      disabled={isExportingExcel || searchResults.length === 0}
                      className="px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100/70 text-emerald-800 border border-emerald-300 text-xs font-bold flex items-center space-x-1.5 transition-all disabled:opacity-40 shadow-xs"
                    >
                      {isExportingExcel ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Creating Excel...</span>
                        </>
                      ) : (
                        <>
                          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Export Excel (.xlsx)</span>
                        </>
                      )}
                    </button>

                    {/* Auto-Send All Verified Emails Button */}
                    {metrics.withEmail > 0 && (
                      <button
                        type="button"
                        onClick={() => handleBulkAutoSend(true)}
                        disabled={isBulkAutoSending}
                        className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-black shadow-xs flex items-center space-x-1.5 transition-all disabled:opacity-40"
                        title={`Automatically send personalized cold outreach to all ${metrics.withEmail} leads with verified emails`}
                      >
                        {isBulkAutoSending ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Sending {metrics.withEmail} Emails...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3.5 h-3.5 fill-current" />
                            <span>⚡ Send All ({metrics.withEmail}) Emails</span>
                          </>
                        )}
                      </button>
                    )}

                    {/* Auto-Send Bulk Outreach */}
                    <button
                      onClick={() => handleBulkAutoSend(false)}
                      disabled={isBulkAutoSending || selectedIndices.size === 0}
                      className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs flex items-center space-x-1.5 transition-all disabled:opacity-40"
                    >
                      {isBulkAutoSending ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Sending...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5 fill-current" />
                          <span>Auto-Send ({selectedIndices.size})</span>
                        </>
                      )}
                    </button>

                    {/* Import to Pipeline */}
                    <button
                      onClick={handleBulkAdd}
                      disabled={isAddingBulk || selectedIndices.size === 0}
                      className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-300 flex items-center space-x-1.5 transition-all disabled:opacity-40 shadow-xs"
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
                      <thead className="sticky top-0 z-10 bg-slate-100">
                        <tr className="bg-slate-100 text-[11px] uppercase tracking-wider text-slate-700 font-bold border-b border-slate-200">
                          <th className="p-3.5 w-10 text-center">
                            <input
                              type="checkbox"
                              checked={selectedIndices.size === searchResults.length && searchResults.length > 0}
                              onChange={toggleSelectAll}
                              className="rounded bg-white border-slate-300 text-blue-600 focus:ring-0 cursor-pointer"
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
                      <tbody className="divide-y divide-slate-200 text-xs bg-white">
                        {filteredResults.map(({ lead, originalIndex: idx }) => {
                          const isSelected = selectedIndices.has(idx);
                          const isRowScraping = scrapingIndex === idx;
                          const hasDirectFb = Boolean(lead.socials?.facebook || lead.facebookUrl);
                          const hasDirectIg = Boolean(lead.socials?.instagram || lead.socials?.instagramHandle || lead.instagramUrl);
                          const hasDirectWa = Boolean(lead.phone || lead.socials?.whatsapp);
                          const hasDirectLi = Boolean(lead.socials?.linkedin || lead.linkedinUrl);
                          const qScore = lead.qualityScore || 65;

                          return (
                            <tr
                              key={idx}
                              className={`transition-colors hover:bg-slate-50 ${
                                isSelected ? 'bg-blue-50/60' : 'bg-white'
                              }`}
                            >
                              {/* Checkbox */}
                              <td className="p-3.5 text-center">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleSelect(idx)}
                                  className="rounded bg-white border-slate-300 text-blue-600 focus:ring-0 cursor-pointer"
                                />
                              </td>

                              {/* Quality Score & Health Status Badge */}
                              <td className="p-3.5 text-center">
                                <div className="flex flex-col items-center space-y-1">
                                  <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-lg text-[11px] font-black border ${
                                    qScore >= 75
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                                      : qScore >= 50
                                      ? 'bg-blue-50 text-blue-700 border-blue-300'
                                      : 'bg-amber-50 text-amber-700 border-amber-300'
                                  }`} title="Lead Quality & Reachability Completeness Score">
                                    {qScore}%
                                  </span>
                                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                                    qScore >= 75
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : qScore >= 50
                                      ? 'bg-blue-100 text-blue-800'
                                      : 'bg-amber-100 text-amber-800'
                                  }`}>
                                    {lead.healthBadge || (qScore >= 75 ? 'Prime' : qScore >= 50 ? 'Healthy' : 'Contactable')}
                                  </span>
                                </div>
                              </td>

                              {/* Company Name, Decision Maker & Problem-Solution Diagnosis */}
                              <td className="p-3.5 max-w-[280px]">
                                <div className="font-bold text-slate-900 text-sm truncate" title={lead.company}>{lead.company}</div>
                                <div className="text-[11px] text-blue-700 font-medium truncate" title={lead.name}>
                                  👤 {lead.name || 'Owner / Decision Maker'}
                                </div>
                                <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                                  <span className="text-[10px] text-slate-500 capitalize">{lead.category}</span>
                                  {lead.source && (
                                    <span className={`text-[9px] px-1.5 py-0.2 rounded border font-semibold ${
                                      lead.source.includes('Facebook')
                                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                                        : lead.source.includes('Instagram')
                                        ? 'bg-pink-50 text-pink-700 border-pink-200'
                                        : lead.source.includes('LinkedIn')
                                        ? 'bg-sky-50 text-sky-700 border-sky-200'
                                        : 'bg-slate-100 text-slate-600 border-slate-200'
                                    }`}>
                                      {lead.source}
                                    </span>
                                  )}
                                </div>
                                
                                {(() => {
                                  const snippet = getLeadProblemSnippet(lead);
                                  return (
                                    <div className="mt-1.5 space-y-1">
                                      <div className="flex items-center space-x-1 text-[10px] text-rose-800 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200 truncate" title={`Problem: ${snippet.pain}`}>
                                        <span className="font-bold text-rose-600 shrink-0">Pain:</span>
                                        <span className="truncate">{snippet.pain}</span>
                                      </div>
                                      <div className="flex items-center space-x-1 text-[10px] text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 truncate" title={`Solution: ${snippet.sol}`}>
                                        <span className="font-bold text-emerald-600 shrink-0">Pitch:</span>
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
                                    className="inline-flex items-center space-x-1 text-blue-600 hover:text-blue-800 hover:underline max-w-[220px] truncate block font-semibold"
                                    title={lead.website}
                                  >
                                    <Globe className="w-3.5 h-3.5 shrink-0" />
                                    <span className="truncate">{lead.website.replace(/^https?:\/\/(www\.)?/, '')}</span>
                                    <ExternalLink className="w-3 h-3 shrink-0 opacity-70 ml-1" />
                                  </a>
                                ) : (
                                  <span className="text-slate-400 text-[11px]">Social / Directory Profile</span>
                                )}

                                {/* Website Audit & Tech Stack Badges */}
                                <div className="flex flex-wrap items-center gap-1">
                                  {lead.websiteAudit && (
                                    <span className={`px-1.5 py-0.2 rounded text-[9px] font-black border ${
                                      lead.websiteAudit.score >= 80 
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                        : lead.websiteAudit.score >= 60
                                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                                        : 'bg-rose-50 text-rose-700 border-rose-200'
                                    }`} title={lead.websiteAudit.topWeakPoint?.title || 'Website Audited'}>
                                      Audit: {lead.websiteAudit.score}% ({lead.websiteAudit.weakPoints?.length || 0} flaws)
                                    </span>
                                  )}
                                  {Array.isArray(lead.techStack) && lead.techStack.slice(0, 2).map((tech, tIdx) => (
                                    <span key={tIdx} className="px-1.5 py-0.2 rounded text-[9px] bg-slate-100 text-slate-700 border border-slate-200">
                                      {tech}
                                    </span>
                                  ))}
                                </div>

                                <div>
                                  {lead.email ? (
                                    <div className="space-y-0.5">
                                      <span className="inline-flex items-center space-x-1 text-slate-800 font-mono text-[11px] px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200">
                                        <Mail className="w-3 h-3 text-emerald-600" />
                                        <span>{lead.email}</span>
                                      </span>
                                      {Array.isArray(lead.allEmails) && lead.allEmails.length > 1 && (
                                        <div className="text-[10px] text-blue-600 font-mono">
                                          +{lead.allEmails.length - 1} more email(s) in Excel
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => handleDeepScrapeRow(idx, lead)}
                                      disabled={isRowScraping}
                                      className="inline-flex items-center space-x-1 text-[11px] text-blue-600 hover:text-blue-800 font-bold underline disabled:opacity-50"
                                    >
                                      {isRowScraping ? (
                                        <>
                                          <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
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
                              <td className="p-3.5 space-y-2">
                                {/* Actual Account Detection Tags */}
                                <div className="flex flex-wrap items-center gap-1.5">
                                  {hasDirectIg ? (
                                    <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-pink-50 text-pink-700 border border-pink-200" title="Actual verified Instagram account">
                                      <span className="w-1.5 h-1.5 rounded-full bg-pink-500 animate-pulse"></span>
                                      <span>{lead.socials?.instagramHandle ? lead.socials.instagramHandle : 'Instagram ✓'}</span>
                                    </span>
                                  ) : (
                                    <span className="px-1.5 py-0.5 rounded text-[9px] text-slate-400 bg-slate-50 border border-slate-200">
                                      No IG
                                    </span>
                                  )}

                                  {hasDirectWa ? (
                                    <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200" title="Actual WhatsApp contact ready">
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                      <span>WhatsApp Ready ✓</span>
                                    </span>
                                  ) : (
                                    <span className="px-1.5 py-0.5 rounded text-[9px] text-slate-400 bg-slate-50 border border-slate-200">
                                      No WA
                                    </span>
                                  )}

                                  {hasDirectFb && (
                                    <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                                      <span>FB Page ✓</span>
                                    </span>
                                  )}
                                </div>

                                {/* Direct Action 1-Click Message Inboxes */}
                                <div className="flex flex-wrap gap-1.5">
                                  {/* Direct Instagram DM */}
                                  {hasDirectIg && (
                                    <button
                                      type="button"
                                      onClick={() => openSocialDirectMessage('instagram', lead, setAddedSuccess)}
                                      className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold border transition-colors bg-pink-50 text-pink-700 border-pink-300 hover:bg-pink-100 shadow-2xs cursor-pointer"
                                      title="Open Instagram Direct DM Inbox (Auto-copies pitch)"
                                    >
                                      <span>💬 IG DM</span>
                                    </button>
                                  )}

                                  {/* Direct WhatsApp Message if phone exists */}
                                  {hasDirectWa && (
                                    <button
                                      type="button"
                                      onClick={() => openSocialDirectMessage('whatsapp', lead, setAddedSuccess)}
                                      className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold border transition-colors bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100 shadow-2xs cursor-pointer"
                                      title="Open WhatsApp Direct Message (Auto-copies pitch)"
                                    >
                                      <span>💬 WA Msg</span>
                                    </button>
                                  )}

                                  {/* Direct Facebook Messenger */}
                                  {hasDirectFb && (
                                    <button
                                      type="button"
                                      onClick={() => openSocialDirectMessage('facebook', lead, setAddedSuccess)}
                                      className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold border transition-colors bg-blue-50 text-blue-700 border-blue-300 hover:bg-blue-100 shadow-2xs cursor-pointer"
                                      title="Open Facebook Messenger Direct Inbox (Auto-copies pitch)"
                                    >
                                      <span>💬 FB Msg</span>
                                    </button>
                                  )}

                                  {/* Direct LinkedIn Message */}
                                  {hasDirectLi && (
                                    <button
                                      type="button"
                                      onClick={() => openSocialDirectMessage('linkedin', lead, setAddedSuccess)}
                                      className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold border transition-colors bg-sky-50 text-sky-700 border-sky-300 hover:bg-sky-100 shadow-2xs cursor-pointer"
                                      title="Open LinkedIn Messaging (Auto-copies pitch)"
                                    >
                                      <span>💬 LI Msg</span>
                                    </button>
                                  )}
                                </div>

                                <div className="flex flex-wrap items-center gap-1.5 text-[9px]">
                                  {lead.mapsUrl && (
                                    <a
                                      href={lead.mapsUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
                                    >
                                      <MapPin className="w-2.5 h-2.5 text-red-500" />
                                      <span>Maps</span>
                                    </a>
                                  )}

                                  {(lead.socials?.facebook || lead.facebookUrl) && (
                                    <a
                                      href={lead.socials?.facebook || lead.facebookUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-blue-600 hover:underline inline-flex items-center space-x-0.5"
                                      title="View Facebook Profile Page"
                                    >
                                      <span>FB Page ↗</span>
                                    </a>
                                  )}

                                  {(lead.socials?.instagram || lead.instagramUrl) && (
                                    <a
                                      href={lead.socials?.instagram || lead.instagramUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-pink-600 hover:underline inline-flex items-center space-x-0.5"
                                      title="View Instagram Profile Page"
                                    >
                                      <span>IG Profile ↗</span>
                                    </a>
                                  )}

                                  {lead.linkedinUrl && (
                                    <a
                                      href={lead.linkedinUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-sky-600 hover:underline inline-flex items-center space-x-0.5"
                                      title="View LinkedIn Page"
                                    >
                                      <span>LI Page ↗</span>
                                    </a>
                                  )}
                                </div>
                              </td>

                              {/* Location & Phone */}
                              <td className="p-3.5">
                                {lead.phone ? (
                                  <div className="text-slate-800 font-mono text-[11px] flex items-center space-x-1 mb-0.5 font-semibold">
                                    <Phone className="w-3 h-3 text-emerald-600" />
                                    <span>{lead.phone}</span>
                                  </div>
                                ) : (
                                  <div className="text-slate-400 text-[11px] mb-0.5">No phone listed</div>
                                )}
                                <div className="text-[11px] text-slate-500 truncate max-w-[190px]" title={lead.address}>
                                  {lead.address}
                                </div>
                              </td>

                              {/* Action */}
                              <td className="p-3.5 text-right space-y-1.5 whitespace-nowrap">
                                <button
                                  type="button"
                                  onClick={() => handleRowAutoSend(idx, lead)}
                                  disabled={autoSendingRowIndex === idx}
                                  className={`px-3 py-1.5 rounded-xl text-xs font-bold shadow-xs transition-all inline-flex items-center space-x-1.5 ${
                                    sentRowIndices.has(idx)
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                                  }`}
                                >
                                  {autoSendingRowIndex === idx ? (
                                    <>
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                      <span>Sending...</span>
                                    </>
                                  ) : sentRowIndices.has(idx) ? (
                                    <>
                                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                      <span>Sent!</span>
                                    </>
                                  ) : (
                                    <>
                                      <Sparkles className="w-3 h-3 fill-current" />
                                      <span>Auto-Send</span>
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
                                    className="text-[10px] text-blue-600 hover:text-blue-800 font-bold hover:underline inline-flex items-center space-x-1"
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
                  <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[740px] overflow-y-auto bg-slate-50/50">
                    {filteredResults.map(({ lead, originalIndex: idx }) => {
                      const isSelected = selectedIndices.has(idx);
                      const qScore = lead.qualityScore || 65;
                      const snippet = getLeadProblemSnippet(lead);

                      return (
                        <div
                          key={idx}
                          className={`rounded-2xl p-4 border transition-all flex flex-col justify-between space-y-3 bg-white ${
                            isSelected
                              ? 'border-blue-500 shadow-sm ring-1 ring-blue-500'
                              : 'border-slate-200 shadow-xs hover:border-slate-300'
                          }`}
                        >
                          <div className="space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center space-x-2 min-w-0">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleSelect(idx)}
                                  className="rounded bg-white border-slate-300 text-blue-600 focus:ring-0 cursor-pointer"
                                />
                                <h4 className="font-bold text-slate-900 text-sm truncate" title={lead.company}>
                                  {lead.company}
                                </h4>
                              </div>
                              <div className="flex items-center space-x-1 shrink-0">
                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                                  qScore >= 75 ? 'bg-emerald-100 text-emerald-800' : qScore >= 50 ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
                                }`}>
                                  {lead.healthBadge || (qScore >= 75 ? 'Prime' : qScore >= 50 ? 'Healthy' : 'Contactable')}
                                </span>
                                <span className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  {qScore}%
                                </span>
                              </div>
                            </div>

                            <div className="text-[11px] text-blue-700 font-medium">
                              👤 {lead.name || 'Owner / Decision Maker'} • <span className="text-slate-500">{lead.source}</span>
                            </div>

                            <div className="space-y-1 text-xs pt-1">
                              {lead.email ? (
                                <div className="flex items-center space-x-1.5 text-emerald-800 font-mono text-[11px] font-semibold">
                                  <Mail className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
                                  <span className="truncate">{lead.email}</span>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleDeepScrapeRow(idx, lead)}
                                  className="text-[11px] text-blue-600 underline font-semibold"
                                >
                                  + Hunt Verified Email
                                </button>
                              )}

                              {lead.phone && (
                                <div className="flex items-center space-x-1.5 text-slate-700 font-mono text-[11px]">
                                  <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                  <span>{lead.phone}</span>
                                </div>
                              )}

                              {lead.website && (
                                <a
                                  href={lead.website}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="flex items-center space-x-1.5 text-blue-600 hover:underline text-[11px] truncate font-medium"
                                >
                                  <Globe className="w-3.5 h-3.5 shrink-0" />
                                  <span className="truncate">{lead.website}</span>
                                </a>
                              )}
                            </div>

                            {/* Actual Account Detection Badges */}
                            <div className="flex flex-wrap items-center gap-1.5 pt-1">
                              {Boolean(lead.socials?.instagram || lead.socials?.instagramHandle || lead.instagramUrl) ? (
                                <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-pink-50 text-pink-700 border border-pink-200" title="Actual verified Instagram account">
                                  <span className="w-1.5 h-1.5 rounded-full bg-pink-500 animate-pulse"></span>
                                  <span>{lead.socials?.instagramHandle || 'Instagram ✓'}</span>
                                </span>
                              ) : null}

                              {Boolean(lead.phone || lead.socials?.whatsapp) ? (
                                <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200" title="Actual WhatsApp contact ready">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                  <span>WhatsApp Ready ✓</span>
                                </span>
                              ) : null}

                              {Boolean(lead.socials?.facebook || lead.facebookUrl) ? (
                                <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                                  <span>FB Page ✓</span>
                                </span>
                              ) : null}
                            </div>

                            {/* Social Direct Message Buttons */}
                            <div className="flex flex-wrap gap-1.5 pt-0.5">
                              {Boolean(lead.socials?.instagram || lead.socials?.instagramHandle || lead.instagramUrl) && (
                                <button
                                  type="button"
                                  onClick={() => openSocialDirectMessage('instagram', lead, setAddedSuccess)}
                                  className="px-2 py-0.5 rounded bg-pink-50 hover:bg-pink-100 text-pink-700 border border-pink-200 text-[10px] font-bold cursor-pointer transition-colors"
                                  title="Open Instagram Direct DM Inbox (Auto-copies tailored pitch)"
                                >
                                  💬 IG DM
                                </button>
                              )}
                              {Boolean(lead.phone || lead.socials?.whatsapp) && (
                                <button
                                  type="button"
                                  onClick={() => openSocialDirectMessage('whatsapp', lead, setAddedSuccess)}
                                  className="px-2 py-0.5 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-[10px] font-bold cursor-pointer transition-colors"
                                  title="Open WhatsApp Direct Chat (Auto-copies tailored pitch)"
                                >
                                  💬 WA Msg
                                </button>
                              )}
                              {Boolean(lead.socials?.facebook || lead.facebookUrl) && (
                                <button
                                  type="button"
                                  onClick={() => openSocialDirectMessage('facebook', lead, setAddedSuccess)}
                                  className="px-2 py-0.5 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-[10px] font-bold cursor-pointer transition-colors"
                                  title="Open Facebook Messenger Direct Inbox"
                                >
                                  💬 FB Msg
                                </button>
                              )}
                              {Boolean(lead.socials?.linkedin || lead.linkedinUrl) && (
                                <button
                                  type="button"
                                  onClick={() => openSocialDirectMessage('linkedin', lead, setAddedSuccess)}
                                  className="px-2 py-0.5 rounded bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 text-[10px] font-bold cursor-pointer transition-colors"
                                  title="Open LinkedIn Messaging"
                                >
                                  💬 LI Msg
                                </button>
                              )}
                            </div>

                            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[10px] text-slate-700">
                              <strong className="text-emerald-700">AI Pitch:</strong> {snippet.sol}
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                            <button
                              type="button"
                              onClick={() => handleRowAutoSend(idx, lead)}
                              className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs"
                            >
                              Auto-Send Pitch
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                const res = await api.leads.create(lead);
                                if (onLeadsAdded) onLeadsAdded();
                                if (onStartOutreach) onStartOutreach(res.lead);
                              }}
                              className="text-xs text-blue-600 hover:underline font-bold"
                            >
                              Open AI Closer &rarr;
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
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-xs space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 mx-auto flex items-center justify-center">
                <Search className="w-6 h-6" />
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h3 className="text-base font-bold text-slate-900">0 Businesses Found for "{query}" in "{location}"</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
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
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 mb-2">Deep Website, Facebook, Instagram &amp; LinkedIn URL Crawler</h2>
            <p className="text-xs text-slate-600 mb-5">
              Enter any company website URL, Facebook Business Page URL, Instagram Profile URL, or LinkedIn URL. Our crawler decodes Cloudflare email protection, crawls up to 6 subpages, detects the tech stack, and automatically generates an Excel (<code className="text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded font-mono font-bold">.xlsx</code>) report.
            </p>

            <form onSubmit={handleSingleScrape} className="flex gap-3">
              <div className="relative flex-1">
                <Globe className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                <input
                  type="text"
                  value={scrapeUrl}
                  onChange={(e) => setScrapeUrl(e.target.value)}
                  placeholder="e.g. https://acmedigital.com, facebook.com/business, instagram.com/brand..."
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-sm focus:outline-none focus:border-blue-500 focus:bg-white"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isScraping}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-xs flex items-center space-x-2 transition-all disabled:opacity-50"
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
              <p className="text-xs text-rose-600 mt-3 font-semibold">{scrapeError}</p>
            )}
          </div>

          {singleExcelFile && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-emerald-800 flex items-center space-x-1.5">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span>Saved Excel Report: {singleExcelFile.fileName}</span>
                </div>
                <p className="text-[11px] text-slate-600 font-mono truncate max-w-lg">{singleExcelFile.filePath}</p>
              </div>
              <button
                type="button"
                onClick={() => triggerExcelDownload(singleExcelFile.downloadUrl, singleExcelFile.fileName)}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex items-center space-x-1.5 shrink-0 shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Excel (.xlsx)</span>
              </button>
            </div>
          )}

          {scrapedData && (
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-5">
              <div className="flex items-start justify-between border-b border-slate-200 pb-4">
                <div>
                  <span className="px-2 py-0.5 text-[10px] uppercase font-bold rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Crawl Successful ({scrapedData.crawledPages?.length || 1} Pages Scanned)
                  </span>
                  <h3 className="text-xl font-bold text-slate-900 mt-1">{scrapedData.title || 'Target Website / Profile'}</h3>
                  <a
                    href={scrapedData.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-blue-600 hover:underline inline-flex items-center space-x-1 mt-1 font-medium"
                  >
                    <span>{scrapedData.url}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <button
                  onClick={handleSaveScrapedLead}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs flex items-center space-x-2 transition-all"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Add Lead &amp; Start AI Outreach</span>
                </button>
              </div>

              {scrapedData.description && (
                <div>
                  <h4 className="text-xs font-semibold text-slate-700 mb-1">Company / Profile Summary:</h4>
                  <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200">
                    {scrapedData.description}
                  </p>
                </div>
              )}

              {/* Website Weak Points Audit */}
              {scrapedData.websiteAudit && (
                <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200 space-y-3">
                  <div className="flex items-center justify-between border-b border-blue-200/60 pb-2">
                    <div className="flex items-center space-x-2">
                      <Globe className="w-4 h-4 text-blue-600" />
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                        Website Audit &amp; Weak Points Report
                      </h4>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-black border ${
                      scrapedData.websiteAudit.score >= 80
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : scrapedData.websiteAudit.score >= 60
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-rose-50 text-rose-700 border-rose-200'
                    }`}>
                      Health Score: {scrapedData.websiteAudit.score}/100 ({scrapedData.websiteAudit.rating})
                    </span>
                  </div>

                  <p className="text-xs text-slate-700">
                    {scrapedData.websiteAudit.summary}
                  </p>

                  {scrapedData.websiteAudit.weakPoints && scrapedData.websiteAudit.weakPoints.length > 0 && (
                    <div className="space-y-2 pt-1">
                      <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                        Detected Vulnerabilities ({scrapedData.websiteAudit.weakPoints.length}):
                      </span>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {scrapedData.websiteAudit.weakPoints.map(wp => (
                          <div key={wp.id} className="p-3 rounded-xl bg-white border border-slate-200 space-y-1 shadow-xs">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-xs text-slate-900 line-clamp-1">{wp.title}</span>
                              <span className={`text-[9px] font-black uppercase px-1.5 py-0.2 rounded ${
                                wp.severity === 'critical'
                                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                  : wp.severity === 'high'
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : 'bg-blue-50 text-blue-700 border border-blue-200'
                              }`}>
                                {wp.severity}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-600 leading-tight">{wp.evidence}</p>
                            <p className="text-[10px] text-emerald-700 font-semibold pt-1">Fix: {wp.solution}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Extracted Emails */}
              <div>
                <h4 className="text-xs font-semibold text-slate-700 mb-2 flex items-center space-x-1.5">
                  <Mail className="w-3.5 h-3.5 text-blue-600" />
                  <span>Discovered Emails ({scrapedData.emails?.length || 0}):</span>
                </h4>
                <div className="flex flex-wrap gap-2">
                  {scrapedData.emails && scrapedData.emails.length > 0 ? (
                    scrapedData.emails.map((em, i) => (
                      <span key={i} className="px-3 py-1 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 font-mono text-xs font-semibold">
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
                  <h4 className="text-xs font-semibold text-slate-700 mb-2 flex items-center space-x-1.5">
                    <Phone className="w-3.5 h-3.5 text-blue-600" />
                    <span>Discovered Phone Numbers ({scrapedData.phones.length}):</span>
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {scrapedData.phones.map((ph, i) => (
                      <span key={i} className="px-3 py-1 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 text-xs font-mono">
                        {ph}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Discovered Socials */}
              {scrapedData.socials && Object.values(scrapedData.socials).some(Boolean) && (
                <div>
                  <h4 className="text-xs font-semibold text-slate-700 mb-2">Discovered Social Profiles:</h4>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(scrapedData.socials).map(([key, val]) => {
                      if (!val || key === 'instagramHandle') return null;
                      return (
                        <a
                          key={key}
                          href={val}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs text-slate-700 uppercase tracking-wider font-semibold border border-slate-200 transition-colors inline-flex items-center space-x-1"
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
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
            <div className="space-y-1">
              <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-[10px] font-bold uppercase tracking-wider">
                <Upload className="w-3 h-3" />
                <span>Manual Scraper File Importer &amp; Instant Outreach</span>
              </div>
              <h2 className="text-lg font-extrabold text-slate-900 flex items-center space-x-2">
                <span>Upload Any Scraped File (.xlsx, .xls, or .csv) to Email Leads</span>
              </h2>
              <p className="text-xs text-slate-600">
                Upload a scraper Excel or CSV file from your computer. We automatically detect <strong className="text-slate-800">Company Name, Email, Phone, Website &amp; Social columns</strong>, hunt missing emails, and let you email them in 1 click.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setTab('vault')}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-200 inline-flex items-center space-x-1.5 self-start shrink-0"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
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
                ? 'border-blue-500 bg-blue-50/50'
                : uploadedFileName
                ? 'border-emerald-400 bg-emerald-50/40'
                : 'border-slate-300 hover:border-blue-400 bg-slate-50/50'
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
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 border border-emerald-300 text-emerald-700 flex items-center justify-center mx-auto">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <div className="text-sm font-extrabold text-slate-900 font-mono">
                  {uploadedFileName}
                </div>
                <div className="text-xs text-emerald-700 font-semibold">
                  {(uploadedFileSize / 1024).toFixed(1)} KB • Ready to parse &amp; email leads
                </div>
                <p className="text-[11px] text-slate-500 pt-1">
                  Click anywhere here or drag another <code className="text-blue-700">.xlsx</code> / <code className="text-blue-700">.csv</code> file to replace
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center mx-auto">
                  <Upload className="w-6 h-6" />
                </div>
                <div className="text-sm font-bold text-slate-900">
                  Click to Browse or Drag &amp; Drop Your Scraper File Here
                </div>
                <p className="text-xs text-slate-500 max-w-lg mx-auto">
                  Supports <code className="text-emerald-700 font-mono">.xlsx</code>, <code className="text-emerald-700 font-mono">.xls</code>, and <code className="text-emerald-700 font-mono">.csv</code> files (including Lead-Finder exports, Apollo/Hunter exports, Google Maps scrapers, or any custom spreadsheet).
                </p>
              </div>
            )}
          </div>

          {/* Options & Email Pitch Strategy */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-1">
            {/* Left column: Enrichment & Pitch Mode */}
            <div className="lg:col-span-5 space-y-4 bg-slate-50/70 p-4 rounded-xl border border-slate-200">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                <span>Email &amp; Enrichment Settings</span>
              </h3>

              <label className="flex items-start space-x-2.5 cursor-pointer select-none p-2.5 rounded-xl bg-white border border-slate-200 hover:border-slate-300 shadow-xs">
                <input
                  type="checkbox"
                  checked={enrichMissingEmails}
                  onChange={(e) => setEnrichMissingEmails(e.target.checked)}
                  className="mt-0.5 rounded bg-white border-slate-300 text-blue-600 focus:ring-0"
                />
                <div>
                  <div className="text-xs font-bold text-slate-900">
                    🔍 Auto-Hunt Missing Emails on Upload
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed mt-0.5">
                    If a row in your file only has a Company Name or Website URL but no email, automatically crawl their site to discover a verified email.
                  </p>
                </div>
              </label>

              <div className="space-y-2">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600">
                  Outreach Email Mode:
                </label>
                <div className="grid grid-cols-1 gap-2">
                  <button
                    type="button"
                    onClick={() => setUploadEmailMode('ai_tailored')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      uploadEmailMode === 'ai_tailored'
                        ? 'bg-blue-50 border-blue-400 text-blue-900 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <div className="text-xs font-bold flex items-center justify-between">
                      <span>🤖 AI Tailored Pitch per Business (Recommended)</span>
                      {uploadEmailMode === 'ai_tailored' && <Check className="w-3.5 h-3.5 text-blue-600" />}
                    </div>
                    <p className="text-[11px] text-slate-600 mt-1">
                      Automatically diagnoses each lead&apos;s industry &amp; website flaws and writes a unique cold pitch for every row.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setUploadEmailMode('custom_template')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      uploadEmailMode === 'custom_template'
                        ? 'bg-blue-50 border-blue-400 text-blue-900 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <div className="text-xs font-bold flex items-center justify-between">
                      <span>✍️ Custom Subject &amp; Message Template</span>
                      {uploadEmailMode === 'custom_template' && <Check className="w-3.5 h-3.5 text-blue-600" />}
                    </div>
                    <p className="text-[11px] text-slate-600 mt-1">
                      Write your own email template using dynamic placeholders like <code className="text-blue-700 bg-blue-50 px-1 py-0.5 rounded">{'{company}'}</code> and <code className="text-blue-700 bg-blue-50 px-1 py-0.5 rounded">{'{firstName}'}</code>.
                    </p>
                  </button>
                </div>
              </div>
            </div>

            {/* Right column: Template Preview or Custom Editor + Action Buttons */}
            <div className="lg:col-span-7 flex flex-col justify-between space-y-4 bg-slate-50/70 p-4 rounded-xl border border-slate-200">
              {uploadEmailMode === 'custom_template' ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Custom Outreach Template
                    </span>
                    <div className="flex flex-wrap items-center gap-1">
                      <span className="text-[10px] text-slate-500 mr-1">Insert tag:</span>
                      {['{company}', '{firstName}', '{website}', '{category}'].map(tag => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => setCustomBody(prev => `${prev} ${tag}`)}
                          className="px-2 py-0.5 rounded bg-white hover:bg-slate-100 text-blue-700 font-mono text-[10px] border border-slate-300"
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">Subject Line</label>
                    <input
                      type="text"
                      value={customSubject}
                      onChange={(e) => setCustomSubject(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">Email Body</label>
                    <textarea
                      rows={5}
                      value={customBody}
                      onChange={(e) => setCustomBody(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-blue-500 font-sans leading-relaxed"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="text-xs font-bold text-blue-700 uppercase tracking-wider">
                    How AI Tailored File Outreach Works
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-1 shadow-xs">
                      <div className="text-xs font-bold text-slate-900">1. Smart Mapping</div>
                      <p className="text-[11px] text-slate-600">
                        Automatically extracts Company, Decision Maker, Emails, Phones, Websites &amp; Socials.
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-1 shadow-xs">
                      <div className="text-xs font-bold text-slate-900">2. Problem &amp; Pitch</div>
                      <p className="text-[11px] text-slate-600">
                        Crafts a personalized cold email for each company&apos;s specific niche and pain point.
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-1 shadow-xs">
                      <div className="text-xs font-bold text-slate-900">3. 1-Click Send</div>
                      <p className="text-[11px] text-slate-600">
                        Load into the table to review, or blast outreach to all leads at once.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {uploadError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                  {uploadError}
                </div>
              )}

              {/* Primary Action Buttons */}
              <div className="flex flex-wrap items-center justify-end gap-3 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  disabled={!uploadedFileBase64 || isProcessingUpload}
                  onClick={() => handleExecuteFileUpload(false)}
                  className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs border border-slate-300 flex items-center space-x-2 transition-all disabled:opacity-50 shadow-xs"
                >
                  {isProcessingUpload && uploadActionType === 'load' ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Parsing &amp; Loading Leads...</span>
                    </>
                  ) : (
                    <>
                      <Database className="w-4 h-4 text-blue-600" />
                      <span>📥 Upload &amp; Load Leads into Table</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  disabled={!uploadedFileBase64 || isProcessingUpload}
                  onClick={() => handleExecuteFileUpload(true)}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-xs flex items-center space-x-2 transition-all disabled:opacity-50"
                >
                  {isProcessingUpload && uploadActionType === 'email_all' ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Uploading &amp; Sending Emails...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>⚡ Upload File &amp; Auto-Email All Leads</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Live Upload & Auto-Email Report */}
          {uploadReport && (
            <div className="p-5 rounded-2xl bg-emerald-50/80 border border-emerald-200 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center space-x-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    <h4 className="text-sm font-extrabold text-slate-900">
                      Processed &ldquo;{uploadReport.fileName}&rdquo; — {uploadReport.totalParsed} Leads Imported ({uploadReport.withEmailCount} with Verified Emails)
                    </h4>
                    {uploadReport.autoSendReport && (
                      <p className="text-xs text-emerald-800 font-semibold mt-0.5">
                        ⚡ Successfully Sent {uploadReport.autoSendReport.count} Outreach Emails!
                        {uploadReport.autoSendReport.errors?.length > 0 && (
                          <span className="text-amber-800 ml-2">
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
                    className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-xs"
                  >
                    View Uploaded Leads in Table &rarr;
                  </button>
                  {uploadReport.leads?.[0] && onStartOutreach && (
                    <button
                      type="button"
                      onClick={() => onStartOutreach(uploadReport.leads[0])}
                      className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-800 font-bold text-xs border border-slate-300"
                    >
                      Open in AI Closer Hub
                    </button>
                  )}
                </div>
              </div>

              {uploadReport.autoSendReport?.sent?.length > 0 && (
                <div className="max-h-60 overflow-y-auto divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
                  {uploadReport.autoSendReport.sent.map((item, idx) => (
                    <div key={idx} className="p-3 flex items-center justify-between gap-3 text-xs">
                      <div className="min-w-0">
                        <span className="font-bold text-slate-900">{item.lead?.company}</span>
                        <span className="text-slate-400 mx-2">&rarr;</span>
                        <span className="font-mono text-blue-700 font-semibold">{item.email?.to}</span>
                        <div className="text-[11px] text-slate-500 truncate mt-0.5">
                          Subject: {item.email?.subject}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onStartOutreach && onStartOutreach(item.lead)}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-blue-700 text-[11px] font-semibold border border-slate-200 shrink-0"
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
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                <span>Saved Excel (.xlsx) Datasets Vault</span>
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">
                Every scrape automatically saves a permanent Excel workbook in <code className="text-emerald-800 font-mono bg-emerald-50 px-1 py-0.5 rounded">{exportsDir || 'd:\\Lead-Finder\\exports'}</code>. You can download any file or <strong className="text-blue-700">load &amp; email its leads in 1 click</strong>.
              </p>
            </div>
            <div className="flex items-center gap-2 self-start">
              <button
                type="button"
                onClick={() => setTab('upload')}
                className="px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold border border-blue-200 inline-flex items-center space-x-1.5"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload External File</span>
              </button>
              <button
                type="button"
                onClick={loadExcelVault}
                className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-200 inline-flex items-center space-x-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingVault ? 'animate-spin' : ''}`} />
                <span>Refresh Vault</span>
              </button>
            </div>
          </div>

          {isLoadingVault ? (
            <div className="py-12 text-center text-slate-500 text-xs flex items-center justify-center space-x-2">
              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
              <span>Loading saved Excel files...</span>
            </div>
          ) : exportedFiles.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <FileSpreadsheet className="w-10 h-10 text-slate-400 mx-auto" />
              <p className="text-sm font-bold text-slate-900">No Excel Exports Yet</p>
              <p className="text-xs text-slate-500">Run a scrape in the Multi-Platform Scraper tab to automatically create your first .xlsx file.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {exportedFiles.map((file, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl bg-slate-50/70 border border-slate-200 hover:border-blue-300 transition-all flex flex-col justify-between gap-3 shadow-xs"
                >
                  <div className="flex items-start space-x-3 min-w-0">
                    <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 shrink-0">
                      <FileSpreadsheet className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 space-y-0.5">
                      <div className="font-mono text-xs font-bold text-slate-900 truncate" title={file.fileName}>
                        {file.fileName}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {(file.sizeBytes / 1024).toFixed(1)} KB • {new Date(file.createdAt).toLocaleString()}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono truncate" title={file.filePath}>
                        {file.filePath}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-slate-200">
                    <button
                      type="button"
                      disabled={Boolean(vaultLoadingFile)}
                      onClick={() => handleVaultFileToEmail(file.fileName, false)}
                      className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-blue-700 font-bold text-[11px] border border-blue-200 flex items-center space-x-1 shadow-xs"
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
                      className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-[11px] flex items-center space-x-1 shadow-xs"
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
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[11px] flex items-center space-x-1 shadow-xs"
                    >
                      <Download className="w-3.5 h-3.5" />
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

