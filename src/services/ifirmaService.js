// Integracja z API iFirma.pl - wystawianie faktury swiadczenia uslug poza terytorium kraju
// (fakturaeksportuslug.json, art. 28b ustawy o VAT - odwrotne obciazenie). Softcraft (nabywca,
// "Kontrahent" w zadaniu) to firma zarejestrowana w Norwegii, spoza UE, stad ten wariant endpointu
// zamiast domowej faktury krajowej (fakturakraj.json). Mechanizm autoryzacji i ksztalt zadania
// potwierdzone w dokumentacji api.ifirma.pl - patrz .claude/skills/ifirma-integration/SKILL.md.
const crypto = require('crypto');
const axios = require('axios');

const API_URL = 'https://www.ifirma.pl/iapi/fakturaeksportuslug.json';
const KEY_NAME = 'faktura';

function isConfigured() {
  return Boolean(process.env.IFIRMA_USERNAME && process.env.IFIRMA_INVOICE_KEY);
}

// Schemat wg dokumentacji ("Naglowek autoryzacji"): Authentication: IAPIS user=<login>,
// hmac-sha1=<hex>, gdzie hex = HMAC-SHA1(klucz zdekodowany z hex, url_bez_parametrow + login +
// nazwaKlucza + tresc_zadania), wynik zakodowany hex. Klucz z panelu ifirma.pl jest podawany w
// postaci szesnastkowej i trzeba go zdekodowac do bajtow przed uzyciem jako sekret HMAC.
function buildAuthHeader(url, username, key, requestContent) {
  const secret = Buffer.from(key, 'hex');
  const message = url + username + KEY_NAME + requestContent;
  const hash = crypto.createHmac('sha1', secret).update(message, 'utf8').digest('hex');
  return `IAPIS user=${username}, hmac-sha1=${hash}`;
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

function addDays(isoDate, days) {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function buildInvoicePayload(periodData) {
  const { year, month, kwota, orderNumber } = periodData;
  const lastDay = new Date(year, month, 0).getDate();
  const dataSprzedazy = `${year}-${pad2(month)}-${pad2(lastDay)}`;
  const dataWystawienia = new Date().toISOString().slice(0, 10);
  const terminPlatnosci = addDays(dataWystawienia, Number(process.env.IFIRMA_PAYMENT_TERM_DAYS || '21'));
  const serviceName = `Usługi związane z zarządzaniem i prowadzeniem projektów zgodne z zamówieniem numer ${orderNumber}`;

  return {
    NazwaUslugi: serviceName,
    UslugaSwiadczonaTrybArt28b: true,
    ZaplaconoNaDokumencie: 0,
    NumerKontaBankowego: process.env.IFIRMA_BANK_ACCOUNT || 'BRAK',
    DataWystawienia: dataWystawienia,
    DataSprzedazy: dataSprzedazy,
    FormatDatySprzedazy: 'MSC',
    DataObowiazkuPodatkowego: dataSprzedazy,
    TerminPlatnosci: terminPlatnosci,
    SposobZaplaty: process.env.IFIRMA_PAYMENT_METHOD || 'PRZ',
    NazwaSeriiNumeracji: process.env.IFIRMA_NUMBERING_SERIES || null,
    NazwaSzablonu: process.env.IFIRMA_INVOICE_TEMPLATE || null,
    Jezyk: process.env.IFIRMA_INVOICE_LANGUAGE || 'en',
    Waluta: 'PLN',
    RodzajPodpisuOdbiorcy: 'BPO',
    Uwagi: 'reverse charge-odwrotne obciążenie',
    WidocznyNumerGios: false,
    Numer: null,
    Pozycje: [{
      StawkaVat: 0.00,
      TypStawkiVat: 'PRC',
      Ilosc: 1,
      CenaJednostkowa: kwota,
      NazwaPelna: serviceName,
      NazwaPelnaObca: `IT project management and development services - order no. ${orderNumber}`,
      Jednostka: 'szt.',
      JednostkaObca: 'pcs'
    }],
    Kontrahent: {
      Nazwa: process.env.CLIENT_NAME,
      NIP: process.env.CLIENT_NIP || null,
      Ulica: process.env.CLIENT_ADDRESS_STREET || null,
      KodPocztowy: process.env.CLIENT_POSTAL_CODE,
      KodKraju: process.env.CLIENT_COUNTRY_CODE || null,
      Kraj: process.env.CLIENT_COUNTRY || null,
      Miejscowosc: process.env.CLIENT_CITY,
      OsobaFizyczna: false
    }
  };
}

async function createInvoice(periodData) {
  if (!isConfigured()) {
    throw new Error('iFirma integration not configured - set IFIRMA_USERNAME and IFIRMA_INVOICE_KEY');
  }
  if (!process.env.CLIENT_NAME || !process.env.CLIENT_POSTAL_CODE || !process.env.CLIENT_CITY) {
    throw new Error('Missing buyer data - set CLIENT_NAME, CLIENT_POSTAL_CODE, CLIENT_CITY in .env');
  }
  if (!periodData.orderNumber) {
    throw new Error('Missing order number for this period - generate protocols first');
  }

  const payload = buildInvoicePayload(periodData);
  const requestContent = JSON.stringify(payload);
  const authHeader = buildAuthHeader(API_URL, process.env.IFIRMA_USERNAME, process.env.IFIRMA_INVOICE_KEY, requestContent);

  const res = await axios.post(API_URL, requestContent, {
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json; charset=UTF-8',
      'Authentication': authHeader
    },
    validateStatus: () => true
  });

  const body = res.data && res.data.response ? res.data.response : res.data;
  if (!res.status || res.status >= 300 || (body && body.Kod !== 0)) {
    console.error('[ifirma] DIAGNOSTIC - HTTP status:', res.status, 'raw body:', JSON.stringify(res.data));
    const message = (body && (body.Informacja || body.error)) || `iFirma API error (HTTP ${res.status})`;
    throw new Error(message);
  }

  return { identyfikator: body.Identyfikator, informacja: body.Informacja };
}

module.exports = { isConfigured, createInvoice };
