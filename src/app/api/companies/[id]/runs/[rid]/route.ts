import { handle, json, requireOwnedCompany } from "@/lib/api/server";
import { loadRun } from "@/lib/api/runs";

export const GET = handle(async (_req, { params }) => {
  const { id, rid } = await params;
  await requireOwnedCompany(id);
  return json(await loadRun(id, rid));
});
