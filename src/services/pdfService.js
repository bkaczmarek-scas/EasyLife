const fs = require('fs');
const path = require('path');
const { PDFDocument, rgb } = require('pdf-lib');
const fontkit = require('@pdf-lib/fontkit');
const { slownieZlote } = require('./slownie');
const ratesService = require('./ratesService');

const LOGO_PATH = path.join(__dirname, '..', 'assets', 'logo.png');

// DejaVu Sans covers Polish diacritics (ą ć ę ł ń ó ś ź ż), unlike pdf-lib's built-in standard fonts.
const DEJAVU_DIR = path.join(path.dirname(require.resolve('dejavu-fonts-ttf/package.json')), 'ttf');
const FONT_REGULAR_BYTES = fs.readFileSync(path.join(DEJAVU_DIR, 'DejaVuSans.ttf'));
const FONT_BOLD_BYTES = fs.readFileSync(path.join(DEJAVU_DIR, 'DejaVuSans-Bold.ttf'));

function pad2(n) {
  return String(n).padStart(2, '0');
}

// Buduje dane wejsciowe wspolne dla obu protokolow na podstawie miesiaca/roku i worklogow.
function buildPeriodData(month, year, worklogs) {
  const rate = ratesService.getRateForMonth(year, month);
  const kwota = Math.round(worklogs.totalHours * rate);
  const lastDay = new Date(year, month, 0).getDate();
  return {
    month,
    year,
    projects: worklogs.projects,
    totalHours: worklogs.totalHours,
    kwota,
    kwotaSlownie: slownieZlote(kwota),
    numerZamowienia: `SC/${year}/${pad2(month)}/01/BK`,
    dataZamowienia: `${year}-${pad2(month)}-01`,
    terminWykonania: `${month}/${lastDay}/${year}`,
    dataPodpisania: `${month}/${lastDay}/${year}`,
    contractor: {
      // Placeholder fallback only - real values always come from .env. Never hardcode real
      // contractor PII here, since this file (unlike .env) is committed to git.
      name: process.env.CONTRACTOR_NAME || 'Jan Kowalski',
      address: process.env.CONTRACTOR_ADDRESS || 'ul. Przykładowa 1, 00-000 Warszawa',
      nip: process.env.CONTRACTOR_NIP || '0000000000'
    }
  };
}

async function buildPdf(layout) {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);
  const page = pdfDoc.addPage([595.28, 841.89]);
  const fontReg = await pdfDoc.embedFont(FONT_REGULAR_BYTES, { subset: true });
  const fontBold = await pdfDoc.embedFont(FONT_BOLD_BYTES, { subset: true });
  const logoBytes = fs.readFileSync(LOGO_PATH);
  const logoImg = await pdfDoc.embedPng(logoBytes);

  const marginX = 56;
  const pageWidth = 595.28;
  const contentWidth = pageWidth - marginX * 2;
  const grey = rgb(0.55, 0.55, 0.55);
  const lightGrey = rgb(0.88, 0.88, 0.88);
  const textColor = rgb(0.11, 0.11, 0.1);

  let y = 841.89 - 56;

  function drawText(text, x, yy, font, size, color) {
    page.drawText(String(text), { x, y: yy, size, font, color: color || textColor });
  }
  function textWidth(text, font, size) {
    return font.widthOfTextAtSize(String(text), size);
  }
  function wrap(text, font, size, maxWidth) {
    const words = String(text).split(' ');
    const lines = [];
    let line = '';
    for (const w of words) {
      const test = line ? line + ' ' + w : w;
      if (textWidth(test, font, size) > maxWidth && line) {
        lines.push(line);
        line = w;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
    return lines;
  }

  drawText(layout.title, marginX, y, fontBold, 13);
  const logoW = 100, logoH = logoW * (logoImg.height / logoImg.width);
  page.drawImage(logoImg, { x: pageWidth - marginX - logoW, y: y - logoH + 10, width: logoW, height: logoH });
  y -= 36;

  const lineH = 12;
  const rowPad = 6;
  const rowHeights = layout.headerRows.map(([, valueLines]) => Math.max(1, valueLines.length) * lineH + rowPad * 2);
  const headerHeight = rowHeights.reduce((a, b) => a + b, 0);
  const boxTop = y;
  const boxBottom = y - headerHeight;
  page.drawRectangle({ x: marginX, y: boxBottom, width: contentWidth, height: headerHeight, borderColor: grey, borderWidth: 0.75 });
  let rowY = boxTop;
  layout.headerRows.forEach(([label, valueLines], i) => {
    const rh = rowHeights[i];
    drawText(label, marginX + 8, rowY - rowPad - 8, fontReg, 9.5);
    valueLines.forEach((vl, idx) => {
      const w = textWidth(vl, fontReg, 9.5);
      drawText(vl, marginX + contentWidth - 8 - w, rowY - rowPad - 8 - idx * lineH, fontReg, 9.5);
    });
    rowY -= rh;
    if (i < layout.headerRows.length - 1) {
      page.drawLine({ start: { x: marginX, y: rowY }, end: { x: marginX + contentWidth, y: rowY }, thickness: 0.5, color: rgb(0.85, 0.85, 0.85) });
    }
  });
  y = boxBottom - 22;

  const bodySize = 9.5;
  const bodyLineH = 13;
  const padIn = 8;
  const maxTextW = contentWidth - padIn * 2;

  layout.sections.forEach((section, sectionIdx) => {
    drawText(section.title, marginX, y, fontBold, 11);
    y -= 16;

    const blocks = [];
    section.paragraphs.forEach(p => {
      if (p.type === 'spacer') { blocks.push({ type: 'spacer', h: p.h }); return; }
      if (p.type === 'table') { blocks.push(p); return; }
      const lines = wrap(p.text, p.bold ? fontBold : fontReg, bodySize, maxTextW);
      blocks.push({ type: 'text', lines, bold: p.bold });
    });

    let bodyHeight = padIn * 2;
    blocks.forEach(b => {
      if (b.type === 'spacer') bodyHeight += b.h;
      else if (b.type === 'text') bodyHeight += b.lines.length * bodyLineH;
      else if (b.type === 'table') bodyHeight += b.rows.length * bodyLineH + (b.suma ? bodyLineH + 6 : 0);
    });

    const bodyTop = y;
    const bodyBottom = y - bodyHeight;
    page.drawRectangle({ x: marginX, y: bodyBottom, width: contentWidth, height: bodyHeight, borderColor: grey, borderWidth: 0.75 });

    let cy = bodyTop - padIn - 8;
    blocks.forEach(b => {
      if (b.type === 'spacer') { cy -= b.h; return; }
      if (b.type === 'text') {
        b.lines.forEach(l => {
          drawText(l, marginX + padIn, cy, b.bold ? fontBold : fontReg, bodySize);
          cy -= bodyLineH;
        });
        return;
      }
      if (b.type === 'table') {
        const colX = [marginX + padIn, marginX + padIn + b.cols[0], marginX + padIn + b.cols[0] + b.cols[1]];
        b.rows.forEach((row, ri) => {
          const bold = ri === 0;
          row.forEach((cell, ci) => {
            if (ci === row.length - 1 && row.length > 1) {
              const w = textWidth(cell, bold ? fontBold : fontReg, bodySize);
              drawText(cell, marginX + contentWidth - padIn - w, cy, bold ? fontBold : fontReg, bodySize);
            } else {
              drawText(cell, colX[ci], cy, bold ? fontBold : fontReg, bodySize);
            }
          });
          cy -= bodyLineH;
        });
        if (b.suma) {
          cy -= 4;
          page.drawRectangle({ x: marginX + padIn - 4, y: cy - 4, width: contentWidth - padIn * 2 + 8, height: bodyLineH + 6, color: lightGrey });
          drawText(b.suma[0], marginX + padIn, cy, fontBold, bodySize);
          const w = textWidth(b.suma[1], fontBold, bodySize);
          drawText(b.suma[1], marginX + contentWidth - padIn - w, cy, fontBold, bodySize);
          cy -= bodyLineH;
        }
      }
    });

    y = bodyBottom - (sectionIdx === layout.sections.length - 1 ? 30 : 20);
  });

  const sigW = (contentWidth - 20) / 2;
  const sigH = 40;
  page.drawRectangle({ x: marginX, y: y - sigH, width: sigW, height: sigH, borderColor: grey, borderWidth: 0.75 });
  page.drawRectangle({ x: marginX + sigW + 20, y: y - sigH, width: sigW, height: sigH, borderColor: grey, borderWidth: 0.75 });
  y -= sigH + 14;
  drawText('PODPIS ZLECENIOBIORCA', marginX, y, fontBold, 9.5);
  drawText('PODPIS ZLECENIODAWCA', marginX + sigW + 20, y, fontBold, 9.5);

  return pdfDoc.save();
}

function contractorValueLines(data) {
  return [data.contractor.name, data.contractor.address, data.contractor.nip].filter(Boolean);
}

async function buildZamowienie(data) {
  return buildPdf({
    title: 'PROTOKÓŁ ZAMÓWIENIA',
    headerRows: [
      ['Data zamówienia', [data.dataZamowienia]],
      ['Nazwa kontrahenta z NIP', contractorValueLines(data)],
      ['Numer zamówienia', [data.numerZamowienia]],
      ['Termin Wykonania', [data.terminWykonania]]
    ],
    sections: [
      {
        title: 'ZAKRES ZAMÓWIENIA',
        paragraphs: [
          { text: 'Zleceniodawca zleca Zleceniobiorcy wykonanie niżej wymienionych prac, projektów, usług, w tym programistycznych dla następujących klientów:' },
          { type: 'spacer', h: 8 },
          { type: 'table', cols: [70, 70], rows: [['Klient', 'Zakres'], ...data.projects.map(p => [p.name, 'Project Management'])] }
        ]
      },
      {
        title: 'WYNAGRODZENIE ZLECENIOBIORCY I DODATKOWE KOSZTY',
        paragraphs: [
          { text: `Wynagrodzenie Zleceniobiorcy wynosi ${data.kwota.toLocaleString('pl-PL')} zł netto (słownie: ${data.kwotaSlownie})` },
          { type: 'spacer', h: 8 },
          { text: 'Powyższe wynagrodzenie Zleceniobiorcy zgodnie z § 6 ust. 1 Umowy zawiera wynagrodzenie ryczałtowe za przeniesienie: autorskich praw majątkowych, autorskich praw zależnych do programów komputerowych oraz autorskich praw majątkowych do pozostałych utworów, autorskich praw zależnych.' },
          { type: 'spacer', h: 8 },
          { text: 'Zgodnie z § 6 ust. 4 Umowy w związku z § 6 ust. 2 Umowy wynagrodzenie płatne będzie na podstawie prawidłowej faktury, przelewem na rachunek bankowy Zleceniobiorcy, wskazany na fakturze, w terminie do 14 dni od daty wystawienia faktury.' }
        ]
      }
    ]
  });
}

async function buildOdbiorczy(data) {
  const sumaText = data.totalHours.toFixed(1).replace('.', ',');
  return buildPdf({
    title: 'PROTOKÓŁ ZDAWCZO-ODBIORCZY',
    headerRows: [
      ['Data podpisania protokołu', [data.dataPodpisania]],
      ['Nazwa kontrahenta z NIP', contractorValueLines(data)],
      ['Numer zamówienia', [data.numerZamowienia]],
      ['Data zamówienia', [data.dataZamowienia]]
    ],
    sections: [
      {
        title: 'ZAKRES PRAC',
        paragraphs: [
          { text: 'W trakcie okresu rozliczeniowego Zleceniobiorca wykonał następujące utwory, usługi :' },
          { type: 'spacer', h: 8 },
          {
            type: 'table', cols: [70, 130], suma: ['Suma godzin', sumaText],
            rows: [
              ['Project', 'Usługi', 'Liczba godzin'],
              ...data.projects.map(p => [p.name, 'Project Management', p.hours.toFixed(1).replace('.', ',')])
            ]
          },
          { type: 'spacer', h: 10 },
          { text: 'Zleceniobiorca oświadcza, że przysługują mu autorskie prawa osobiste, autorskie prawa majątkowe do utworów wykonanych w ramach Zamówienia.' },
          { type: 'spacer', h: 8 },
          { text: 'Zleceniobiorca oświadcza, że utwory zostały zarchiwizowane na odpowiednich serwerach zdefiniowanych dla poszczególnych projektów.' },
          { type: 'spacer', h: 8 },
          { text: `Zleceniobiorca oświadcza, że za wykonanie Zamówienia nr ${data.numerZamowienia} z dnia ${data.dataZamowienia} do Umowy z dnia 16.07.2025. Zleceniobiorcy przysługuje wynagrodzenie netto` },
          { type: 'spacer', h: 6 },
          { text: `${data.kwota.toLocaleString('pl-PL')} zł (słownie: ${data.kwotaSlownie})` }
        ]
      },
      {
        title: 'UWAGI',
        paragraphs: [
          { text: 'Zleceniodawca oświadcza, że ww. utwory, usługi zostały wykonane zgodnie z Zamówieniem.' },
          { type: 'spacer', h: 8 },
          { text: 'Zleceniodawca oświadcza, że przyjmuje utwory, usługi.' },
          { type: 'spacer', h: 8 },
          { text: `Zleceniodawca oświadcza, że za wykonanie zamówienia Zleceniobiorca może wystawić fakturę na kwotę ${data.kwota.toLocaleString('pl-PL')} zł (słownie : ${data.kwotaSlownie}) netto` },
          { type: 'spacer', h: 10 },
          { text: '*niepotrzebne usunąć lub skreślić' },
          { type: 'spacer', h: 4 },
          { text: 'Na tym protokół zakończono i podpisano.' }
        ]
      }
    ]
  });
}

async function generateProtocols(month, year, worklogs) {
  const data = buildPeriodData(month, year, worklogs);
  const [zamowienie, zdawczoOdbiorczy] = await Promise.all([buildZamowienie(data), buildOdbiorczy(data)]);
  return {
    data,
    files: {
      zamowienie: { bytes: zamowienie, filename: `protokol_zamowienia_${pad2(month)}_${year}.pdf` },
      odbiorczy: { bytes: zdawczoOdbiorczy, filename: `protokol_zdawczo_odbiorczy_${pad2(month)}_${year}.pdf` }
    }
  };
}

module.exports = { generateProtocols, buildPeriodData };
