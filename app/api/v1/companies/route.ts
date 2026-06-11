/**
 * GET /api/v1/companies
 *
 * Liste af firmær for det authenticerede tenant.
 * Kræver Bearer-token (oprettes under Indstillinger → API).
 *
 * Returnerer 401 hvis token mangler/ugyldig.
 * Returnerer 200 med JSON-array af firmaer ved succes.
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authenticateApiRequest } from "@/lib/api-auth";

export async function GET(req: Request) {
  const auth = await authenticateApiRequest(req, "read");
  if (!auth.ok) return auth.error;

  const url = new URL(req.url);
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "50"), 200);
  const cursor = url.searchParams.get("cursor") ?? undefined;

  const companies = await db.company.findMany({
    where: { tenantId: auth.tenantId, isActive: true },
    select: {
      id: true,
      name: true,
      orgNumber: true,
      email: true,
      phone: true,
      website: true,
      address: true,
      zipCode: true,
      city: true,
      country: true,
      createdAt: true,
      updatedAt: true,
    },
    take: limit + 1,
    cursor: cursor ? { id: cursor } : undefined,
    skip: cursor ? 1 : 0,
    orderBy: { name: "asc" },
  });

  const hasMore = companies.length > limit;
  const data = hasMore ? companies.slice(0, limit) : companies;
  const nextCursor = hasMore ? data[data.length - 1].id : null;

  return NextResponse.json({
    data,
    pagination: { limit, nextCursor, hasMore },
  });
}
