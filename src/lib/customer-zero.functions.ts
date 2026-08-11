import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Cosmetic gate state for the shell. Enforcement stays server-side per mutation. */
export const getCustomerZeroState = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { customerZeroState } = await import("@/lib/customer-zero.server");
    return customerZeroState(context.userId);
  });
