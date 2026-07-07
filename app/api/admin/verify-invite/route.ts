import { NextResponse } from "next/server";

// Set ADMIN_INVITE_CODE in your .env.local (server-side only, never NEXT_PUBLIC_).
// Anyone registering with role "admin" must supply this code — this is what
// stops random visitors from granting themselves admin access.
export async function POST(req: Request) {
  const { code } = await req.json();

  const expected = process.env.ADMIN_INVITE_CODE;

  if (!expected) {
    return NextResponse.json(
      { valid: false, message: "ADMIN_INVITE_CODE тохируулаагүй байна (.env.local)." },
      { status: 500 }
    );
  }

  if (!code || code !== expected) {
    return NextResponse.json({ valid: false, message: "Admin код буруу байна." }, { status: 401 });
  }

  return NextResponse.json({ valid: true });
}