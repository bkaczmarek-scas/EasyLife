# Softcraft — protokoły i rozliczenia

## Kontekst

Aplikacja dla Softcraft do obsługi rozliczeń zleceniobiorców (obecnie: Bartosz Kaczmarek).
Trzy główne przepływy:

1. **Jira/Tempo** — pobranie worklogów za wybrany miesiąc, zgrupowanie godzin per projekt.
2. **Dokumenty** — wygenerowanie dwóch dokumentów PDF na bazie prawdziwych wzorów Softcraft:
   protokół zamówienia i protokół zdawczo-odbiorczy, z automatyczną kalkulacją kwoty i zapisem
   słownym po polsku.
3. **iFirma** — po zatwierdzeniu dokumentów, dane mają trafić do zewnętrznego systemu
   księgowo-fakturowego iFirma (integracja jeszcze nie zaimplementowana, patrz
   `src/services/ifirmaService.js` i `.claude/skills/ifirma-integration/SKILL.md`). Integracja
   z Taxxxo została świadomie porzucona — zbyt kosztowna integracja API — cała logika/UI Taxxxo
   usunięte.

Rozmowy z właścicielem projektu (Bartek) prowadzone są po polsku — trzymaj się polskiego w UI,
treściach dokumentów i commit messages jeśli o nie poprosi.

**Na tym repo równolegle działa też inny agent (ChatGPT Codex)**, pushujący bezpośrednio na
`main` niezależnie od tej sesji — nie ma między nimi żadnej integracji/komunikacji w czasie
rzeczywistym (to osobne produkty, brak wspólnego API). Zawsze `git fetch` + sprawdź
`git log origin/main` przed pushem, żeby nie nadpisać czyichś zmian; nigdy force-push.

## Stan obecny

- Backend: Express (`server.js`) + serwisy w `src/services/`.
- Jira/Tempo są podłączone do prawdziwego API — `.env` ma skonfigurowane `JIRA_BASE_URL`,
  `JIRA_EMAIL`, `JIRA_API_TOKEN`, `TEMPO_API_TOKEN`, więc `tempoService.getWorklogsGrouped`
  odpytuje live Tempo/Jira, a nie dane demo. Tryb demo (`tempoService.demoWorklogs`) włącza się
  automatycznie tylko gdy tych zmiennych brakuje — nadal przydatny do szybkiego testowania UI bez
  konfiguracji. Worklogi bez przypisanego issue są grupowane jako `Unassigned`.
- PDF-y generowane są w locie (`pdfService.js`, biblioteka `pdf-lib`), odtwarzają layout prawdziwych
  wzorów Softcraft (patrz logo w `src/assets/logo.png`). Polskie znaki diakrytyczne (ą, ć, ę...) są
  poprawnie renderowane — embedowany jest font DejaVu Sans przez `pdfDoc.registerFontkit` +
  `pdfDoc.embedFont` zamiast `StandardFonts.Helvetica`.
- Każde wygenerowane parę protokołów jest też zapisywana przez `protocolsHistoryService.js` —
  metadane w `data/protocols.json`, same pliki PDF w `data/protocols/`. Klucz wpisu to `{rok}-{mc}`
  (jeden komplet na okres rozliczeniowy). Jeśli wpis dla danego okresu już istnieje, `POST
  /api/protocols/generate` domyślnie odpowiada `409 ALREADY_GENERATED` zamiast cicho nadpisywać —
  frontend pokazuje wtedy dialog z opcją „Regenerate anyway” (`force: true` w body), co nadpisuje
  i resetuje status eksportu. Zakładka „History” w `index.html` pozwala pobrać ponownie zapisane
  pliki bez przeliczania ich na bieżąco ze stawek, a także ręcznie wgrać dowolny PDF (np. fakturę
  zewnętrzną) dla danego okresu przez `POST /api/protocols/history/upload` — trafia do
  `entry.manualFiles[]`, niezależnie od `entry.files` (wygenerowane protokoły); regeneracja
  protokołów nie kasuje wgranych ręcznie plików.
- Frontend to pojedynczy plik `public/index.html` (vanilla JS, bez frameworka) — zbudowany jako
  wizard (Period → Worklogs → Protocols & Export) z górną nawigacją zakładek (Invoicing, Hours &
  vacations, Rates, Income, History) zamiast sidebara; design w stylu Minimalism & Swiss Style.
  Hours & vacations pokazuje wykres 12 miesięcy zasilany prawdziwymi danymi z `/api/worklogs`
  (nie statyczny placeholder).
- Tryb ciemny jest gotowy: token CSS (`--surface-*`, `--text-*`, `--accent*`, `--bg-*`) mają
  wartości dla jasnego i ciemnego motywu w `public/index.html` i `public/login.html`. Domyślnie
  idzie za `prefers-color-scheme`; przełącznik w profile dropdown (`themeToggleBtn`) zapisuje
  wybór w `localStorage['theme']`, co czyta też `login.html` (żeby nie mrugnęło złym motywem).
  Wykresy Chart.js nie czytają zmiennych CSS same z siebie — kolory dociągane są w JS przez
  `themeColors()` przy tworzeniu wykresu i odświeżane przez `refreshChartTheme()` po przełączeniu.
- Zakładka Income ma eksport rocznego podsumowania do CSV (`exportYearlySummaryBtn`) — godziny,
  stawka, brutto/netto, ZUS/podatek/księgowość i premie per miesiąc plus wiersz „Razem” i lista
  premii. Budowany w całości po stronie klienta z danych już pobieranych przez
  `calculateYearlyIncome`/`loadBonuses` (żadnej nowej logiki na backendzie); plik `;`-separowany
  z przecinkiem dziesiętnym i BOM, pod polski Excel dla księgowej.

## Konwencje

- Kwoty w PLN jako liczby całkowite (bez groszy) — stawka godzinowa i kwota netto liczone w
  `pdfService.buildPeriodData`.
- Numer zamówienia: `SC/{rok}/{miesiąc 2-cyfrowy}/01/BK`.
- Wszystkie daty w formacie zgodnym z oryginalnymi wzorami PDF (np. `8/31/2026` bez zera wiodącego
  w miesiącu dla dat granicznych, `2026-08-01` dla daty zamówienia).

## Bezpieczeństwo / wdrożenie demo

- `DEMO_MODE=true` w env wymusza placeholder danych kontrahenta (`Jan Kowalski`, inicjały `XX`
  w numerze zamówienia, generyczna data umowy) i kasuje `JIRA_API_TOKEN`/`TEMPO_API_TOKEN`/
  `CONTRACTOR_JIRA_ACCOUNT_ID` z `process.env` przy starcie (`server.js`) — zabezpieczenie na
  wypadek pomyłkowego ustawienia prawdziwych sekretów na hostingu do publicznego demo. W trybie
  demo `req.session.email` (i wyliczana z niego nazwa w sidebarze) jest też na sztywno ustawiane
  na `demo@example.com`, niezależnie od realnie skonfigurowanego `AUTH_EMAIL` — więc nawet
  pomyłkowe użycie prawdziwego loginu do demo-wdrożenia nie ujawnia niczyjej tożsamości.
  Ustawiać wyłącznie na środowisku demo, nigdy lokalnie/prod.
- Dane demo w seedach (`ratesService.js`, `bonusesService.js` itd.) muszą być w pełni fikcyjne —
  nie kopiować realnych stawek/kwot/premii jako "przykładowych" wartości.
- `tempoService.demoTotalHours` nigdy nie zwraca godzin dla bieżącego (niedokończonego) ani
  przyszłego miesiąca — spójne z resztą apki, która liczy tylko w pełni zakończone miesiące.
- `NODE_ENV=production` włącza `secure: true` na cieście sesji (wymaga `app.set('trust proxy', 1)`,
  już ustawione — potrzebne za reverse proxy typu Railway/Render/Fly, które terminują TLS).
- Nigdy nie hardkodować prawdziwych danych osobowych (imię, adres, NIP) jako fallback w kodzie —
  `pdfService.buildPeriodData` i sidebar (`profileName`/`profileTriggerName`, wyliczane z e-maila
  sesji) celowo tego unikają, bo pliki źródłowe (w przeciwieństwie do `.env`) trafiają do gita.
- `helmet()` ma ręcznie skonfigurowane CSP (allowlist na cdnjs.cloudflare.com + Google Fonts) —
  domyślna polityka blokowałaby inline `<script>`/`style=""`, na których cała ta apka się opiera.
- Rate-limit (20/15min) na `/api/login` przez `express-rate-limit`.

Wdrożenie demo na Railway: `engines.node` w `package.json` (Nixpacks), `PORT` już czytany z env
(`server.js`). Zmienne do ustawienia w panelu Railway (wartości — patrz historia czatu, nigdy nie
wrzucać ich do repo): `NODE_ENV=production`, `DEMO_MODE=true`, świeży `SESSION_SECRET`, osobne
`AUTH_EMAIL`/`AUTH_PASSWORD_HASH` na konto demo. `JIRA_*`/`TEMPO_API_TOKEN` celowo nieustawione —
apka sama wchodzi w tryb demo worklogów (`tempoService.demoWorklogs`).

## Priorytety dalszego rozwoju (w kolejności)

1. Integracja z iFirma (eksport faktur) — `src/services/ifirmaService.js` to na razie szkielet
   (`createInvoice` rzuca "not implemented"), endpoint `POST /api/export/ifirma` zwraca 501 dopóki
   `IFIRMA_API_KEY` nie jest ustawiony. Przed prawdziwą implementacją: potwierdzić dokładny
   mechanizm autoryzacji w dokumentacji (https://api.ifirma.pl/) i zmapować
   `pdfService.buildPeriodData` na strukturę faktury — patrz skill po pełny kontekst.
2. Panel administracji (wielu zleceniobiorców, umowy, stawki) — obecnie dane kontrahenta na sztywno
   w `.env`.
3. Asystent AI (zapytania NL o dane rozliczeniowe, wykrywanie anomalii) — wymaga `ANTHROPIC_API_KEY`.

Zrobione: podłączenie prawdziwego API Tempo/Jira (działa live), historia/archiwum protokołów
(`protocolsHistoryService.js` + zakładka History), wykres 12 miesięcy z prawdziwymi danymi,
roczne podsumowanie CSV w zakładce Income, tryb ciemny (CSS tokeny + przełącznik + wykresy).

## Jak testować

```bash
npm install
cp .env.example .env
npm run dev
```

Otwórz http://localhost:3000, kliknij "Pobierz dane z Jira / Tempo" (zadziała w trybie demo bez
żadnej konfiguracji), potem "Generuj protokoły" i sprawdź podgląd PDF.
