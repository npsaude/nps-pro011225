declare module "https://deno.land/std@0.190.0/http/server.ts" {
  export function serve(
    handler: (req: Request) => Response | Promise<Response>,
  ): void;
}

declare module "https://esm.sh/@supabase/supabase-js@2.45.0" {
  // Minimal typing to satisfy TS in this repo (runtime is Deno/Edge).
  export const createClient: any;
}

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};