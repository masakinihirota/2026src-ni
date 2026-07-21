export type UnitPriceConflict = {
  unitNumber: string;
  changes: Partial<{
    unitType: { previous: string | null; report: string | null };
    area: { previous: string | null; report: string | null };
    priceManYen: { previous: number | null; report: number | null };
    floor: { previous: number; report: number };
  }>;
};

export const UNIT_PRICE_CONFLICTS: UnitPriceConflict[] = [
  {
    unitNumber: "S1-5-1305",
    changes: {
      area: { previous: "61.80㎡", report: "50.02㎡" },
      priceManYen: { previous: null, report: 4060 },
    },
  },
  {
    unitNumber: "S1-6-1306",
    changes: {
      area: { previous: "61.80㎡", report: "47.38㎡" },
      priceManYen: { previous: null, report: 3840 },
    },
  },
  {
    unitNumber: "S1-7-1307",
    changes: {
      area: { previous: "51.50㎡", report: "61.80㎡" },
      priceManYen: { previous: null, report: 5010 },
    },
  },
  {
    unitNumber: "S1-8-1308",
    changes: {
      area: { previous: "51.50㎡", report: "63.86㎡" },
      priceManYen: { previous: null, report: 5180 },
    },
  },
  {
    unitNumber: "S3-1-1118",
    changes: {
      unitType: { previous: null, report: "S3-1" },
    },
  },
  {
    unitNumber: "S4-1-1026",
    changes: {
      area: { previous: "61.24㎡", report: "71.92㎡" },
      priceManYen: { previous: 4360, report: 5730 },
    },
  },
  {
    unitNumber: "S4-1-1126",
    changes: {
      area: { previous: null, report: "71.92㎡" },
      priceManYen: { previous: null, report: 5770 },
    },
  },
  {
    unitNumber: "S4-1-1226",
    changes: {
      area: { previous: "61.24㎡", report: "71.92㎡" },
      priceManYen: { previous: 4410, report: 5800 },
    },
  },
  {
    unitNumber: "S4-1-1326",
    changes: {
      area: { previous: "61.24㎡", report: "71.92㎡" },
      priceManYen: { previous: 4440, report: 5830 },
    },
  },
  {
    unitNumber: "S4-1-1426",
    changes: {
      area: { previous: "61.24㎡", report: "71.92㎡" },
      priceManYen: { previous: 4590, report: 5880 },
    },
  },
  {
    unitNumber: "S4-2-1027",
    changes: {
      area: { previous: "61.24㎡", report: "71.92㎡" },
      priceManYen: { previous: 4250, report: 5730 },
    },
  },
  {
    unitNumber: "S4-2-1127",
    changes: {
      area: { previous: null, report: "71.92㎡" },
      priceManYen: { previous: null, report: 5770 },
    },
  },
  {
    unitNumber: "S4-2-1227",
    changes: {
      area: { previous: "61.24㎡", report: "71.92㎡" },
      priceManYen: { previous: 4310, report: 5800 },
    },
  },
  {
    unitNumber: "S4-2-1327",
    changes: {
      area: { previous: "61.24㎡", report: "71.92㎡" },
      priceManYen: { previous: 4490, report: 5830 },
    },
  },
  {
    unitNumber: "S4-2-1427",
    changes: {
      area: { previous: "61.24㎡", report: "71.92㎡" },
      priceManYen: { previous: 4530, report: 5880 },
    },
  },
  {
    unitNumber: "S4-3-1028",
    changes: {
      priceManYen: { previous: 5190, report: 5730 },
    },
  },
  {
    unitNumber: "S4-3-1128",
    changes: {
      area: { previous: null, report: "71.92㎡" },
      priceManYen: { previous: null, report: 5770 },
    },
  },
  {
    unitNumber: "S4-3-1228",
    changes: {
      unitType: { previous: null, report: "S4-3" },
      priceManYen: { previous: 5350, report: 5800 },
    },
  },
  {
    unitNumber: "S4-3-1328",
    changes: {
      priceManYen: { previous: 5390, report: 5830 },
    },
  },
  {
    unitNumber: "S4-3-1428",
    changes: {
      priceManYen: { previous: 5440, report: 5880 },
    },
  },
];
