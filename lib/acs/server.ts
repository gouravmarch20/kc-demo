import { CommunicationIdentityClient } from "@azure/communication-identity";

export function isAcsConfigured(): boolean {
  return Boolean(process.env.AZURE_COMMUNICATION_CONNECTION_STRING);
}

export async function createAcsUserToken() {
  const connectionString = process.env.AZURE_COMMUNICATION_CONNECTION_STRING;

  if (!connectionString) {
    throw new Error("AZURE_COMMUNICATION_CONNECTION_STRING is not set");
  }

  const identityClient = new CommunicationIdentityClient(connectionString);
  const user = await identityClient.createUser();
  const tokenResponse = await identityClient.getToken(user, ["voip"]);

  return {
    userId: user.communicationUserId,
    token: tokenResponse.token,
    expiresOn: tokenResponse.expiresOn,
  };
}
