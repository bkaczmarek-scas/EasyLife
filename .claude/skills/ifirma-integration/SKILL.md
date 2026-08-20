---
name: ifirma-integration
description: Reference context for the iFirma.pl accounting API integration (issuing sales invoices) - the confirmed replacement for the dropped Taxxxo export idea (Taxxxo was too expensive to integrate with, so its API/UI code was removed entirely). The real auth mechanism and invoice payload are confirmed and implemented in src/services/ifirmaService.js. Use this skill whenever the user asks about iFirma, about the Invoicing wizard's step 4, about src/services/ifirmaService.js, about POST /api/export/ifirma, or about KSeF.
---

# Integracja z iFirma.pl

Realna integracja - nie szkielet. `src/services/ifirmaService.js` wystawia prawdziwe faktury przez
`POST https://www.ifirma.pl/iapi/fakturaeksportuslug.json`, wywoływane z kroku 4 wizarda w
Invoicing (`public/index.html`, `.wizard-step[data-step="4"]`) przez `POST /api/export/ifirma`.

**Ważne: to NIE jest faktura krajowa.** Softcraft (nabywca) to `SoftCraftAS`, firma zarejestrowana
w Norwegii (Øyro 55, 5200 Os) — spoza UE. Miejsce świadczenia usługi B2B wg art. 28b ustawy o VAT
to kraj nabywcy niezależnie od tego, czy jest w UE, więc faktura nie ma polskiego VAT — jest
wystawiana w trybie art. 28b z adnotacją "reverse charge-odwrotne obciążenie", potwierdzoną na
prawdziwej, historycznej fakturze użytkownika (nr 1/04/2026, wystawionej wcześniej przez inne
narzędzie - Taxxo e-Faktura). Endpoint `fakturakraj.json` (faktura krajowa) był pierwszą, błędną
próbą w tym projekcie - zostawiony w historii tylko jako ostrzeżenie, nie używać.

## Decyzja i stan obecny

Taxxxo zostało **porzucone** — zbyt kosztowna integracja API. iFirma to jedyny cel eksportu
faktur. Mechanizm autoryzacji i kształt żądania zostały potwierdzone bezpośrednio w dokumentacji
`api.ifirma.pl` (sierpień 2026) — poniżej pełny opis, żeby nie trzeba było tego odkrywać ponownie.

## Autoryzacja (potwierdzone)

iFirma **nie ma jednego klucza API** — panel (Ustawienia → API) generuje osobny klucz na każdy
scope: `faktura`, `abonent`, `rachunek`, `wydatek`. Do wystawiania faktur potrzebny jest tylko
klucz `faktura`.

Nagłówek: `Authentication: IAPIS user=<login>, hmac-sha1=<hex>`

Hash liczony jako `HMAC-SHA1(klucz, url + login + "faktura" + tresc_zadania)`, wynik zakodowany
hex. **Klucz z panelu jest w postaci szesnastkowej i trzeba go zdekodować do bajtów** przed użyciem
jako sekret HMAC (`Buffer.from(key, 'hex')` w Node) — to jest najłatwiejszy do przeoczenia detal,
źródłowy PHP-owy przykład iFirmy robi to ręcznie przez `hexToStr()`. `url` w hashu to adres BEZ
parametrów query. Zaimplementowane w `ifirmaService.buildAuthHeader`.

Źródła: `https://api.ifirma.pl/naglowek-autoryzacji/`,
`https://api.ifirma.pl/wystawianie-faktury-sprzedaz%cc%87y-krajowej-towarow-i-uslug/` (uwaga: ten
URL ma "ż" zakodowane jako kombinujący znak diakrytyczny `%cc%87`, zwykłe kopiowanie linku z
adresu przeglądarki może się nie rozwiązać — użyj linku z nawigacji dokumentacji), przykład kodu w
`https://github.com/ifirma/ifirma-api-sklepy`.

## Endpoint wystawiania faktury świadczenia usług poza terytorium kraju

`POST https://www.ifirma.pl/iapi/fakturaeksportuslug.json` (wariant kwot w PLN — jest też wariant
w walucie obcej pod tym samym adresem z dodatkowymi polami `Waluta`/`KursWaluty*`, nieużywany tu,
bo faktura jest w PLN mimo zagranicznego nabywcy), `Content-Type: application/json; charset=UTF-8`.

Pełna specyfikacja pól — patrz `api.ifirma.pl/swiadczenie-uslug-poza-terytorium-kraju/`. Kluczowe
różnice względem zwykłej faktury krajowej (`fakturakraj.json`), zmapowane w
`ifirmaService.buildInvoicePayload()`:

- `UslugaSwiadczonaTrybArt28b: true` — oznaczenie usługi w trybie art. 28b (ogólna zasada B2B:
  miejsce świadczenia = kraj nabywcy), wymagane przez ten endpoint.
- `Pozycje[0]` to JEDNA pozycja ryczałtowa: `Ilosc: 1`, `Jednostka: "szt."`, `CenaJednostkowa` =
  cała kwota okresu (`kwota`) — NIE `totalHours` × stawka godzinowa. To dokładnie wzorzec z
  prawdziwej, historycznej faktury użytkownika (1 pozycja, opis z numerem zamówienia).
  `NazwaPelnaObca`/`JednostkaObca` (angielski opis/jednostka) są wymagane przez ten endpoint -
  faktura jest dwujęzyczna, `Jezyk` (domyślnie `en` przez `IFIRMA_INVOICE_LANGUAGE`) wybiera drugi
  język. Uwaga: enum `Jezyk` w dokumentacji NIE zawiera `pl` — tylko języki obce do wersji
  dwujęzycznej PL+X.
- `StawkaVat: 0.00`, `TypStawkiVat: "PRC"` — stałe dla tego typu faktury (nie ma pola
  zwolnienia/`ZW` jak przy fakturze krajowej), nie ma potrzeby `IFIRMA_VAT_EXEMPT`/`IFIRMA_VAT_RATE`.
- `DataObowiazkuPodatkowego` — dodatkowe wymagane pole (moment powstania obowiązku podatkowego),
  ustawiane na `DataSprzedazy`.
- `Uwagi: 'reverse charge-odwrotne obciążenie'` — na sztywno, to jest wymagana prawna adnotacja dla
  tego trybu, nie pole opcjonalne per-fakturę (potwierdzone: dokładnie taki tekst widnieje na
  prawdziwej historycznej fakturze).
- `Kontrahent` = **nabywca faktury, czyli klient (SoftCraftAS, Norwegia), NIE zleceniobiorca** —
  dane z `CLIENT_*` w `.env` (`CLIENT_NAME`, `CLIENT_NIP`, `CLIENT_ADDRESS_STREET`,
  `CLIENT_POSTAL_CODE`, `CLIENT_CITY`, `CLIENT_COUNTRY`, `CLIENT_COUNTRY_CODE`). Inny zestaw danych
  niż `CONTRACTOR_*` (zleceniobiorca = właściciel konta iFirma, sprzedawca).
- `NumerKontaBankowego`, sposób zapłaty, termin płatności (`IFIRMA_PAYMENT_TERM_DAYS`, domyślnie 21
  dni od wystawienia — zgodnie z historyczną fakturą), seria numeracji, szablon — konfigurowalne
  przez `.env`, patrz `.env.example`.
- `Numer: null` celowo — iFirma sama nadaje kolejny numer z serii, nie mieszamy z
  `numerZamowienia` protokołów (to inna numeracja, wewnętrzna dla Softcraft) — `numerZamowienia`
  trafia tylko do treści opisu pozycji/usługi.

Odpowiedź: `{ response: { Kod, Informacja, Identyfikator } }` — `Kod: 0` = sukces,
`Identyfikator` = ID faktury do pobrania (`GET /iapi/fakturaeksportuslug/{id}.pdf|json|xml`, INNA
ścieżka niż `fakturakraj`) / wysyłki do KSeF. Kod inny niż 0 → rzucamy błąd z treścią `Informacja`.

## KSeF — sandbox iFirmy vs sandbox KSeF (ważne rozróżnienie)

Sprawdzone bezpośrednio w dokumentacji (sierpień 2026):

- **iFirma NIE ma sandboxa.** Aktywacja API (`api.ifirma.pl/aktywacja-api/`) wymaga istniejącego
  konta iFirma (Ustawienia → API → wybór poziomu dostępu Basic/Extended → wygenerowanie klucza).
  Testowe faktury wystawione przez API trafiają na prawdziwe, produkcyjne konto.
- **Wysyłka do KSeF przez iFirma** (`POST .../iapi/{rodzaj}/ksef/send/{id}.json`) też nie ma trybu
  testowego — dokumentacja o tym milczy, więc trzeba zakładać produkcję.
- **KSeF jako taki (Ministerstwo Finansów) ma własny, oficjalny, darmowy sandbox** — niezależny od
  iFirmy: `https://api-test.ksef.mf.gov.pl/` (środowisko testowe) i
  `https://api-demo.ksef.mf.gov.pl/` (środowisko demo/przedprodukcyjne), z interaktywnym Swaggerem.
  Przydatne do walidacji zachowania KSeF, ale to osobna integracja niż wywołanie iFirmy — iFirma
  nie pozwala przekierować wysyłki na te środowiska.

Wniosek: żeby przetestować cały flow bez ryzyka wystawienia prawdziwej faktury, trzeba albo użyć
prawdziwego (ale np. korekcyjnego/anulowanego) dokumentu na koncie iFirma, albo zaakceptować że
pierwsze testy `POST /api/export/ifirma` są na produkcyjnym koncie iFirma użytkownika.

## Konfiguracja (`.env`, nigdy `.env.example` ani żaden plik źródłowy)

```
IFIRMA_USERNAME=          # login do ifirma.pl
IFIRMA_INVOICE_KEY=       # klucz autoryzacji "faktura" z panelu (hex)
CLIENT_NAME=              # nabywca faktury - nazwa firmy klienta (Softcraft)
CLIENT_NIP=
CLIENT_ADDRESS_STREET=
CLIENT_POSTAL_CODE=
CLIENT_CITY=
```

Opcjonalne: `IFIRMA_BANK_ACCOUNT`, `IFIRMA_PAYMENT_METHOD`, `IFIRMA_PAYMENT_TERM_DAYS`,
`IFIRMA_INVOICE_LANGUAGE`, `IFIRMA_NUMBERING_SERIES`, `IFIRMA_INVOICE_TEMPLATE`, `CLIENT_COUNTRY`,
`CLIENT_COUNTRY_CODE` — patrz `.env.example`.

Ustawione lokalnie (2026-08-19) z realnych danych: `IFIRMA_USERNAME`, `IFIRMA_INVOICE_KEY` (klucz
`faktura` z panelu), `IFIRMA_BANK_ACCOUNT` i cały blok `CLIENT_*` (SoftCraftAS, Norwegia) — wzięte
z prawdziwej, historycznej faktury nr 1/04/2026 (Taxxo e-Faktura, `~/Downloads`). **Uwaga:
rozbieżność NIP** — `.env` miał wcześniej `CONTRACTOR_NIP=9151778944`, a ta faktura pokazuje
`PL9151778044` (różnica na 8. cyfrze, `89` vs `80`) — nie nadpisane automatycznie, do potwierdzenia
z użytkownikiem który jest poprawny.

## Co jeszcze nie jest zrobione

- Zapisywanie `Identyfikator` zwróconego przez iFirma w `protocolsHistoryService` (żeby History
  tab pamiętał, że dany okres ma już wystawioną fakturę, i mógł pobrać jej PDF przez
  `GET /iapi/fakturaeksportuslug/{id}.pdf`).
- Wysyłka do KSeF (`POST .../ksef/send/{id}.json`) — osobny krok po wystawieniu faktury, nie
  wywoływany automatycznie.
- Realny test end-to-end (pierwsze kliknięcie w kroku 4) — konto iFirma i dane `CLIENT_*` są już
  skonfigurowane lokalnie, ale endpoint nie ma sandboxa (patrz sekcja KSeF wyżej), więc pierwszy
  test to prawdziwa faktura na produkcyjnym koncie.
