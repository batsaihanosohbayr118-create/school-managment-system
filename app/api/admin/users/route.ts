import { NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Role } from "@/lib/types";

export const runtime = "nodejs";

/**
 * Admin-only user provisioning API.
 *
 * Security model:
 *  - Requires the Supabase service-role key (server-only env var) to call the
 *    Supabase Admin API. Without it the endpoint reports 501 with guidance.
 *  - Every request must carry the caller's access token (Authorization: Bearer).
 *    The token is verified server-side and the caller's role must be "admin",
 *    so no non-admin can create, edit, delete, or reset accounts.
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const ROLES: Role[] = ["admin", "teacher", "student", "parent"];

function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as string[]).includes(value);
}

function getAdminClient(): SupabaseClient | null {
  if (!supabaseUrl || !serviceRoleKey) return null;
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}

function bearerToken(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  return header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
}

type Guarded = { admin: SupabaseClient } | { response: NextResponse };

async function requireAdmin(request: Request): Promise<Guarded> {
  const admin = getAdminClient();
  if (!admin) {
    return {
      response: NextResponse.json(
        {
          message:
            "User provisioning is not configured. Set SUPABASE_SERVICE_ROLE_KEY in the server environment to enable admin user management.",
          code: "not-configured"
        },
        { status: 501 }
      )
    };
  }

  const token = bearerToken(request);
  if (!token) {
    return { response: NextResponse.json({ message: "Missing authorization token." }, { status: 401 }) };
  }

  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) {
    return { response: NextResponse.json({ message: "Invalid session." }, { status: 401 }) };
  }
  if (!isRole(data.user.user_metadata?.role) || data.user.user_metadata.role !== "admin") {
    return { response: NextResponse.json({ message: "Admin access required." }, { status: 403 }) };
  }

  return { admin };
}

type ApiUser = {
  id: string;
  email: string;
  name: string;
  username: string;
  role: Role;
  createdAt: string;
};

function mapUser(user: {
  id: string;
  email?: string | null;
  created_at?: string;
  user_metadata?: Record<string, unknown> | null;
}): ApiUser {
  const metadata = user.user_metadata ?? {};
  return {
    id: user.id,
    email: user.email ?? "",
    name: typeof metadata.name === "string" ? metadata.name : "",
    username: typeof metadata.username === "string" ? metadata.username : "",
    role: isRole(metadata.role) ? metadata.role : "student",
    createdAt: user.created_at ?? ""
  };
}

export async function GET(request: Request) {
  const guard = await requireAdmin(request);
  if ("response" in guard) return guard.response;

  try {
    const { data, error } = await guard.admin.auth.admin.listUsers({ page: 1, perPage: 200 });
    if (error) throw error;
    const users = data.users.map(mapUser).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return NextResponse.json({ users });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Failed to list users." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const guard = await requireAdmin(request);
  if ("response" in guard) return guard.response;

  const body = (await request.json().catch(() => null)) as {
    email?: string;
    password?: string;
    name?: string;
    username?: string;
    role?: string;
  } | null;

  if (!body?.email || !body.password || !isRole(body.role)) {
    return NextResponse.json({ message: "email, password, and a valid role are required." }, { status: 400 });
  }

  try {
    const { data, error } = await guard.admin.auth.admin.createUser({
      email: body.email.trim(),
      password: body.password,
      email_confirm: true,
      user_metadata: { name: body.name?.trim() ?? "", username: body.username?.trim() ?? "", role: body.role }
    });
    if (error) throw error;
    return NextResponse.json({ user: mapUser(data.user) }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Failed to create user." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const guard = await requireAdmin(request);
  if ("response" in guard) return guard.response;

  const body = (await request.json().catch(() => null)) as {
    id?: string;
    email?: string;
    password?: string;
    name?: string;
    username?: string;
    role?: string;
  } | null;

  if (!body?.id) {
    return NextResponse.json({ message: "id is required." }, { status: 400 });
  }

  const attributes: {
    email?: string;
    password?: string;
    user_metadata?: Record<string, unknown>;
  } = {};

  if (typeof body.email === "string" && body.email.trim()) attributes.email = body.email.trim();
  if (typeof body.password === "string" && body.password.length > 0) attributes.password = body.password;

  const metadata: Record<string, unknown> = {};
  if (typeof body.name === "string") metadata.name = body.name.trim();
  if (typeof body.username === "string") metadata.username = body.username.trim();
  if (isRole(body.role)) metadata.role = body.role;
  if (Object.keys(metadata).length > 0) attributes.user_metadata = metadata;

  try {
    const { data, error } = await guard.admin.auth.admin.updateUserById(body.id, attributes);
    if (error) throw error;
    return NextResponse.json({ user: mapUser(data.user) });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Failed to update user." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const guard = await requireAdmin(request);
  if ("response" in guard) return guard.response;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ message: "id is required." }, { status: 400 });
  }

  try {
    const { error } = await guard.admin.auth.admin.deleteUser(id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Failed to delete user." }, { status: 500 });
  }
}
