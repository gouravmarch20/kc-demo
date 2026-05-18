/** Generates a unique policy number for each KYC journey. */
export function generatePolicyNumber(): string {
  const year = new Date().getFullYear();
  const seq = Math.floor(100000 + Math.random() * 900000);
  return `MLI-${year}-${seq}`;
}
