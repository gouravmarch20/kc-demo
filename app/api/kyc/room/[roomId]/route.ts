import { authorizeRoomAccess, sanitizeRoomState } from "@/lib/kyc/room-auth";
import { ensureRoom, getRoom, updateRoom } from "@/lib/kyc/room-store";
import type { KycRoomState } from "@/lib/kyc/types";

type RouteContext = { params: Promise<{ roomId: string }> };

type PatchBody = Partial<KycRoomState> & {
  roomSecret?: string;
  initialize?: boolean;
};

export async function GET(_request: Request, context: RouteContext) {
  const { roomId } = await context.params;
  const room = getRoom(roomId) ?? ensureRoom(roomId);
  return Response.json(sanitizeRoomState(room));
}

export async function PATCH(request: Request, context: RouteContext) {
  const { roomId } = await context.params;
  const body = (await request.json()) as PatchBody;
  const { roomSecret, initialize, ...patch } = body;

  const existing = getRoom(roomId);
  const wasNew = !existing;
  const room = existing ?? ensureRoom(roomId);

  // Customer bootstrap may reuse a persisted roomId; allow re-init without the old secret.
  if (!wasNew && !initialize) {
    const auth = authorizeRoomAccess(room, roomSecret);
    if (!auth.ok) {
      return Response.json({ error: auth.error }, { status: 403 });
    }
  }

  const updated = updateRoom(roomId, patch);
  const response: KycRoomState & { roomSecret?: string } = sanitizeRoomState(updated);

  if (wasNew || initialize) {
    response.roomSecret = updated.roomSecret;
  }

  return Response.json(response);
}
