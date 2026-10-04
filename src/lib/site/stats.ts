/**
 * Numbers used on the landing page. Every figure carries its source so the
 * page can cite it inline; nothing here is estimated by us.
 */
export interface Stat {
  /** Numeric value for the count-up animation. */
  value: number;
  /** Rendered prefix/suffix, e.g. "$", "K", "%". */
  prefix?: string;
  suffix?: string;
  decimals?: number;
  label: string;
  detail: string;
  source: { name: string; href: string };
}

export const stats: Stat[] = [
  {
    value: 888,
    suffix: "K",
    label: "daily stablecoin addresses on Solana",
    detail: "Up 269% in a year. Every one of those transfers is public.",
    source: {
      name: "Solana, Sept 2026",
      href: "https://www.kucoin.com/news/insight/SOL/6aacaf867d10fa0007ce4baa",
    },
  },
  {
    value: 50,
    suffix: "%+",
    label: "of worker withdrawals on Rise, the largest crypto payroll rail, are in stablecoins",
    detail: "Over $1B processed across 190+ countries. USDC is 63% of crypto salaries. All of it on public ledgers.",
    source: { name: "Rise, State of Crypto Payroll 2026", href: "https://www.riseworks.io/blog/state-of-crypto-payroll-report-2026" },
  },
  {
    value: 10.3,
    prefix: "$",
    suffix: "M",
    decimals: 1,
    label: "paid out through Superteam Earn bounties and grants",
    detail: "2,591 opportunities, every payout amount published by design.",
    source: { name: "Superteam Earn", href: "https://superteam.fun/earn/sponsor" },
  },
  {
    value: 4,
    label: "confidential transfers observed in four days after re-enablement",
    detail: "The primitive shipped in June 2026. Almost nobody has used it. We do.",
    source: { name: "xroot.dev, Sept 2026", href: "https://xroot.dev/blog/solana-confidential-transfers-native-vs-rings" },
  },
];

export const proofPoints = [
  {
    title: "DAOs already know this hurts",
    body: "Gitcoin's attempt at a DAO-wide compensation audit met resistance over contributor privacy. Paying from a multisig turns payroll into open intelligence: amounts, headcount, runway, hiring pace.",
    source: { name: "Gitcoin governance forum", href: "https://gov.gitcoin.co/t/contributor-compensation-audit/12750" },
  },
  {
    title: "The rail is already there",
    body: "Solana carried more than $4.7 trillion of stablecoin volume in the past year and holds $17.3B of stablecoin supply. Payslip changes what is visible, not how money moves.",
    source: { name: "Lily Liu, CoinDesk, Sept 2026", href: "https://www.coindesk.com/opinion/2026/09/02/the-token-supercycle-everything-of-value-is-becoming-programmable" },
  },
  {
    title: "Nobody else can offer this",
    body: "Deel, Remote and Rippling run on bank rails. Crypto payroll tools run on public ledgers. Only a token-level confidential extension with an auditor key gives both privacy and accountability, and only Solana has one on mainnet.",
    source: { name: "Solana Token-2022 docs", href: "https://solana.com/docs/tokens/extensions/confidential-transfer" },
  },
];
