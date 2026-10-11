import { ButtonLink } from "@/components/ui";
import { Mark } from "@/components/brand/Wordmark";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-4 py-16 text-center">
      <Mark size={36} className="mb-5" />
      <h1 className="text-[22px] font-semibold text-ink">That page does not exist</h1>
      <p className="mt-2 text-[14px] text-ink-3">If you followed an invite link, ask the sender for a new one.</p>
      <ButtonLink href="/" variant="secondary" className="mt-5">
        Back to Payslip
      </ButtonLink>
    </main>
  );
}
