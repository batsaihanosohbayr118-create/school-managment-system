import { NextResponse } from "next/server";
import {
  createResource,
  deleteResource,
  isSchoolResource,
  listResource,
  updateResource,
  type SchoolRequestContext
} from "@/lib/school-db";
import { resolveRequestSession } from "@/lib/school-session-server";

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

function errorStatus(error: unknown) {
  const message = errorMessage(error).toLowerCase();

  if (message.includes("unauthorized")) return 401;
  if (message.includes("permission") || message.includes("not allowed")) return 403;
  if (message.includes("required") || message.includes("invalid")) return 400;

  return 500;
}

async function requestContext(request: Request): Promise<SchoolRequestContext | null> {
  const session = await resolveRequestSession(request);
  if (!session) return null;

  const { searchParams } = new URL(request.url);

  return {
    session,
    mode: searchParams.get("mode") === "page" ? "page" : "summary",
    subjectId: searchParams.get("subjectId")
  };
}

export async function GET(_request: Request, context: RouteContext) {
  const { resource } = await context.params;

  if (!isSchoolResource(resource)) {
    return NextResponse.json({ message: "Unknown resource." }, { status: 404 });
  }

  try {
    const resolved = await requestContext(_request);
    if (!resolved) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    return NextResponse.json(await listResource(resource, resolved));
  } catch (error) {
    return NextResponse.json({ message: errorMessage(error) }, { status: errorStatus(error) });
  }
}

export async function POST(request: Request, context: RouteContext) {
  const { resource } = await context.params;

  if (!isSchoolResource(resource)) {
    return NextResponse.json({ message: "Unknown resource." }, { status: 404 });
  }

  const body = (await request.json().catch(() => null)) as { values?: Record<string, string> } | null;

  try {
    const resolved = await requestContext(request);
    if (!resolved) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    return NextResponse.json(await createResource(resource, body?.values ?? {}, resolved), { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: errorMessage(error) }, { status: errorStatus(error) });
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
    const resolved = await requestContext(request);
    if (!resolved) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    return NextResponse.json(await updateResource(resource, body.id, body.values ?? {}, resolved));
  } catch (error) {
    return NextResponse.json({ message: errorMessage(error) }, { status: errorStatus(error) });
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
    const resolved = await requestContext(request);
    if (!resolved) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    return NextResponse.json(await deleteResource(resource, id, resolved));
  } catch (error) {
    return NextResponse.json({ message: errorMessage(error) }, { status: errorStatus(error) });
  }
}
