# Softcraft — protokoły i rozliczenia

Lokalna aplikacja webowa: pobiera worklogi z Jira/Tempo za wybrany miesiąc, generuje protokół zamówienia
i protokół zdawczo-odbiorczy (PDF, wzory Softcraft), i przygotowuje dane do eksportu do Taxxxo.

To jest działający szkielet (MVP): backend w Node/Express, prosty frontend w `public/index.html`,
generowanie PDF przez `pdf-lib`. Bez skonfigurowanych kluczy API aplikacja działa w **trybie demo**
(losowe, ale spójne dane godzinowe) — dzięki temu można od razu uruchomić i kliknąć cały flow.

## Szybki start

```bash
npm install
cp .env.example .env
npm run dev
```

Otwórz http://localhost:3000

## Podłączenie prawdziwych danych

1. **Jira** — w `.env` ustaw `JIRA_BASE_URL`, `JIRA_EMAIL` i `JIRA_API_TOKEN`
   (token: https://id.atlassian.com/manage-profile/security/api-tokens).
2. **Tempo** — ustaw `TEMPO_API_TOKEN` (Tempo → Settings → API Integration, w Jira Cloud).
3. Opcjonalnie ustaw `CONTRACTOR_JIRA_ACCOUNT_ID`, żeby nie odpytywać Jiry o accountId przy każdym
   requeście — znajdziesz go w URL swojego profilu w Jirze albo przez `jiraService.getAccountId(email)`.
4. Zrestartuj `npm run dev` — badge'y w UI pokażą "połączona" zamiast "tryb demo",
   a `/api/worklogs` zacznie pytać prawdziwe API Tempo.

## Struktura

```
server.js                  Express: routing, statyczny frontend
src/services/tempoService.js   Pobieranie i grupowanie worklogów (Tempo API v4 + fallback demo)
src/services/jiraService.js    Odpytywanie Jira REST API (accountId, nazwa projektu dla issue)
src/services/pdfService.js     Generowanie PDF (pdf-lib) — protokół zamówienia i zdawczo-odbiorczy
src/services/slownie.js        Konwersja kwoty PLN na zapis słowny
src/assets/logo.png            Logo Softcraft użyte w PDF-ach
public/index.html              Frontend (one-pager)
```

## Co dalej (kolejne kroki rozwoju)

- Eksport CSV/XLSX do Taxxxo (obecnie tylko link do platformy — patrz `.env` `TAXXXO_URL`).
- Asystent AI (zapytania naturalnym językiem o dane rozliczeniowe, wykrywanie anomalii) —
  podłączyć `ANTHROPIC_API_KEY` i dodać endpoint `/api/assistant`.
- Administracja: więcej zleceniobiorców, umowy, stawki (obecnie jeden kontrahent z `.env`).
- Wykres 6 miesięcy — obecnie dane statyczne w `public/index.html`, do podpięcia pod `/api/worklogs`
  w pętli po miesiącach.
- Deploy: dla użytku lokalnego wystarczy `npm run dev`. Do stałego uruchomienia rozważ `pm2` albo
  prosty systemd service / Docker.

## Praca w Claude Code

Ten katalog ma plik `CLAUDE.md` z kontekstem projektu — Claude Code odczyta go automatycznie przy starcie.
Żeby kontynuować rozwój:

```bash
cd softcraft-protokoly
claude
```

i opisz, co chcesz dodać (np. "podłącz prawdziwe API Tempo i przetestuj na moim koncie").
