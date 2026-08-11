import { redirect } from "next/navigation";

import { getViewer } from "@/lib/dashboard-data";
import { customers, subscriptionForUser } from "@/lib/paddle/mirror";
import { paddle } from "@/lib/paddle/server";

/**
 * Sends the signed-in customer to Paddle's own billing portal, where they can
 * change their card, see invoices, and cancel.
 *
 * The customer id is resolved from the session here, on the server. Nothing
 * the browser sends is trusted — a client-supplied `ctm_...` would be an
 * invitation to read someone else's invoices.
 *
 * A GET is fine because this is a navigation with no side effect on us: the
 * session it mints is Paddle's, short-lived, and single-customer.
 */
export async function GET(): Promise<Response> {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");

  const customer = await customers().findOne({ userId: viewer.id });
  if (!customer) {
    // Never bought anything, so there is no portal to show them.
    redirect("/pricing");
  }

  const subscription = await subscriptionForUser(viewer.id);

  const session = await paddle().customerPortalSessions.create(
    customer._id,
    // Naming the subscription gets deep links to cancel/update inside the
    // portal payload; without it the customer lands on the overview.
    subscription ? [subscription._id] : [],
  );

  redirect(session.urls.general.overview);
}
