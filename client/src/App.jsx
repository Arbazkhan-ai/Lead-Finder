import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Dashboard from './components/Dashboard';
import LeadFinder from './components/LeadFinder';
import PipelineBoard from './components/PipelineBoard';
import ConversationHub from './components/ConversationHub';
import LeadDetailModal from './components/LeadDetailModal';
import SettingsModal from './components/SettingsModal';
import api from './api/client';

export default function App() {
  const [activeTab, setActiveTabState] = useState(() => {
    try {
      return localStorage.getItem('leads_finder_active_tab') || 'dashboard';
    } catch (_) {
      return 'dashboard';
    }
  });

  const setActiveTab = (tab) => {
    setActiveTabState(tab);
    try {
      localStorage.setItem('leads_finder_active_tab', tab);
    } catch (_) {}
  };

  const [leads, setLeads] = useState([]);
  const [stats, setStats] = useState(null);
  const [settings, setSettingsState] = useState(() => {
    try {
      const saved = localStorage.getItem('leads_finder_settings');
      return saved ? JSON.parse(saved) : null;
    } catch (_) {
      return null;
    }
  });

  const setSettings = (newSettings) => {
    setSettingsState(newSettings);
    try {
      localStorage.setItem('leads_finder_settings', JSON.stringify(newSettings));
    } catch (_) {}
  };

  const [isLoading, setIsLoading] = useState(true);

  // Modals & Navigation state
  const [selectedLeadForOutreach, setSelectedLeadForOutreach] = useState(null);
  const [selectedLeadForEdit, setSelectedLeadForEdit] = useState(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState('ai');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const handleOpenSettings = (tab = 'ai') => {
    setSettingsInitialTab(tab);
    setIsSettingsOpen(true);
  };


  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setIsLoading(true);
    try {
      const [leadsRes, statsRes, settingsRes] = await Promise.all([
        api.leads.getAll().catch(() => ({ leads: [] })),
        api.analytics.getStats().catch(() => ({ stats: null })),
        api.settings.get().catch(() => ({ settings: null }))
      ]);

      let serverSettings = settingsRes?.settings || null;
      let localSettings = null;
      try {
        const raw = localStorage.getItem('leads_finder_settings');
        if (raw) localSettings = JSON.parse(raw);
      } catch (_) {}

      // If local settings exist, merge with server settings so configuration is NEVER lost across refreshes
      if (localSettings) {
        const mergedSettings = {
          ...serverSettings,
          ...localSettings,
          smtp: { ...(serverSettings?.smtp || {}), ...(localSettings?.smtp || {}) },
          ai: { ...(serverSettings?.ai || {}), ...(localSettings?.ai || {}) }
        };
        serverSettings = mergedSettings;
        setSettings(mergedSettings);

        // If server was reset (e.g. serverless cold start), sync user's saved settings to the server
        const serverNeedsSync = !settingsRes?.settings?.smtp?.pass && localSettings?.smtp?.pass;
        if (serverNeedsSync) {
          api.settings.update(mergedSettings).catch(() => {});
        }
      } else if (serverSettings) {
        setSettings(serverSettings);
      }

      const fetchedLeads = leadsRes?.leads || [];

      // Check for locally cached leads from previous sessions/deployments
      let cachedLeads = [];
      try {
        const rawLeads = localStorage.getItem('leads_finder_leads_cache');
        if (rawLeads) cachedLeads = JSON.parse(rawLeads);
      } catch (_) {}

      // Identify any leads that exist in the browser cache but are missing from the server
      const serverLeadIds = new Set(fetchedLeads.map(l => l.id));
      const missingOnServer = Array.isArray(cachedLeads) ? cachedLeads.filter(cl => cl && cl.id && !serverLeadIds.has(cl.id)) : [];

      let combinedLeads = [...fetchedLeads];
      if (missingOnServer.length > 0) {
        console.log(`Re-hydrating ${missingOnServer.length} leads to new deployment...`);
        combinedLeads = [...missingOnServer, ...fetchedLeads];
        api.leads.bulkAdd(missingOnServer).then(() => {
          handleRefreshStats();
        }).catch(() => {});
      }

      setLeads(combinedLeads);
      setStats(statsRes?.stats || null);
      try {
        localStorage.setItem('leads_finder_leads_cache', JSON.stringify(combinedLeads));
      } catch (_) {}

      // Re-select previously selected lead from localStorage if applicable
      try {
        const savedLeadId = localStorage.getItem('leads_finder_selected_lead_id');
        if (savedLeadId && combinedLeads.length > 0) {
          const matched = combinedLeads.find(l => l.id === savedLeadId);
          if (matched) setSelectedLeadForOutreach(matched);
        }
      } catch (_) {}

    } catch (err) {
      console.error('Failed to load platform data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefreshStats = async () => {
    try {
      const [leadsRes, statsRes] = await Promise.all([
        api.leads.getAll(),
        api.analytics.getStats()
      ]);
      const updatedList = leadsRes?.leads || [];
      setLeads(updatedList);
      try {
        localStorage.setItem('leads_finder_leads_cache', JSON.stringify(updatedList));
      } catch (_) {}
      setStats(statsRes.stats || null);
    } catch (err) {
      console.error('Refresh stats error:', err);
    }
  };

  const handleStartOutreach = (lead) => {
    setSelectedLeadForOutreach(lead);
    try {
      if (lead?.id) localStorage.setItem('leads_finder_selected_lead_id', lead.id);
    } catch (_) {}
    setActiveTab('conversations');
  };

  const handleUpdateLead = (leadId, updates) => {
    setLeads(prev => {
      const updated = prev.map(l => l.id === leadId ? { ...l, ...updates } : l);
      try {
        localStorage.setItem('leads_finder_leads_cache', JSON.stringify(updated));
      } catch (_) {}
      return updated;
    });
    handleRefreshStats();
  };

  const handleDeleteLead = async (leadId) => {
    try {
      await api.leads.delete(leadId);
      setLeads(prev => prev.filter(l => l.id !== leadId));
      handleRefreshStats();
    } catch (err) {
      alert('Delete failed: ' + err.message);
    }
  };

  const handleAddNewManualLead = async () => {
    const company = prompt('Enter Prospective Company Name:');
    if (!company) return;
    const website = prompt('Enter Company Website (e.g. https://example.com):') || '';
    const email = prompt('Enter Contact Email (or leave empty to scrape later):') || '';

    try {
      const res = await api.leads.create({
        company,
        website,
        email,
        name: 'Decision Maker',
        source: 'Manual Entry'
      });
      setLeads(prev => [res.lead, ...prev]);
      handleRefreshStats();
      handleStartOutreach(res.lead);
    } catch (err) {
      alert('Error creating lead: ' + err.message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/70 text-slate-900 flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
      
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        settings={settings}
        onOpenSettings={(tab) => handleOpenSettings(tab || 'ai')}
        stats={stats}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {activeTab === 'dashboard' && (
          <Dashboard
            stats={stats}
            onNavigate={(tab) => setActiveTab(tab)}
            onOpenLeadModal={(lead) => {
              setSelectedLeadForEdit(lead);
              setIsEditModalOpen(true);
            }}
          />
        )}

        {activeTab === 'finder' && (
          <LeadFinder
            onLeadsAdded={handleRefreshStats}
            onStartOutreach={handleStartOutreach}
            settings={settings}
            onOpenSettings={(tab) => handleOpenSettings(tab || 'maps')}
          />
        )}

        {activeTab === 'pipeline' && (
          <PipelineBoard
            leads={leads}
            onUpdateLead={handleUpdateLead}
            onDeleteLead={handleDeleteLead}
            onOpenConversation={handleStartOutreach}
            onAddLead={handleAddNewManualLead}
          />
        )}

        {activeTab === 'conversations' && (
          <ConversationHub
            initialLead={selectedLeadForOutreach}
            leads={leads}
            onLeadUpdated={(updated) => {
              handleUpdateLead(updated.id, updated);
            }}
            settings={settings}
            onSettingsUpdated={(newSettings) => setSettings(newSettings)}
            onOpenSettings={(tab) => handleOpenSettings(tab || 'smtp')}
          />
        )}
      </main>

      {/* Lead Detail / Edit Modal */}
      <LeadDetailModal
        lead={selectedLeadForEdit}
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedLeadForEdit(null);
        }}
        onLeadUpdated={(updated) => {
          handleUpdateLead(updated.id, updated);
        }}
        onDeleteLead={handleDeleteLead}
      />

      {/* Platform Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        initialTab={settingsInitialTab}
        onSettingsUpdated={(newSettings) => setSettings(newSettings)}
      />

    </div>
  );
}
