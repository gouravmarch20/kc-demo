import type { KycRoomState } from "@/lib/kyc/types";

export function sanitizeRoomState(state: KycRoomState): KycRoomState {
  const { roomSecret: _secret, ...publicState } = state;
  return publicState;
}

export function authorizeRoomAccess(
  room: KycRoomState,
  providedSecret: string | undefined,
): { ok: true } | { ok: false; error: string } {
  if (!room.roomSecret) {
    return { ok: true };
  }
  if (!providedSecret || providedSecret !== room.roomSecret) {
    return { ok: false, error: "Invalid or missing room secret" };
  }
  return { ok: true };
}
