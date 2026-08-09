import { createAuthClient } from "better-auth/react";

// No baseURL: the client defaults to the current origin, which keeps preview
// deployments working without a per-environment public env var.
export const authClient = createAuthClient();

export const { signIn, signOut, useSession } = authClient;
