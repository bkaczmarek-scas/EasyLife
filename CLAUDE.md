# Softcraft — protokoły i rozliczenia

## Kontekst

Aplikacja dla Softcraft do obsługi rozliczeń zleceniobiorców (obecnie: Bartosz Kaczmarek).
Trzy główne przepływy:

1. **Jira/Tempo** — pobranie worklogów za wybrany miesiąc, zgrupowanie godzin per projekt.
2. **Dokumenty** — wygenerowanie dwóch dokumentów PDF na bazie prawdziwych wzorów Softcraft:
   protokół zamówienia i protokół zdawczo-odbiorczy, z automatyczną kalkulacją kwoty i zapisem
   słownym po polsku.
3. **Taxxxo** — po zatwierdzeniu dokumentów, dane są gotowe do eksportu do zewnętrznego systemu
   księgowego Taxxxo (na razie tylko link, eksport CSV/XLSX jeszcze nie zaimplementowany).

Rozmowy z właścicielem projektu (Bartek) prowadzone są po polsku — trzymaj się polskiego w UI,
treściach dokumentów i commit messages jeśli o nie poprosi.

## Stan obecny

- Backend: Express (`server.js`) + trzy serwisy w `src/services/`.
- Bez kluczy API w `.env` aplikacja działa w trybie demo (deterministyczne dane godzinowe per
  miesiąc/rok, patrz `tempoService.demoWorklogs`) — to pozwala testować cały flow UI od razu.
- PDF-y generowane są w locie (`pdfService.js`, biblioteka `pdf-lib`), odtwarzają layout prawdziwych
  wzorów Softcraft (patrz logo w `src/assets/logo.png`). Uwaga: polskie znaki diakrytyczne (ą, ć, ę...)
  są usuwane przy renderowaniu tekstu w PDF, bo wbudowane fonty Helvetica (WinAnsi) ich nie obsługują.
  Żeby to naprawić: osadzić font TTF z pełnym wsparciem polskich znaków (np. DejaVu Sans) przez
  `pdfDoc.embedFont` z custom fontkit zamiast `StandardFonts.Helvetica`.
- Frontend to pojedynczy plik `public/index.html` (vanilla JS, bez frameworka) — celowo prosty,
  łatwy do rozbudowy.

## Konwencje

- Kwoty w PLN jako liczby całkowite (bez groszy) — stawka godzinowa i kwota netto liczone w
  `pdfService.buildPeriodData`.
- Numer zamówienia: `SC/{rok}/{miesiąc 2-cyfrowy}/01/BK`.
- Wszystkie daty w formacie zgodnym z oryginalnymi wzorami PDF (np. `8/31/2026` bez zera wiodącego
  w miesiącu dla dat granicznych, `2026-08-01` dla daty zamówienia).

## Priorytety dalszego rozwoju (w kolejności)

1. Podłączyć prawdziwe API Tempo/Jira i przetestować z realnym kontem (`tempoService.js`,
   `jiraService.js` już mają strukturę pod to — brakuje tylko testów na żywym API i obsługi
   krawędziowych przypadków, np. worklogi bez przypisanego projektu).
2. Naprawić polskie znaki w PDF (embed fontu DejaVu Sans zamiast stripowania diakrytyków).
3. Eksport CSV/XLSX do Taxxxo — nowy endpoint `/api/export/taxxxo`.
4. Wykres 6 miesięcy zasilony prawdziwymi danymi (obecnie statyczny w `index.html`).
5. Panel administracji (wielu zleceniobiorców, umowy, stawki) — obecnie dane kontrahenta na sztywno
   w `.env`.
6. Asystent AI (zapytania NL o dane rozliczeniowe, wykrywanie anomalii) — wymaga `ANTHROPIC_API_KEY`.

## Jak testować

```bash
npm install
cp .env.example .env
npm run dev
```

Otwórz http://localhost:3000, kliknij "Pobierz dane z Jira / Tempo" (zadziała w trybie demo bez
żadnej konfiguracji), potem "Generuj protokoły" i sprawdź podgląd PDF.
