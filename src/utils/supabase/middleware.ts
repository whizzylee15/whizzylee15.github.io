import { createServerClient } from "@supabase/ssr";
import { type Request, type Response, type NextFunction } from "express";

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

export const supabaseMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const supabase = createServerClient(
    supabaseUrl!,
    supabaseKey!,
    {
      cookies: {
        getAll() {
          return Object.entries(req.cookies || {}).map(([name, value]) => ({ name, value: value as string }));
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            res.cookie(name, value, {
              ...options,
              sameSite: 'none',
              secure: true,
            });
          });
        },
      },
    },
  );

  // This will refresh the session if it's expired
  await supabase.auth.getUser();

  next();
};
