import { confirmSubscription, jekoTransaction, verifyJekoSignature } from "@/server/services/subscription-checkout";

export async function POST(request: Request) {
  const secret = process.env.JEKO_WEBHOOK_SECRET;
  if (!secret) return new Response(null, { status: 503 });
  const body = Buffer.from(await request.arrayBuffer());
  if (!verifyJekoSignature(body, request.headers.get("Jeko-Signature"), secret)) {
    return new Response(null, { status: 401 });
  }
  if (request.headers.get("Jeko-Event") !== "TRANSACTION_COMPLETED") {
    return new Response(null, { status: 204 });
  }
  let payload: unknown;
  try {
    payload = JSON.parse(body.toString("utf8"));
  } catch {
    return new Response(null, { status: 400 });
  }
  const result = jekoTransaction.safeParse(payload);
  if (result.success && result.data.storeId === process.env.JEKO_STORE_ID) {
    await confirmSubscription(result.data);
  }
  return new Response(null, { status: 204 });
}
