import { destroySession, getSession } from "@/lib/auth/session";

export async function GET() {
  const session = await getSession();
  return Response.json({ address: session?.address ?? null });
}

export async function DELETE() {
  await destroySession();
  return new Response(null, { status: 204 });
}
