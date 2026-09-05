import "server-only";
import { ConfidentialClientApplication } from "@azure/msal-node";

let msalApp: ConfidentialClientApplication | null = null;
let cachedToken: { value: string; expiresAt: number } | null = null;

export function isGraphConfigured(): boolean {
  return Boolean(process.env.AZURE_TENANT_ID && process.env.AZURE_CLIENT_ID && process.env.AZURE_CLIENT_SECRET);
}

function getMsalApp(): ConfidentialClientApplication {
  if (!msalApp) {
    msalApp = new ConfidentialClientApplication({
      auth: {
        clientId: process.env.AZURE_CLIENT_ID!,
        authority: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}`,
        clientSecret: process.env.AZURE_CLIENT_SECRET!,
      },
    });
  }
  return msalApp;
}

/**
 * Application-permission (client-credentials) token — mail is sent as the fixed official mailbox,
 * not on behalf of whichever staff member is logged in. No per-user refresh token to manage.
 * Cached in-memory and re-acquired ~5 minutes before expiry.
 */
export async function getGraphAccessToken(): Promise<string> {
  if (!isGraphConfigured()) {
    throw new Error(
      "Microsoft Graph is not configured yet. Set AZURE_TENANT_ID, AZURE_CLIENT_ID, and AZURE_CLIENT_SECRET " +
        "once your Microsoft 365 admin has completed the Azure AD app registration (see the build plan)."
    );
  }
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt - 5 * 60 * 1000 > now) {
    return cachedToken.value;
  }
  const result = await getMsalApp().acquireTokenByClientCredential({
    scopes: ["https://graph.microsoft.com/.default"],
  });
  if (!result?.accessToken) throw new Error("Failed to acquire Microsoft Graph access token.");
  cachedToken = {
    value: result.accessToken,
    expiresAt: result.expiresOn ? result.expiresOn.getTime() : now + 55 * 60 * 1000,
  };
  return cachedToken.value;
}
