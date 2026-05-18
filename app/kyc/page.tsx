import { KycWizardLoader } from "@/components/kyc/kyc-wizard-loader";

export const metadata = {
  title: "Video KYC | Customer",
  description: "8-step KYC flow with Azure Communication Services video verification",
};

export default function KycPage() {
  return <KycWizardLoader />;
}
