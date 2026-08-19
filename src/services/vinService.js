// Dekodowanie VIN przez NHTSA vPIC (US Dept. of Transportation) - w pelni darmowe publiczne API,
// bez klucza: https://vpic.nhtsa.dot.gov/api/. Baza jest zorientowana na rynek US, wiec dla marek
// spoza tego rynku wyniki moga byc skromne - to oczekiwane, nie blad integracji.
const axios = require('axios');

// Podzbior ~136 pol zwracanych przez NHTSA - tylko te uzyteczne w karcie pojazdu.
const FIELDS = [
  'Make', 'Model', 'Model Year', 'Manufacturer Name', 'Vehicle Type', 'Body Class',
  'Doors', 'Engine Model', 'Engine Number of Cylinders', 'Displacement (L)',
  'Engine Brake (hp) From', 'Engine Power (kW)', 'Fuel Type - Primary',
  'Drive Type', 'Transmission Style', 'Plant Country', 'Plant City'
];

async function decodeVin(vin) {
  const { data } = await axios.get(`https://vpic.nhtsa.dot.gov/api/vehicles/decodevin/${encodeURIComponent(vin)}`, {
    params: { format: 'json' },
    timeout: 8000
  });
  const results = data.Results || [];
  const byVariable = {};
  results.forEach(r => { byVariable[r.Variable] = r.Value; });

  const info = {};
  FIELDS.forEach(field => {
    const value = byVariable[field];
    if (value && value !== 'Not Applicable') info[field] = value;
  });
  return info;
}

module.exports = { decodeVin };
