import { createAcsUserToken, isAcsConfigured } from "@/lib/acs/server";
import { getRoom } from "@/lib/kyc/room-store";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { roomId?: string };
  if (!body.roomId?.trim()) {
    return Response.json({ error: "roomId is required" }, { status: 400 });
  }
  if (!getRoom(body.roomId.trim())) {
    return Response.json({ error: "KYC room not found" }, { status: 404 });
  }

  if (!isAcsConfigured()) {
    return Response.json(
      {
        error: "Azure Communication Services is not configured",
        hint: "Set AZURE_COMMUNICATION_CONNECTION_STRING in .env.local",
      },
      { status: 503 },
    );
  }

  try {
    const tokenResponse = await createAcsUserToken();

    return Response.json(tokenResponse);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create ACS token";

    return Response.json({ error: message }, { status: 500 });
  }
}
