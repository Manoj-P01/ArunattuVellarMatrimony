import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

const isProd = process.env.NODE_ENV === "production";

export const createClient = (cookieStore: Awaited<ReturnType<typeof cookies>>, request?: Request) => {
  let bearerToken: string | null = null;
  if (request) {
    try {
      const authHeader = request.headers.get("Authorization");
      if (authHeader?.startsWith("Bearer ")) {
        bearerToken = authHeader.substring(7);
      }
    } catch (e) {
      // Ignore request header parsing issues
    }
  }

  const client = createServerClient(
    supabaseUrl!,
    supabaseKey!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, {
                ...options,
                sameSite: isProd ? "none" : "lax",
                secure: isProd,
              });
            });
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
      cookieOptions: {
        sameSite: isProd ? "none" : "lax",
        secure: isProd,
      },
      global: bearerToken
        ? {
            headers: {
              Authorization: `Bearer ${bearerToken}`,
            },
          }
        : undefined,
    },
  );

  // Override auth.getUser to support Authorization Bearer token header
  const originalGetUser = client.auth.getUser.bind(client.auth);
  client.auth.getUser = async (token?: string) => {
    let resolvedToken = token || bearerToken;
    if (!resolvedToken) {
      try {
        const headersList = await headers();
        const authHeader = headersList.get("Authorization");
        resolvedToken = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null;
      } catch (e) {
        // In some contexts headers() might not be available
      }
    }
    if (resolvedToken) {
      try {
        await client.auth.setSession({ access_token: resolvedToken, refresh_token: "" });
      } catch (e) {
        // Ignore setSession failures in edge cases
      }
      return originalGetUser(resolvedToken);
    }
    return originalGetUser();
  };

  return client;
};