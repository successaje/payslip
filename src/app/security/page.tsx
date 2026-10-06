import type { Metadata } from "next";
import { SitePage } from "@/components/site/SitePage";

export const metadata: Metadata = {
  title: "Security and trust model",
  description: "What Payslip can see, what it cannot, and what is not yet audited.",
};

const rows = [
  ["Public", "That a transfer happened, sender, recipient, time", "Any amount or balance"],
  ["Recipient", "Their own balance and transfers", "Anyone else's amount"],
  ["Auditor", "Every transfer amount on the payout token", "Spend, freeze or move funds"],
  ["Payslip server", "Names, emails, invite links, amounts the payer typed", "Keys, decrypted balances, anything the public cannot see on-chain"],
];

export default function SecurityPage() {
  return (
    <SitePage
      eyebrow="Security"
      title="What Payslip can see, and what it cannot."
      intro="Privacy here comes from the chain, not from us. This page says exactly where the boundaries are, including the ones we have not finished yet."
    >
      <h2>Trust model</h2>
      <div className="not-prose overflow-x-auto rounded-[var(--radius-lg)] border border-line">
        <table className="w-full text-[14px]">
          <thead className="bg-paper-sunken text-left text-[12px] uppercase tracking-[0.06em] text-ink-3">
            <tr>
              <th className="px-4 py-3">Party</th>
              <th className="px-4 py-3">Can see</th>
              <th className="px-4 py-3">Cannot</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r[0]} className="border-t border-line align-top">
                <td className="px-4 py-3 font-medium text-ink">{r[0]}</td>
                <td className="px-4 py-3 text-ink-2">{r[1]}</td>
                <td className="px-4 py-3 text-ink-2">{r[2]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>How amounts stay private</h2>
      <p>
        The payout token is a Solana Token-2022 mint with the confidential-transfer extension. Balances are stored as
        ElGamal ciphertexts. A transfer carries zero-knowledge proofs that the sender had enough and that the amount is in
        range, verified by the ZK ElGamal proof program on-chain. The proofs are generated in the sender&apos;s browser from
        keys derived with one wallet signature over a fixed message. Payslip never receives those keys.
      </p>

      <h2>How the auditor works</h2>
      <p>
        At setup the mint records an auditor ElGamal public key. Every transfer additionally encrypts its amount to that
        key. Whoever holds the matching wallet can decrypt amounts from transaction signatures alone. The key cannot
        sign anything, so it cannot spend. Changing the auditor means creating a new payout token; we say so in the app.
      </p>

      <h2>How the money is backed</h2>
      <p>
        The payout token is wrapped USDC. The <code>payslip_vault</code> program is the mint authority through a program
        derived address and exposes three instructions: open a vault, wrap, unwrap. There is no admin instruction and no
        authority over funds. Supply equals vault balance, which anyone can verify on-chain.
      </p>

      <h2>What the server stores</h2>
      <p>
        Workspace names, people&apos;s names and optional emails, invite tokens, the amounts the payer typed, and the
        signatures of transactions the payer sent. Nothing in the database is needed to decrypt anything. Sessions are
        sign-in-with-Solana: the wallet signs a readable message with a nonce, the server verifies the ed25519 signature.
      </p>

      <h2>Known limits, honestly</h2>
      <ul>
        <li>Not independently audited: neither the program nor the app. Devnet only until that changes.</li>
        <li>The explorer still shows sender, recipient and timing. Payslip hides amounts, not relationships.</li>
        <li>Statements show the amount the payer recorded; the balance is what the chain proves. Per-transfer recipient decryption is on the roadmap.</li>
        <li>The confidential extension caps a single transfer at 2^48 base units, about $281 million.</li>
        <li>Payouts use Transaction V1 (one atomic transaction). Some block explorers do not render version-1 transactions yet; the in-app receipt reads them directly from RPC.</li>
      </ul>

      <h2>Reporting a problem</h2>
      <p>
        Open an issue or email <a href="mailto:security@payslip.so">security@payslip.so</a>. Please do not test against
        other people&apos;s workspaces.
      </p>
    </SitePage>
  );
}
