import { NextResponse } from "next/server";
import { createRecord, getModulePrefix, listRecords } from "@/lib/db";

export const runtime = "nodejs";

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
    return NextResponse.json({
      records: await listRecords(moduleName)
    });
  } catch (error) {
    return NextResponse.json({ message: databaseErrorMessage(error) }, { status: 500 });
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
    return NextResponse.json({ message: "Module and name are required." }, { status: 400 });
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

    return NextResponse.json({ record }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: databaseErrorMessage(error) }, { status: 500 });
  }
}
