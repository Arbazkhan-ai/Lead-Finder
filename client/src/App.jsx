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
  const [activeTab, setActiveTab] = useState('dashboard');
  const [leads, setLeads] = useState([]);
  const [stats, setStats] = useState(null);
  const [settings, setSettings] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Modals & Navigation state
  const [selectedLeadForOutreach, setSelectedLeadForOutreach] = useState(null);
  const [selectedLeadForEdit, setSelectedLeadForEdit] = useState(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setIsLoading(true);
    try {
      const [leadsRes, statsRes, settingsRes] = await Promise.all([
        api.leads.getAll(),
        api.analytics.getStats(),
        api.settings.get()
      ]);
      setLeads(leadsRes.leads || []);
      setStats(statsRes.stats || null);
      setSettings(settingsRes.settings || null);
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
      setLeads(leadsRes.leads || []);
      setStats(statsRes.stats || null);
    } catch (err) {
      console.error('Refresh stats error:', err);
    }
  };

  const handleStartOutreach = (lead) => {
    setSelectedLeadForOutreach(lead);
    setActiveTab('conversations');
  };

  const handleUpdateLead = (leadId, updates) => {
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, ...updates } : l));
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
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
      
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        settings={settings}
        onOpenSettings={() => setIsSettingsOpen(true)}
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
            onOpenSettings={() => setIsSettingsOpen(true)}
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
            onOpenSettings={() => setIsSettingsOpen(true)}
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
        onSettingsUpdated={(newSettings) => setSettings(newSettings)}
      />

    </div>
  );
}
