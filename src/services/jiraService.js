const axios = require('axios');

function client() {
  const baseURL = process.env.JIRA_BASE_URL;
  const email = process.env.JIRA_EMAIL;
  const token = process.env.JIRA_API_TOKEN;
  if (!baseURL || !email || !token) return null;
  return axios.create({
    baseURL,
    auth: { username: email, password: token },
    headers: { Accept: 'application/json' }
  });
}

function isConfigured() {
  return Boolean(process.env.JIRA_BASE_URL && process.env.JIRA_EMAIL && process.env.JIRA_API_TOKEN);
}

// Znajduje accountId zalogowanego zleceniobiorcy na podstawie adresu email.
// Wynik warto wkleic do CONTRACTOR_JIRA_ACCOUNT_ID w .env, zeby nie odpytywac za kazdym razem.
async function getAccountId(email) {
  const http = client();
  if (!http) throw new Error('Jira is not configured (see .env.example)');
  const { data } = await http.get('/rest/api/3/user/search', { params: { query: email } });
  if (!data || !data.length) throw new Error(`No Jira user found for ${email}`);
  return data[0].accountId;
}

// Zwraca dane issue (klucz, tytul, nazwa projektu). Uzywane do grupowania worklogow z Tempo
// oraz do budowania rozwijanego zestawienia "co sklada sie na" dany projekt.
const issueDetailsCache = new Map();
async function getIssueDetails(issueIdOrKey) {
  if (issueDetailsCache.has(issueIdOrKey)) return issueDetailsCache.get(issueIdOrKey);
  const http = client();
  if (!http) throw new Error('Jira is not configured (see .env.example)');
  const { data } = await http.get(`/rest/api/3/issue/${issueIdOrKey}`, { params: { fields: 'project,summary' } });
  const details = { key: data.key, summary: data.fields.summary || '', projectName: data.fields.project.name };
  issueDetailsCache.set(issueIdOrKey, details);
  return details;
}

module.exports = { isConfigured, getAccountId, getIssueDetails };
