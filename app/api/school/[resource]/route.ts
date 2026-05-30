import { NextResponse } from "next/server";
import {
  createResource,
  deleteResource,
  isSchoolResource,
  listResource,
  updateResource
} from "@/lib/school-db";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    resource: string;
  }>;
};

function errorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;

  return "Database request failed.";
}

export async function GET(_request: Request, context: RouteContext) {
  const { resource } = await context.params;

  if (!isSchoolResource(resource)) {
    return NextResponse.json({ message: "Unknown resource." }, { status: 404 });
  }

  try {
    return NextResponse.json(await listResource(resource));
  } catch (error) {
    return NextResponse.json({ message: errorMessage(error) }, { status: 500 });
  }
}

export async function POST(request: Request, context: RouteContext) {
  const { resource } = await context.params;

  if (!isSchoolResource(resource)) {
    return NextResponse.json({ message: "Unknown resource." }, { status: 404 });
  }

  const body = (await request.json().catch(() => null)) as { values?: Record<string, string> } | null;

  try {
    return NextResponse.json(await createResource(resource, body?.values ?? {}), { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: errorMessage(error) }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const { resource } = await context.params;
  const body = (await request.json().catch(() => null)) as { id?: string; values?: Record<string, string> } | null;

  if (!isSchoolResource(resource)) {
    return NextResponse.json({ message: "Unknown resource." }, { status: 404 });
  }

  if (!body?.id) {
    return NextResponse.json({ message: "id is required." }, { status: 400 });
  }

  try {
    return NextResponse.json(await updateResource(resource, body.id, body.values ?? {}));
  } catch (error) {
    return NextResponse.json({ message: errorMessage(error) }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const { resource } = await context.params;
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!isSchoolResource(resource)) {
    return NextResponse.json({ message: "Unknown resource." }, { status: 404 });
  }

  if (!id) {
    return NextResponse.json({ message: "id is required." }, { status: 400 });
  }

  try {
    return NextResponse.json(await deleteResource(resource, id));
  } catch (error) {
    return NextResponse.json({ message: errorMessage(error) }, { status: 500 });
  }
}
