---
name: ifirma-integration
description: Reference context for integrating this app with iFirma.pl's accounting API (invoices, expenses, contractors) - a future roadmap item that extends or replaces the "Taxxxo export" item in CLAUDE.md. Use this skill whenever the user asks about iFirma, about integrating with an accounting/bookkeeping API, about implementing the "Eksport CSV/XLSX do Taxxxo" roadmap item, or about building /api/export endpoints for this app.
---

# Integracja z iFirma.pl — punkt startowy

To jest notatka referencyjna, nie gotowa integracja. Prawdziwa praca (flow autoryzacji, mapowanie
endpointów, testy) jeszcze się nie odbyła — ten plik ma oszczędzić czas na research przy starcie,
nie zastąpić go.

## Kontekst w projekcie

Apka ma już koncepcję eksportu do księgowości ("Taxxxo") — patrz `CLAUDE.md`, sekcja "Priorytety
dalszego rozwoju", punkt 1: `Eksport CSV/XLSX do Taxxxo — nowy endpoint /api/export/taxxxo`.
Obecnie to tylko link (`TAXXXO_URL` w `.env`), sam eksport CSV/XLSX nie jest zaimplementowany.
iFirma może być alternatywnym albo dodatkowym celem eksportu obok/zamiast Taxxxo — do ustalenia
z użytkownikiem, zanim zacznie się kodować.

Powiązane pliki:
- `src/services/protocolsHistoryService.js` — historia wygenerowanych protokołów (dane wejściowe
  do ewentualnej faktury)
- `src/services/ratesService.js` — stawki godzinowe (kwota faktury = godziny × stawka)
- `src/services/pdfService.js` — `buildPeriodData` zwraca gotowy zestaw danych okresu (kwota,
  kontrahent, projekty, daty) — najbliższy kandydat do zmapowania na strukturę faktury iFirma

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
  jest jeszcze potwierdzony, trzeba sprawdzić w dokumentacji na starcie integracji. API wymaga
  wcześniejszej aktywacji na koncie iFirma, zanim zacznie odpowiadać.

## Zanim zaczniesz kodować integrację

1. Sprawdź dokładny mechanizm autoryzacji w dokumentacji — nie zakładaj z góry jakiego nagłówka
   wymaga.
2. Ustal z użytkownikiem: iFirma **zamiast** Taxxxo, czy oba równolegle (może chcieć wybór albo
   eksport do obu).
3. Zmapuj `pdfService.buildPeriodData` (kwota, stawka, kontrahent, projekty, daty) na strukturę
   faktury iFirma — prawdopodobnie endpoint faktur sprzedażowych krajowych.
4. Nowe zmienne env (klucz API itd.) dopisz do `.env.example` jako placeholder — nigdy jako
   prawdziwą wartość (patrz sekcja "Bezpieczeństwo / wdrożenie demo" w `CLAUDE.md` — te same zasady
   dotyczą każdego nowego sekretu, nie tylko istniejących).
