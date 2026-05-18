import { Suspense } from "react";
import { AgentPortal } from "@/components/kyc/agent-portal";

export const metadata = {
  title: "Video KYC | Agent",
  description: "Agent portal to join Azure Communication Services verification calls",
};

export default function KycAgentPage() {
  return (
    <Suspense fallback={<p className="p-12 text-center text-zinc-500">Loading agent portal…</p>}>
      <AgentPortal />
    </Suspense>
  );
}
