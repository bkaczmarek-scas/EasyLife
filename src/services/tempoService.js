const axios = require('axios');
const jiraService = require('./jiraService');

function pad2(n) {
  return String(n).padStart(2, '0');
}

// Reguly laczenia projektow w jedna grupe na liscie worklogow (rozwijana lista pokazuje
// oryginalne issue z kazdego podprojektu, wiec sam prefiks klucza issue juz mowi skad jest).
const PROJECT_GROUPS = [
  { label: 'VSP', matches: name => name.startsWith('VSP') },
  { label: 'Zaven', matches: name => name === 'Zaven Consulting' || name === 'Taskye' }
];

function resolveGroupName(projectName) {
  const group = PROJECT_GROUPS.find(g => g.matches(projectName));
  return group ? group.label : projectName;
}

// --- Tryb demo, gdy Tempo/Jira nie sa jeszcze podpiete (patrz .env.example) ---
const KNOWN_DEMO_TOTALS = { 2026: { 3: 138, 4: 152, 5: 145, 6: 160, 7: 134, 8: 150 } };

function demoTotalHours(month, year) {
  // Never fabricate hours for the current (in-progress) or a future month - nobody has
  // worklogs for a period that hasn't happened yet, real API or demo alike.
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1;
  if (year > currentYear || (year === currentYear && month >= currentMonth)) return 0;

  if (KNOWN_DEMO_TOTALS[year] && KNOWN_DEMO_TOTALS[year][month] != null) {
    return KNOWN_DEMO_TOTALS[year][month];
  }
  const seed = month * 31 + year * 7;
  return 120 + (seed % 41);
}

function demoWorklogs(month, year) {
  const total = demoTotalHours(month, year);
  const alfa = Math.round(total * 0.577 * 10) / 10;
  const beta = Math.round((total - alfa) * 10) / 10;
  const alfaA = Math.round(alfa * 0.6 * 10) / 10;
  const alfaB = Math.round((alfa - alfaA) * 10) / 10;
  return {
    source: 'demo',
    projects: [
      {
        name: 'Projekt Alfa', hours: alfa,
        items: [
          { key: 'ALFA-101', summary: 'Feature work', hours: alfaA },
          { key: 'ALFA-102', summary: 'Bug fixes', hours: alfaB }
        ]
      },
      {
        name: 'Projekt Beta', hours: beta,
        items: [{ key: 'BETA-201', summary: 'Integration work', hours: beta }]
      }
    ],
    totalHours: total
  };
}

// --- Prawdziwe polaczenie z Tempo Cloud API v4 ---
// Docs: https://apidocs.tempo.io/
async function fetchWorklogsFromTempo(month, year) {
  const token = process.env.TEMPO_API_TOKEN;
  const accountId = process.env.CONTRACTOR_JIRA_ACCOUNT_ID || await jiraService.getAccountId(process.env.JIRA_EMAIL);

  const from = `${year}-${pad2(month)}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const to = `${year}-${pad2(month)}-${pad2(lastDay)}`;

  const http = axios.create({
    baseURL: 'https://api.tempo.io/4',
    headers: { Authorization: `Bearer ${token}` }
  });

  let results = [];
  let url = `/worklogs/user/${accountId}`;
  let params = { from, to, limit: 1000 };

  // Tempo paginuje przez metadata.next (pelny URL) - obslugujemy oba przypadki.
  for (;;) {
    const { data } = await http.get(url, { params });
    results = results.concat(data.results || []);
    if (data.metadata && data.metadata.next) {
      const next = new URL(data.metadata.next);
      url = next.pathname.replace('/4', '');
      params = Object.fromEntries(next.searchParams.entries());
    } else {
      break;
    }
  }

  // Grupuje worklogi wg projektu (z laczeniem podprojektow VSP-*), a wewnatrz kazdej grupy
  // wg pojedynczego issue - to zasila rozwijane zestawienie "co sklada sie na" dany wiersz.
  const byProject = new Map();
  for (const wl of results) {
    const issueId = wl.issue && wl.issue.id;
    const hours = (wl.timeSpentSeconds || 0) / 3600;

    let projectName = 'Unassigned';
    let issueKey = 'Unassigned';
    let issueSummary = '';
    if (issueId) {
      const details = await jiraService.getIssueDetails(issueId);
      projectName = resolveGroupName(details.projectName);
      issueKey = details.key;
      issueSummary = details.summary;
    }

    if (!byProject.has(projectName)) byProject.set(projectName, { hours: 0, items: new Map() });
    const group = byProject.get(projectName);
    group.hours += hours;
    if (!group.items.has(issueKey)) group.items.set(issueKey, { key: issueKey, summary: issueSummary, hours: 0 });
    group.items.get(issueKey).hours += hours;
  }

  const projects = Array.from(byProject.entries()).map(([name, group]) => ({
    name,
    hours: Math.round(group.hours * 10) / 10,
    items: Array.from(group.items.values())
      .map(it => ({ key: it.key, summary: it.summary, hours: Math.round(it.hours * 10) / 10 }))
      .sort((a, b) => b.hours - a.hours)
  }));
  const totalHours = Math.round(projects.reduce((sum, p) => sum + p.hours, 0) * 10) / 10;

  return { source: 'tempo', projects, totalHours };
}

async function getWorklogsGrouped(month, year) {
  const configured = Boolean(process.env.TEMPO_API_TOKEN) && jiraService.isConfigured();
  if (!configured) {
    return demoWorklogs(month, year);
  }
  return fetchWorklogsFromTempo(month, year);
}

module.exports = { getWorklogsGrouped, demoWorklogs };
