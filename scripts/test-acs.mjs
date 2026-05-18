import { config } from "dotenv";
import { resolve } from "node:path";
import { CommunicationIdentityClient } from "@azure/communication-identity";

config({ path: resolve(process.cwd(), ".env.local") });

const connectionString = process.env.AZURE_COMMUNICATION_CONNECTION_STRING;

if (!connectionString) {
  console.error("FAIL: AZURE_COMMUNICATION_CONNECTION_STRING is missing in .env.local");
  process.exit(1);
}

try {
  const client = new CommunicationIdentityClient(connectionString);
  const user = await client.createUser();
  const token = await client.getToken(user, ["voip"]);
  console.log("OK: ACS connection works");
  console.log("userId:", user.communicationUserId);
  console.log("token expires:", token.expiresOn);
} catch (err) {
  console.error("FAIL:", err.message ?? err);
  process.exit(1);
}
