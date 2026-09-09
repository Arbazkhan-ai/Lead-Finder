import React, { useState } from 'react';
import { X, Globe, Mail, Phone, ExternalLink, Save, Trash2, DollarSign } from 'lucide-react';
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
    notes: lead.notes || '',
    category: lead.category || ''
  });

  const [isSaving, setIsSaving] = useState(false);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center space-x-2">
            <Globe className="w-5 h-5 text-cyan-400" />
            <h3 className="font-bold text-white text-base">Edit Lead & Website Details</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-400 font-semibold block mb-1">Company Name</label>
              <input
                type="text"
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:border-cyan-400 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="text-slate-400 font-semibold block mb-1">Contact Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:border-cyan-400 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-400 font-semibold block mb-1">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:border-cyan-400 focus:outline-none font-mono"
              />
            </div>
            <div>
              <label className="text-slate-400 font-semibold block mb-1">Phone</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:border-cyan-400 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-slate-400 font-semibold">Website URL</label>
              {formData.website && (
                <a
                  href={formData.website}
                  target="_blank"
                  rel="noreferrer"
                  className="text-cyan-400 hover:underline inline-flex items-center space-x-1"
                >
                  <span>Visit site</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
            <input
              type="text"
              value={formData.website}
              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:border-cyan-400 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-400 font-semibold block mb-1">Pipeline Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:border-cyan-400 focus:outline-none"
              >
                <option value="new">New Lead</option>
                <option value="contacted">Outreach Sent</option>
                <option value="replied">Client Replied</option>
                <option value="negotiating">In Negotiation</option>
                <option value="closed_won">Closed Won 🎉</option>
                <option value="closed_lost">Closed Lost</option>
              </select>
            </div>

            <div>
              <label className="text-slate-400 font-semibold block mb-1">Deal Value ($)</label>
              <input
                type="number"
                value={formData.dealValue}
                onChange={(e) => setFormData({ ...formData, dealValue: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:border-cyan-400 focus:outline-none font-bold text-emerald-400"
              />
            </div>
          </div>

          <div>
            <label className="text-slate-400 font-semibold block mb-1">Notes & History</label>
            <textarea
              rows={3}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white focus:border-cyan-400 focus:outline-none text-xs"
            />
          </div>

          {/* Footer */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                if (confirm(`Delete lead ${lead.company}?`)) {
                  onDeleteLead(lead.id);
                  onClose();
                }
              }}
              className="p-2 rounded-xl text-rose-400 hover:bg-rose-500/10 flex items-center space-x-1"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete</span>
            </button>

            <div className="flex space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold shadow-md flex items-center space-x-1"
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
