import { toNextJsHandler } from "better-auth/next-js";

import { auth } from "@/lib/auth";

// The Mongo driver needs TCP sockets, so this cannot run on the Edge runtime.
export const runtime = "nodejs";

export const { GET, POST } = toNextJsHandler(auth);
