// Konwersja kwoty PLN na zapis slowny, np. 22500 -> "dwadziescia dwa tysiace piecset zlotych 00/100"

const JEDNOSCI = ['', 'jeden', 'dwa', 'trzy', 'cztery', 'pięć', 'sześć', 'siedem', 'osiem', 'dziewięć'];
const NASTKI = ['dziesięć', 'jedenaście', 'dwanaście', 'trzynaście', 'czternaście', 'piętnaście', 'szesnaście', 'siedemnaście', 'osiemnaście', 'dziewiętnaście'];
const DZIESIATKI = ['', '', 'dwadzieścia', 'trzydzieści', 'czterdzieści', 'pięćdziesiąt', 'sześćdziesiąt', 'siedemdziesiąt', 'osiemdziesiąt', 'dziewięćdziesiąt'];
const SETKI = ['', 'sto', 'dwieście', 'trzysta', 'czterysta', 'pięćset', 'sześćset', 'siedemset', 'osiemset', 'dziewięćset'];

function groupWords(n) {
  const parts = [];
  const h = Math.floor(n / 100);
  const rem = n % 100;
  if (h > 0) parts.push(SETKI[h]);
  if (rem >= 10 && rem < 20) {
    parts.push(NASTKI[rem - 10]);
  } else {
    const d = Math.floor(rem / 10);
    const j = rem % 10;
    if (d > 0) parts.push(DZIESIATKI[d]);
    if (j > 0) parts.push(JEDNOSCI[j]);
  }
  return parts.join(' ');
}

function pluralForm(n, forms) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (n === 1) return forms[0];
  if (mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14)) return forms[1];
  return forms[2];
}

function slownieZlote(n) {
  if (n === 0) return 'zero złotych 00/100';
  const parts = [];
  const thousands = Math.floor(n / 1000);
  const rest = n % 1000;
  if (thousands > 0) {
    const thWords = thousands === 1 ? '' : groupWords(thousands);
    parts.push((thWords ? thWords + ' ' : '') + pluralForm(thousands, ['tysiąc', 'tysiące', 'tysięcy']));
  }
  if (rest > 0) parts.push(groupWords(rest));
  const zlotyForm = pluralForm(n, ['złoty', 'złote', 'złotych']);
  return parts.join(' ') + ' ' + zlotyForm + ' 00/100';
}

module.exports = { slownieZlote };
