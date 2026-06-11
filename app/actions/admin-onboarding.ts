"use server";

/**
 * CRM-X — Tenant-onboarding server actions
 *
 * Bruges af onboarding-wizard'en i /admin/tenants/new.
 * Bygger tenant + admin-user + invite-token + sender velkomstmail
 * i én atomic transaktion (så vidt det er muligt).
 */

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { z } from "zod";
import crypto from "node:crypto";
import { calculateTrialEnd, PLANS, type PlanSlug, type Currency } from "@/lib/plans";
import { sendInviteMail } from "@/lib/invite-mail";

const slugRegex = /^[a-z0-9](?:[a-z0-9-]{0,40}[a-z0-9])?$/;

const onboardingSchema = z.object({
  name: z.string().min(2).max(120),
  slug: z.string().regex(slugRegex),
  cvr: z.string().max(8).nullable(),
  industry: z.string().nullable(),
  country: z.string().default("DK"),
  address: z.string().nullable(),
  zipCode: z.string().nullable(),
  city: z.string().nullable(),
  website: z.string().nullable(),
  employeeCount: z.string().nullable(),
  adminName: z.string().min(2).max(120),
  adminEmail: z.string().email().max(254),
  adminPhone: z.string().nullable(),
  adminTitle: z.string().nullable(),
  plan: z.enum(["small", "medium", "large"]),
  modules: z.array(z.string()).min(1),
  maxUsers: z.number().int().min(1).max(500),
  startWithTrial: z.boolean(),
  billingCurrency: z.enum(["USD", "DKK"]),
  logoUrl: z.string().nullable(),
  accentColor: z.string().nullable(),
  welcomeMessage: z.string().max(280).nullable(),
  sendInviteNow: z.boolean(),
});

export type OnboardingInput = z.infer<typeof onboardingSchema>;

interface OnboardingResult {
  ok: boolean;
  tenantId?: string;
  inviteSent?: boolean;
  error?: string;
}

/**
 * Generér klartekst-token + SHA-256 hash.
 * Klartekst returneres KUN her — gemmes ikke.
 */
function generateInviteToken(): { token: string; hash: string } {
  const token = crypto.randomBytes(32).toString("base64url");
  const hash = crypto.createHash("sha256").update(token).digest("hex");
  return { token, hash };
}

export async function createTenantFromWizard(
  input: OnboardingInput
): Promise<OnboardingResult> {
  const session = await auth();
  if (session?.user?.role !== "super_admin") {
    return { ok: false, error: "Kun super admins kan onboarde nye kunder" };
  }

  const parsed = onboardingSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
    };
  }

  const data = parsed.data;

  // Tjek for slug-collision
  const existing = await db.tenant.findUnique({ where: { slug: data.slug } });
  if (existing) {
    return { ok: false, error: `Subdomain "${data.slug}" er allerede taget` };
  }

  // Status-flow afgøres af trial-valg
  const now = new Date();
  const status = data.startWithTrial ? "trial" : "active";
  const billingStatus = data.startWithTrial ? "trial" : "manual";
  const trialEndsAt = data.startWithTrial ? calculateTrialEnd(now) : null;

  try {
    // Vi bruger en transaktion så ved fejl bliver tenant/role/user/invite alle rullet tilbage
    const result = await db.$transaction(async (tx) => {
      // 1. Opret tenant
      const tenant = await tx.tenant.create({
        data: {
          name: data.name,
          slug: data.slug,
          modules: data.modules,
          plan: data.plan,
          maxUsers: data.maxUsers,
          status,
          isActive: true,
          trialEndsAt,
          billingStatus,
          billingCurrency: data.billingCurrency,
          cvr: data.cvr,
          industry: data.industry,
          country: data.country,
          address: data.address,
          zipCode: data.zipCode,
          city: data.city,
          website: data.website,
          employeeCount: data.employeeCount,
          adminName: data.adminName,
          adminEmail: data.adminEmail,
          adminPhone: data.adminPhone,
          adminTitle: data.adminTitle,
          logoUrl: data.logoUrl,
          accentColor: data.accentColor,
          welcomeMessage: data.welcomeMessage,
        } as any,
      });

      // 2. Opret 3 standard-roller
      await tx.role.createMany({
        data: [
          {
            tenantId: tenant.id,
            name: "Admin",
            isSystem: true,
            permissions: {
              sales: { view: true, create: true, edit: true, delete: true },
              marketing: { view: true, create: true, edit: true, delete: true },
              support: { view: true, create: true, edit: true, delete: true },
              projects: { view: true, create: true, edit: true, delete: true },
              products: { view: true, create: true, edit: true, delete: true },
              licenses: { view: true, create: true, edit: true, delete: true },
            },
          },
          {
            tenantId: tenant.id,
            name: "Konsulent",
            isSystem: true,
            permissions: {
              sales: { view: true },
              support: { view: true, create: true, edit: true },
              projects: { view: true, edit: true },
              products: { view: true },
              licenses: { view: true },
            },
          },
          {
            tenantId: tenant.id,
            name: "Læs",
            isSystem: false,
            permissions: {
              sales: { view: true },
              support: { view: true },
              projects: { view: true },
              products: { view: true },
              licenses: { view: true },
            },
          },
        ],
      });

      // 3. Find Admin-rolle for at sætte den på invite
      const adminRole = await tx.role.findFirst({
        where: { tenantId: tenant.id, name: "Admin" },
        select: { id: true },
      });

      // 4. Hvis vi sender invite nu, opret token. Ellers skipper vi (admin sender selv senere)
      let inviteToken: string | null = null;
      if (data.sendInviteNow) {
        const { token, hash } = generateInviteToken();
        const expiresAt = new Date(now.getTime() + 7 * 86400_000); // 7 dage
        await tx.userInvite.create({
          data: {
            tenantId: tenant.id,
            tokenHash: hash,
            email: data.adminEmail,
            name: data.adminName,
            roleId: adminRole?.id ?? null,
            inviteTone: PLANS[data.plan as PlanSlug].inviteTone,
            status: "pending",
            expiresAt,
            invitedBySuperAdminId: session.user.id ?? null,
          },
        });
        inviteToken = token;
      }

      return { tenant, inviteToken };
    });

    // 5. Send invite-mail (uden for transaktion — netværks-IO)
    let inviteSent = false;
    if (data.sendInviteNow && result.inviteToken) {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
      const inviteUrl = `${baseUrl}/accept-invite?token=${encodeURIComponent(result.inviteToken)}`;
      const firstName = data.adminName.split(" ")[0] || data.adminName;
      const mailRes = await sendInviteMail(data.adminEmail, {
        recipientName: data.adminName,
        recipientFirstName: firstName,
        recipientTitle: data.adminTitle,
        tenantName: data.name,
        tenantSlug: data.slug,
        inviteUrl,
        expiresInDays: 7,
        plan: data.plan as PlanSlug,
        fromEmail: process.env.RESEND_FROM_EMAIL,
      });
      inviteSent = mailRes.ok;
      if (!mailRes.ok) {
        console.error("[onboarding] Invite-mail send fejlede:", mailRes.error);
      }
    }

    // 6. Audit-event
    await audit({
      action: "tenant_create",
      resourceType: "tenant",
      resourceId: result.tenant.id,
      tenantIdOverride: result.tenant.id,
      after: {
        slug: result.tenant.slug,
        plan: data.plan,
        modules: data.modules,
        maxUsers: data.maxUsers,
        trial: data.startWithTrial,
        inviteSent,
      },
      message: `Tenant "${data.name}" onboarded via wizard. Plan: ${data.plan}. ${
        data.startWithTrial ? "14d trial." : "Direkte aktiv."
      } ${inviteSent ? "Invite sendt." : "Manuel onboarding."}`,
    });

    return { ok: true, tenantId: result.tenant.id, inviteSent };
  } catch (e: any) {
    console.error("[onboarding] Failed:", e);
    return { ok: false, error: e?.message ?? "Uventet fejl under tenant-oprettelse" };
  }
}

/**
 * Tjekker om en slug er ledig — bruges af onboarding-wizard'en
 * til live-validering inden brugeren rammer "Opret".
 */
export async function checkSlugAvailability(slug: string): Promise<boolean> {
  if (!slug || !slugRegex.test(slug)) return false;
  const existing = await db.tenant.findUnique({ where: { slug } });
  return existing === null;
}
