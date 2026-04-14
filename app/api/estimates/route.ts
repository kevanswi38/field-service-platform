import { EstimateStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import {
  isAdmin,
  isSales,
  isOperationsOrSupport,
  readForbiddenResponse,
  resolveServerUser,
} from "@/lib/serverUser";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/app/api/execution/validation";

const estimateStatusValues = Object.values(EstimateStatus);

export async function GET(request: NextRequest) {
  const auth = await resolveServerUser(request);
  if (!auth.ok) {
    return auth.response;
  }
  const serverUser = auth.data;

  if (
    !isAdmin(serverUser) &&
    !isSales(serverUser) &&
    !isOperationsOrSupport(serverUser)
  ) {
    return readForbiddenResponse();
  }

  const statusFilter = request.nextUrl.searchParams.get("status");
  if (statusFilter && !estimateStatusValues.includes(statusFilter as EstimateStatus)) {
    return jsonError('Query parameter "status" is invalid.', 400);
  }

  const estimates = await prisma.estimate.findMany({
    where: statusFilter ? { status: statusFilter as EstimateStatus } : undefined,
    orderBy: [{ updatedAt: "desc" }],
    select: {
      id: true,
      estimateNumber: true,
      title: true,
      description: true,
      status: true,
      total: true,
      sentAt: true,
      approvedAt: true,
      rejectedAt: true,
      expiresAt: true,
      leadId: true,
      customerId: true,
      walkthroughId: true,
      createdAt: true,
      updatedAt: true,
      lead: {
        select: {
          id: true,
          companyName: true,
          contactName: true,
          status: true,
        },
      },
      customer: {
        select: {
          id: true,
          name: true,
          customerNumber: true,
        },
      },
      walkthrough: {
        select: {
          id: true,
          title: true,
          status: true,
        },
      },
    },
  });

  return NextResponse.json({
    data: estimates,
    meta: {
      statuses: estimateStatusValues,
    },
  });
}
