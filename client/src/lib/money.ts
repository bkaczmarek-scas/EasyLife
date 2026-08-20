export function formatMoney(amount: number, decimals = 2) {
  return amount.toLocaleString('pl-PL', { minimumFractionDigits: decimals, maximumFractionDigits: decimals, useGrouping: 'always' })
}

export function formatPLN(amount: number, decimals = 2) {
  return `${formatMoney(amount, decimals)} zł`
}
