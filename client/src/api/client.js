const API_BASE = '/api';

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  };

  if (config.body && typeof config.body === 'object') {
    config.body = JSON.stringify(config.body);
  }

  const response = await fetch(url, config);
  const data = await response.json();

  if (!response.ok || data.success === false) {
    throw new Error(data.error || `HTTP error ${response.status}`);
  }

  return data;
}

export const api = {
  leads: {
    getAll: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return request(`/leads${query ? `?${query}` : ''}`);
    },
    getById: (id) => request(`/leads/${id}`),
    create: (leadData) => request('/leads', { method: 'POST', body: leadData }),
    update: (id, data) => request(`/leads/${id}`, { method: 'PUT', body: data }),
    delete: (id) => request(`/leads/${id}`, { method: 'DELETE' }),
    search: (searchParams) => request('/leads/search', { method: 'POST', body: searchParams }),
    scrapeDomain: (url) => request('/leads/scrape-domain', { method: 'POST', body: { url } }),
    bulkAdd: (leads) => request('/leads/bulk-add', { method: 'POST', body: { leads } }),
    findEmail: (leadId, data = {}) => request('/leads/find-email', { method: 'POST', body: { leadId, ...data } })
  },
  outreach: {
    getThread: (leadId) => request(`/outreach/thread/${leadId}`),
    diagnoseLead: (leadId, leadData = null) => request('/outreach/diagnose-lead', { method: 'POST', body: { leadId, leadData } }),
    sendEmail: (data) => request('/outreach/send', { method: 'POST', body: data }),
    generatePitch: (leadId, options = {}) => request('/outreach/generate-pitch', { method: 'POST', body: { leadId, ...options } }),
    generateReply: (leadId, clientReplyText, problemSolutionAngle = null) => request('/outreach/generate-reply', { method: 'POST', body: { leadId, clientReplyText, problemSolutionAngle } }),
    simulateReply: (leadId, replyText, subject) => request('/outreach/simulate-reply', { method: 'POST', body: { leadId, replyText, subject } }),
    autoSend: (leadId, toEmail) => request('/outreach/auto-send', { method: 'POST', body: { leadId, toEmail } }),
    autoReply: (leadId, clientReplyText) => request('/outreach/auto-reply', { method: 'POST', body: { leadId, clientReplyText } }),
    bulkAutoSend: (leads) => request('/outreach/bulk-auto-send', { method: 'POST', body: { leads } })
  },
  settings: {
    get: () => request('/settings'),
    update: (data) => request('/settings', { method: 'PUT', body: data })
  },
  analytics: {
    getStats: () => request('/analytics')
  }
};

export default api;
