// Integracja z API iFirma.pl (eksport faktur) - zastepuje porzucony pomysl integracji z Taxxxo
// (zbyt kosztowna integracja API). To szkielet: prawdziwe wywolania API jeszcze nie sa
// zaimplementowane - kontekst, endpointy i limity patrz .claude/skills/ifirma-integration/SKILL.md.
function isConfigured() {
  return Boolean(process.env.IFIRMA_API_KEY);
}

async function createInvoice(periodData) {
  throw new Error('iFirma integration not implemented yet - see .claude/skills/ifirma-integration/SKILL.md');
}

module.exports = { isConfigured, createInvoice };
