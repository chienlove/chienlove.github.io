// netlify/functions/cloudflare-api.js
const fetch = require('node-fetch');

class CloudflareWorkerAPI {
  constructor(apiToken, accountId) {
    this.apiToken = apiToken;
    this.accountId = accountId;
    this.baseUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts`;
  }

  async getWorkerCode(workerId) {
    const response = await fetch(`${this.baseUrl}/${workerId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.apiToken}`,
        'Content-Type': 'application/javascript'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to get worker code: ${response.statusText}`);
    }

    return await response.text();
  }
}

module.exports = { CloudflareWorkerAPI };