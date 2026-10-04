"use client";

import Link from "next/link";
import { ArrowRight, Users } from "lucide-react";
import { useApp } from "@/components/app/AppContext";
import { Button, Card, CardBody, CardHeader, PageHeader, EmptyState } from "@/components/ui";
import { shortAddress } from "@/lib/format";
import { explorerUrl } from "@/lib/solana/config";

export function Overview() {
  const { company } = useApp();
  if (!company) return null;

  return (
    <>
      <PageHeader title={company.name} description="Private payouts on Solana. Amounts are encrypted on-chain." />
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader title="Payout token" description="Your workspace's confidential token, backed by USDC." />
          <CardBody>
            {company.mint ? (
              <a
                href={explorerUrl("address", company.mint)}
                target="_blank"
                rel="noreferrer"
                className="font-mono text-[13px] text-ink underline decoration-line underline-offset-4 hover:decoration-ink"
              >
                {shortAddress(company.mint, 8)}
              </a>
            ) : (
              <p className="text-[13.5px] text-ink-3">Not created yet.</p>
            )}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Auditor" description="Can decrypt every transfer, cannot move funds." />
          <CardBody>
            <p className="font-mono text-[13px] text-ink">{shortAddress(company.auditorAddress, 8)}</p>
          </CardBody>
        </Card>
      </div>
      <div className="mt-6">
        <EmptyState
          icon={<Users size={18} />}
          title="Add your first person"
          description="Each person gets an invite link, connects their wallet, and is ready to be paid privately."
          action={
            <Link href="/app/people">
              <Button trailingIcon={<ArrowRight size={15} />}>Go to People</Button>
            </Link>
          }
        />
      </div>
    </>
  );
}
