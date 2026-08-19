---
name: ifirma-integration
description: Reference context for building the real iFirma.pl accounting API integration (invoices, expenses, contractors) - the confirmed replacement for the dropped Taxxxo export idea (Taxxxo was too expensive to integrate with, so its API/UI code was removed entirely). Use this skill whenever the user asks about iFirma, about finishing the accounting/invoice export feature, about src/services/ifirmaService.js, or about the POST /api/export/ifirma endpoint.
---

# Integracja z iFirma.pl — punkt startowy

To jest notatka referencyjna i punkt startowy dla szkieletu, który już istnieje w kodzie — nie
gotowa integracja. Prawdziwa praca (flow autoryzacji, mapowanie endpointów, testy) jeszcze się nie
odbyła.

## Decyzja i stan obecny

Taxxxo zostało **porzucone** — zbyt kosztowna integracja API. Cała logika/UI Taxxxo (link,
przycisk "Open Taxxxo", `TAXXXO_URL`) zostały usunięte z kodu. iFirma to **potwierdzony**, jedyny
cel eksportu faktur — nie trzeba już pytać użytkownika "czy zamiast, czy obok".

Co już istnieje jako szkielet:
- `src/services/ifirmaService.js` — `isConfigured()` (sprawdza `IFIRMA_API_KEY`), `createInvoice()`
  na razie rzuca `Error('not implemented yet')`.
- `POST /api/export/ifirma` w `server.js` — zwraca `501` dopóki `IFIRMA_API_KEY` nie jest
  ustawiony; docelowo ma wołać `ifirmaService.createInvoice(periodData)`.
- `/api/status` zwraca `ifirmaConfigured` (analogicznie do `jiraConfigured`/`tempoConfigured`).
- `.env.example` ma placeholder `IFIRMA_API_KEY=` z komentarzem.

## Kontekst w projekcie

Powiązane pliki:
- `src/services/protocolsHistoryService.js` — historia wygenerowanych protokołów (dane wejściowe
  do faktury)
- `src/services/ratesService.js` — stawki godzinowe (kwota faktury = godziny × stawka)
- `src/services/pdfService.js` — `buildPeriodData` zwraca gotowy zestaw danych okresu (kwota,
  kontrahent, projekty, daty) — to jest dokładnie to, co trzeba zmapować na strukturę faktury
  iFirma w `createInvoice()`

## Co oferuje API iFirma

Dokumentacja: https://api.ifirma.pl/ (HTTPS + JSON). Uwaga: link podany przez użytkownika miał
doklejony długi tracking query string z Google Ads (`?_gl=...&_gcl_aw=...&_ga=...`) — używaj
czystego adresu bazowego powyżej, nie kopiuj tamtych parametrów.

- **Dokumenty sprzedażowe**: pobieranie/wystawianie faktur (krajowe, eksportowe, proforma),
  rejestracja płatności, wysyłka mailowa/tradycyjna, przesył do KSeF
- **Koszty**: zakupy towarów/materiałów (na podstawie faktury), koszty operacyjne, wydatki
  telekomunikacyjne
- **Kontrahenci**: dodawanie, edycja, pobieranie, wyszukiwanie
- **Dodatkowo**: ankiety pracownicze, zarządzanie zamówieniami

## Limity i autoryzacja

- Limit dzienny: 15 000 zapytań
- Limit minutowy: 100 zapytań
- Autoryzacja przez nagłówki HTTP — dokładny schemat (jaki nagłówek, jak wygenerować klucz) nie
  jest jeszcze potwierdzony, trzeba sprawdzić w dokumentacji na starcie prawdziwej implementacji.
  API wymaga wcześniejszej aktywacji na koncie iFirma, zanim zacznie odpowiadać.

## Żeby dokończyć integrację

1. Sprawdź dokładny mechanizm autoryzacji w dokumentacji — nie zakładaj z góry jakiego nagłówka
   wymaga.
2. Zaimplementuj `ifirmaService.createInvoice(periodData)`: zmapuj `buildPeriodData` (kwota,
   stawka, kontrahent, projekty, daty) na strukturę faktury iFirma — prawdopodobnie endpoint
   faktur sprzedażowych krajowych.
3. Dodaj realną wartość `IFIRMA_API_KEY` tylko do `.env` (nigdy do `.env.example` ani do żadnego
   pliku źródłowego — patrz sekcja "Bezpieczeństwo / wdrożenie demo" w `CLAUDE.md`, te same zasady
   dotyczą każdego nowego sekretu).
4. Podłącz frontend: po `exportBtn` (generowanie/pobranie PDF-ów) dodać wywołanie
   `POST /api/export/ifirma`, analogicznie do istniejącego flow `mark-exported` w
   `protocolsHistoryService`.
