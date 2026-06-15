import axios from 'axios';

const GHL_BASE = 'https://rest.gohighlevel.com/v1';
const headers = () => ({ Authorization: `Bearer ${process.env.GHL_API_KEY}` });

export const clientAgent = {
  async getPipeline() {
    const { data } = await axios.get(`${GHL_BASE}/pipelines`, { headers: headers() });
    const locationId = process.env.GHL_LOCATION_ID;
    const opps = await axios.get(`${GHL_BASE}/pipelines/${data.pipelines?.[0]?.id}/opportunities`, {
      headers: headers(),
      params: { location_id: locationId, limit: 20 },
    });
    return opps.data;
  },

  async triggerOnboarding(contactId) {
    const { data } = await axios.post(
      `${GHL_BASE}/contacts/${contactId}/tags`,
      { tags: ['onboarding-triggered'] },
      { headers: headers() }
    );
    return { success: true, contact: contactId, data };
  },

  async sendFollowUp({ contactId, message, channel = 'sms' }) {
    const endpoint = channel === 'email'
      ? `${GHL_BASE}/conversations/messages/outbound`
      : `${GHL_BASE}/conversations/messages`;

    const { data } = await axios.post(endpoint, {
      type: channel === 'email' ? 'Email' : 'SMS',
      contactId,
      message,
    }, { headers: headers() });
    return data;
  },

  async getContractStatus() {
    const { data } = await axios.get(`${GHL_BASE}/contacts`, {
      headers: headers(),
      params: { location_id: process.env.GHL_LOCATION_ID, tag: 'contract-sent', limit: 20 },
    });
    return data;
  },
};
