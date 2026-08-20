export const queryKeys = {
  status: ['status'] as const,
  rates: { all: ['rates'] as const },
  bonuses: { all: ['bonuses'] as const },
  costs: { all: ['costs'] as const },
  vehicles: {
    all: ['vehicles'] as const,
    serviceLog: (vehicleId?: string) => ['vehicles', 'serviceLog', vehicleId ?? 'all'] as const,
  },
  properties: {
    all: ['properties'] as const,
    expenses: (propertyId?: string) => ['properties', 'expenses', propertyId ?? 'all'] as const,
  },
  taxPayments: { all: ['taxPayments'] as const },
  subscriptions: { all: ['subscriptions'] as const },
  chores: { all: ['chores'] as const },
  protocolsHistory: { all: ['protocolsHistory'] as const },
  worklogs: (month: number, year: number) => ['worklogs', month, year] as const,
}
