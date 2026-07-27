import { NextResponse } from "next/server";
import { createRecord, getModulePrefix, listRecords } from "@/lib/db";
import { preflight, withCors } from "@/lib/cors";

export const runtime = "nodejs";

const METHODS = ["GET", "POST"];

export const OPTIONS = preflight(METHODS);

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function databaseErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;

  return "PostgreSQL connection failed. Check DATABASE_URL and make sure PostgreSQL is running.";
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const moduleName = clean(searchParams.get("module")) || "School Overview";

  try {
    return withCors(
      NextResponse.json({
        records: await listRecords(moduleName)
      }),
      request,
      METHODS
    );
  } catch (error) {
    return withCors(
      NextResponse.json({ message: databaseErrorMessage(error) }, { status: 500 }),
      request,
      METHODS
    );
  }
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const moduleName = clean(body?.module);
  const name = clean(body?.name);
  const owner = clean(body?.owner) || "Admin";
  const status = clean(body?.status) || "Open";
  const amount = clean(body?.amount) || "-";

  if (!moduleName || !name) {
    return withCors(NextResponse.json({ message: "Module and name are required." }, { status: 400 }), request, METHODS);
  }

  const prefix = getModulePrefix(moduleName);

  try {
    const record = await createRecord({
      id: `${prefix}-${Date.now().toString().slice(-6)}`,
      module: moduleName,
      name,
      owner,
      status,
      amount
    });

    return withCors(NextResponse.json({ record }, { status: 201 }), request, METHODS);
  } catch (error) {
    return withCors(
      NextResponse.json({ message: databaseErrorMessage(error) }, { status: 500 }),
      request,
      METHODS
    );
  }
}
