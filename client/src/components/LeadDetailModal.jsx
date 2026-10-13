import React, { useState } from 'react';
import { X, Globe, Mail, Phone, ExternalLink, Save, Trash2, DollarSign, AlertCircle, Zap, TrendingUp, Loader2, RefreshCw } from 'lucide-react';
import api from '../api/client';

export default function LeadDetailModal({ lead, isOpen, onClose, onLeadUpdated, onDeleteLead }) {
  if (!isOpen || !lead) return null;

  const [formData, setFormData] = useState({
    name: lead.name || '',
    company: lead.company || '',
    email: lead.email || '',
    phone: lead.phone || '',
    website: lead.website || '',
    status: lead.status || 'new',
    dealValue: lead.dealValue || 1200,
    category: lead.category || '',
    notes: lead.notes || '',
    problem: lead.problem || '',
    solution: lead.solution || '',
    howWeHelp: lead.howWeHelp || ''
  });

  const [websiteAudit, setWebsiteAudit] = useState(lead.websiteAudit || null);
  const [isAuditing, setIsAuditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleAuditInModal = async () => {
    if (!formData.website) return;
    setIsAuditing(true);
    try {
      const res = await api.leads.auditWebsite(lead.id, formData.website);
      if (res.audit) {
        setWebsiteAudit(res.audit);
        if (res.audit.topWeakPoint) {
          setFormData(prev => ({
            ...prev,
            problem: prev.problem || res.audit.topWeakPoint.pitchHook,
            solution: prev.solution || res.audit.topWeakPoint.solution,
            howWeHelp: prev.howWeHelp || `Turnkey fix deployed in 5-7 business days (${res.audit.topWeakPoint.roiImpact}).`
          }));
        }
      }
      if (onLeadUpdated && res.lead) {
        onLeadUpdated(res.lead);
      }
    } catch (err) {
      alert('Website audit error: ' + err.message);
    } finally {
      setIsAuditing(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await api.leads.update(lead.id, formData);
      if (onLeadUpdated) onLeadUpdated(res.lead);
      onClose();
    } catch (err) {
      alert('Error updating lead: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70 shrink-0">
          <div className="flex items-center space-x-2">
            <Globe className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-slate-900 text-base">Edit Lead &amp; Strategy Details</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs overflow-y-auto flex-1">
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-700 font-semibold block mb-1">Company Name</label>
              <input
                type="text"
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 focus:border-blue-500 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="text-slate-700 font-semibold block mb-1">Contact Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-700 font-semibold block mb-1">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 focus:border-blue-500 focus:outline-none font-mono"
              />
            </div>
            <div>
              <label className="text-slate-700 font-semibold block mb-1">Phone</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-slate-700 font-semibold">Website URL</label>
              <div className="flex items-center space-x-2">
                {formData.website && (
                  <button
                    type="button"
                    onClick={handleAuditInModal}
                    disabled={isAuditing}
                    className="text-[11px] text-blue-600 hover:text-blue-700 underline font-bold flex items-center space-x-1"
                  >
                    {isAuditing ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>Auditing...</span>
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-3 h-3" />
                        <span>{websiteAudit ? 'Re-scan Weak Points' : 'Audit Website'}</span>
                      </>
                    )}
                  </button>
                )}
                {formData.website && (
                  <a
                    href={formData.website}
                    target="_blank"
                    rel="noreferrer"
                    className="text-slate-500 hover:text-slate-700 hover:underline inline-flex items-center space-x-1 text-[11px]"
                  >
                    <span>Visit</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
            <input
              type="text"
              value={formData.website}
              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 focus:border-blue-500 focus:outline-none"
            />

            {/* Audit findings badge */}
            {websiteAudit && (
              <div className="mt-2 p-2.5 rounded-xl bg-blue-50/70 border border-blue-200 text-[11px] space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 flex items-center space-x-1">
                    <Globe className="w-3 h-3 text-blue-600" />
                    <span>Website Health Audit:</span>
                  </span>
                  <span className={`px-1.5 py-0.5 rounded font-black text-[10px] ${
                    websiteAudit.score >= 80 ? 'text-emerald-700 bg-emerald-100' : websiteAudit.score >= 60 ? 'text-amber-700 bg-amber-100' : 'text-rose-700 bg-rose-100'
                  }`}>
                    {websiteAudit.score}/100 ({websiteAudit.rating})
                  </span>
                </div>
                {websiteAudit.topWeakPoint && (
                  <p className="text-slate-700 text-[10px] leading-tight">
                    <strong className="text-rose-600">Primary Bottleneck:</strong> {websiteAudit.topWeakPoint.title}
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-700 font-semibold block mb-1">Pipeline Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 focus:border-blue-500 focus:outline-none"
              >
                <option value="new">New Lead</option>
                <option value="contacted">Outreach Sent</option>
                <option value="replied">Client Replied</option>
                <option value="negotiating">In Negotiation</option>
                <option value="closed_won">Closed Won</option>
                <option value="closed_lost">Closed Lost</option>
              </select>
            </div>

            <div>
              <label className="text-slate-700 font-semibold block mb-1">Deal Value ($)</label>
              <input
                type="number"
                value={formData.dealValue}
                onChange={(e) => setFormData({ ...formData, dealValue: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-emerald-600 font-bold focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Problem, Solution & Value Strategy Block */}
          <div className="pt-2 border-t border-slate-200 space-y-3">
            <span className="text-xs font-bold text-blue-600 uppercase tracking-wider block">
              Problem &amp; Solution Strategy
            </span>

            <div>
              <label className="text-slate-700 font-semibold flex items-center space-x-1.5 mb-1 text-[11px]">
                <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                <span>Identified Problem / Bottleneck</span>
              </label>
              <textarea
                rows={2}
                value={formData.problem}
                onChange={(e) => setFormData({ ...formData, problem: e.target.value })}
                placeholder="e.g. Missing after-hours inquiries when front desk is closed..."
                className="w-full p-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 focus:border-blue-500 focus:outline-none text-xs"
              />
            </div>

            <div>
              <label className="text-slate-700 font-semibold flex items-center space-x-1.5 mb-1 text-[11px]">
                <Zap className="w-3.5 h-3.5 text-emerald-600" />
                <span>How To Solve Their Problem</span>
              </label>
              <textarea
                rows={2}
                value={formData.solution}
                onChange={(e) => setFormData({ ...formData, solution: e.target.value })}
                placeholder="e.g. Deploy automated 24/7 AI intake concierge on website and SMS..."
                className="w-full p-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 focus:border-blue-500 focus:outline-none text-xs"
              />
            </div>

            <div>
              <label className="text-slate-700 font-semibold flex items-center space-x-1.5 mb-1 text-[11px]">
                <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
                <span>How We Help &amp; ROI Offer</span>
              </label>
              <textarea
                rows={2}
                value={formData.howWeHelp}
                onChange={(e) => setFormData({ ...formData, howWeHelp: e.target.value })}
                placeholder="e.g. Turnkey setup in 5 days with zero staff disruption, 14-day risk-free trial..."
                className="w-full p-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 focus:border-blue-500 focus:outline-none text-xs"
              />
            </div>
          </div>

          <div>
            <label className="text-slate-700 font-semibold block mb-1">Notes &amp; History</label>
            <textarea
              rows={2}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full p-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 focus:border-blue-500 focus:outline-none text-xs"
            />
          </div>

          {/* Footer */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-between shrink-0">
            <button
              type="button"
              onClick={() => {
                if (confirm(`Delete lead ${lead.company}?`)) {
                  onDeleteLead(lead.id);
                  onClose();
                }
              }}
              className="p-2 rounded-xl text-rose-600 hover:bg-rose-50 flex items-center space-x-1 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete</span>
            </button>

            <div className="flex space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-sm flex items-center space-x-1 transition-colors"
              >
                <Save className="w-4 h-4" />
                <span>Save Changes</span>
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
}
