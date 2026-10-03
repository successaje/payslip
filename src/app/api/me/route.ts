import { describeMe, handle, json, requireSession } from "@/lib/api/server";

export const GET = handle(async () => {
  const session = await requireSession();
  return json(await describeMe(session.address));
});
