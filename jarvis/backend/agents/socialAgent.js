import axios from 'axios';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const IG_BASE = 'https://graph.facebook.com/v19.0';

const igToken = () => process.env.INSTAGRAM_ACCESS_TOKEN;
const fbToken = () => process.env.FACEBOOK_ACCESS_TOKEN;
const pageId = () => process.env.FACEBOOK_PAGE_ID;

export const socialAgent = {
  async schedulePost({ caption, imageUrl, platform = 'instagram', scheduledTime }) {
    if (platform === 'instagram') {
      const igUserId = process.env.INSTAGRAM_USER_ID;

      // Create media container
      const containerResp = await axios.post(`${IG_BASE}/${igUserId}/media`, null, {
        params: {
          image_url: imageUrl,
          caption,
          access_token: igToken(),
        },
      });

      const containerId = containerResp.data.id;

      // Publish immediately (scheduling requires IG Content Publishing API approval)
      const publishResp = await axios.post(`${IG_BASE}/${igUserId}/media_publish`, null, {
        params: { creation_id: containerId, access_token: igToken() },
      });

      return { platform, published: true, postId: publishResp.data.id };
    }

    if (platform === 'facebook') {
      const { data } = await axios.post(`${IG_BASE}/${pageId()}/feed`, {
        message: caption,
        access_token: fbToken(),
        ...(scheduledTime && {
          published: false,
          scheduled_publish_time: Math.floor(new Date(scheduledTime).getTime() / 1000),
        }),
      });
      return { platform, postId: data.id };
    }

    throw new Error('Unsupported platform');
  },

  async getAnalytics() {
    const igUserId = process.env.INSTAGRAM_USER_ID;
    const { data } = await axios.get(`${IG_BASE}/${igUserId}/insights`, {
      params: {
        metric: 'impressions,reach,profile_views',
        period: 'day',
        access_token: igToken(),
      },
    });
    return data.data;
  },

  async getDraftReplies() {
    const igUserId = process.env.INSTAGRAM_USER_ID;
    const { data } = await axios.get(`${IG_BASE}/${igUserId}/messages`, {
      params: { access_token: igToken(), limit: 10 },
    });

    const dms = data.data || [];
    const drafts = await Promise.all(dms.slice(0, 5).map(async (dm) => {
      const resp = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 150,
        messages: [{
          role: 'user',
          content: `Draft a brief, friendly reply for BCAutomations Instagram DM: "${dm.message || dm.snippet}"`,
        }],
      });
      return { dmId: dm.id, original: dm.message || dm.snippet, draft: resp.content[0].text };
    }));

    return drafts;
  },
};
