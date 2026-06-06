declare module "https://deno.land/std@0.190.0/http/server.ts" {
  export function serve(
    handler: (req: Request) => Response | Promise<Response>,
  ): void;
}

declare module "https://esm.sh/@supabase/supabase-js@2.45.0" {
  // Shim ambiente deliberadamente solto: o client do Supabase no runtime
  // Deno/Edge não é tipado aqui (só serve para o TS resolver o import).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const createClient: any;
}

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};