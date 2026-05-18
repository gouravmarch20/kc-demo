import { authorizeRoomAccess } from "@/lib/kyc/room-auth";
import { ensureRoom, getRoom, getRoomOtpForAgent, setRoomOtp, updateRoom, verifyRoomOtp } from "@/lib/kyc/room-store";

type RouteContext = { params: Promise<{ roomId: string }> };

function requireRoomAuth(roomId: string, roomSecret?: string) {
  const room = getRoom(roomId) ?? ensureRoom(roomId);
  const auth = authorizeRoomAccess(room, roomSecret);
  if (!auth.ok) {
    return { error: Response.json({ error: auth.error }, { status: 403 }) };
  }
  return { room };
}

function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function POST(request: Request, context: RouteContext) {
  const { roomId } = await context.params;
  const body = (await request.json()) as {
    action: "send" | "verify";
    code?: string;
    role?: "customer" | "agent";
    roomSecret?: string;
  };

  const authResult = requireRoomAuth(roomId, body.roomSecret);
  if ("error" in authResult) {
    return authResult.error;
  }

  if (body.action === "send") {
    const code = generateOtp();
    setRoomOtp(roomId, code);
    updateRoom(roomId, { otpSent: true, otpVerified: false, assistedStage: "otp", step: 6 });

    return Response.json({
      ok: true,
      message: "OTP sent to registered mobile (demo: agent can view code)",
      ...(body.role === "agent" ? { demoOtp: code } : {}),
    });
  }

  if (body.action === "verify") {
    const valid = verifyRoomOtp(roomId, body.code ?? "");
    if (!valid) {
      return Response.json({ ok: false, error: "Invalid or expired OTP" }, { status: 400 });
    }

    updateRoom(roomId, { otpVerified: true, status: "completed" });
    return Response.json({ ok: true });
  }

  return Response.json({ error: "Unknown action" }, { status: 400 });
}

export async function GET(request: Request, context: RouteContext) {
  const { roomId } = await context.params;
  const roomSecret = new URL(request.url).searchParams.get("roomSecret") ?? undefined;
  const authResult = requireRoomAuth(roomId, roomSecret);
  if ("error" in authResult) {
    return authResult.error;
  }

  const code = getRoomOtpForAgent(roomId);
  if (!code) {
    return Response.json({ code: null });
  }
  return Response.json({ code });
}
