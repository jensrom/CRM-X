import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "./db";
import { z } from "zod";
import { headers } from "next/headers";
import { rateLimit, LIMITS } from "./rate-limit";

/**
 * Inline audit-skrivning til brug i NextAuth's authorize-callback.
 * Vi kalder IKKE lib/audit's `audit()` helper her fordi:
 *   1. Cirkulær import (audit → auth → audit) skaber edge cases
 *   2. Helperen kalder selv auth() i nogle stier — re-entrance i samme callback
 * Inline-skrivning er forudsigelig og fanger sine egne fejl.
 */
async function auditLogin(event: {
  action: "login_success" | "login_failed" | "logout";
  outcome?: "success" | "failure" | "denied";
  actorId?: string | null;
  actorEmail?: string | null;
  tenantId?: string | null;
  message?: string;
}): Promise<void> {
  try {
    let ipAddress: string | null = null;
    let userAgent: string | null = null;
    try {
      const h = await headers();
      const xff = h.get("x-forwarded-for");
      ipAddress = xff?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? null;
      userAgent = h.get("user-agent");
    } catch {
      /* udenfor request — ok */
    }
    await db.auditLog.create({
      data: {
        action: event.action,
        resourceType: "session",
        outcome: event.outcome ?? "success",
        actorId: event.actorId ?? null,
        actorEmail: event.actorEmail ?? null,
        tenantId: event.tenantId ?? null,
        ipAddress,
        userAgent,
        message: event.message ?? null,
      },
    });
  } catch (err) {
    // Logges, men må aldrig blokere login-flowet
    console.error("[auth.auditLogin] Failed to write audit row:", err);
  }
}

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  tenantSlug: z.string().optional(), // Undefined = super admin login
  mfaCode: z.string().optional(),    // Påkrævet hvis bruger har MFA aktiveret
});

/**
 * Henter klient-IP og user-agent fra request-headers.
 * Fungerer udelukkende i request-kontekst.
 */
async function getRequestContext(): Promise<{ ip: string | null; ua: string | null }> {
  try {
    const h = await headers();
    const xff = h.get("x-forwarded-for");
    const ip = xff?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? null;
    const ua = h.get("user-agent");
    return { ip, ua };
  } catch {
    return { ip: null, ua: null };
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Adgangskode", type: "password" },
        tenantSlug: { label: "Tenant", type: "text" },
        mfaCode: { label: "MFA-kode", type: "text" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) {
          await auditLogin({
            action: "login_failed",
            outcome: "failure",
            message: "Invalid input shape",
          });
          return null;
        }

        const { email, password, tenantSlug, mfaCode } = parsed.data;
        const { ip } = await getRequestContext();

        // --- Rate-limiting (per IP + per email) ---
        // To buckets så én angriber ikke kan låse en konkret brugers konto ude blot
        // ved at lave failed logins fra samme IP mod forskellige emails.
        const ipKey = `login-ip:${ip ?? "unknown"}`;
        const emailKey = `login-email:${email.toLowerCase()}`;
        const ipRL = rateLimit(ipKey, LIMITS.login.limit * 4, LIMITS.login.windowMs);
        const emailRL = rateLimit(emailKey, LIMITS.login.limit, LIMITS.login.windowMs);

        if (!ipRL.ok || !emailRL.ok) {
          await auditLogin({
            action: "login_failed",
            actorEmail: email,
            outcome: "denied",
            message: `Rate limit exceeded. IP retry: ${ipRL.retryAfterSeconds ?? 0}s, email retry: ${emailRL.retryAfterSeconds ?? 0}s`,
          });
          return null;
        }

        // --- Super Admin login ---
        if (!tenantSlug || tenantSlug === "admin") {
          const admin = await db.superAdmin.findUnique({ where: { email } });
          if (!admin) {
            await auditLogin({
              action: "login_failed",
              actorEmail: email,
              outcome: "failure",
              message: "Super admin not found",
            });
            return null;
          }

          const valid = await bcrypt.compare(password, admin.password);
          if (!valid) {
            await auditLogin({
              action: "login_failed",
              actorId: admin.id,
              actorEmail: email,
              outcome: "failure",
              message: "Bad password (super admin)",
            });
            return null;
          }

          await auditLogin({
            action: "login_success",
            actorId: admin.id,
            actorEmail: email,
            message: "Super admin login",
          });

          return {
            id: admin.id,
            email: admin.email,
            name: admin.name,
            role: "super_admin",
            tenantId: null,
          };
        }

        // --- Tenant bruger login ---
        const tenant = await db.tenant.findUnique({
          where: { slug: tenantSlug, isActive: true },
        });
        if (!tenant) {
          await auditLogin({
            action: "login_failed",
            actorEmail: email,
            outcome: "failure",
            message: `Tenant '${tenantSlug}' not found or inactive`,
          });
          return null;
        }

        const user = await db.user.findUnique({
          where: { tenantId_email: { tenantId: tenant.id, email } },
          include: { role: true },
        });
        if (!user || !user.isActive) {
          await auditLogin({
            action: "login_failed",
            actorEmail: email,
            tenantId: tenant.id,
            outcome: "failure",
            message: user ? "User inactive" : "User not found",
          });
          return null;
        }

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) {
          await auditLogin({
            action: "login_failed",
            actorId: user.id,
            actorEmail: email,
            tenantId: tenant.id,
            outcome: "failure",
            message: "Bad password",
          });
          return null;
        }

        // --- MFA-tjek hvis aktiveret ---
        // mfaEnabled/mfaSecret findes på User-modellen efter db push.
        // Indtil migration er kørt, vil disse felter være undefined og MFA er reelt no-op.
        const mfaEnabled = (user as any).mfaEnabled === true;
        if (mfaEnabled) {
          if (!mfaCode) {
            await auditLogin({
              action: "login_failed",
              actorId: user.id,
              actorEmail: email,
              tenantId: tenant.id,
              outcome: "denied",
              message: "MFA code required but not provided",
            });
            // Special-marker: vi smider null så NextAuth fortæller frontend at logge ind igen.
            // Login-UI'en skal vise MFA-felt baseret på et separat probe-endpoint.
            return null;
          }

          const { verifyTotp } = await import("./mfa");
          const ok = verifyTotp((user as any).mfaSecret as string, mfaCode);
          if (!ok) {
            await auditLogin({
              action: "login_failed",
              actorId: user.id,
              actorEmail: email,
              tenantId: tenant.id,
              outcome: "failure",
              message: "Bad MFA code",
            });
            return null;
          }
        }

        // Opdater lastLogin — fejl her må ikke blokere login
        try {
          await db.user.update({
            where: { id: user.id },
            data: { lastLogin: new Date() },
          });
        } catch {
          // Ignorer — lastLogin er ikke kritisk for login-flow
        }

        await auditLogin({
          action: "login_success",
          actorId: user.id,
          actorEmail: email,
          tenantId: tenant.id,
          message: mfaEnabled ? "Login with MFA" : "Login (no MFA)",
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role?.name ?? "user",
          tenantId: tenant.id,
          tenantSlug: tenant.slug,
          permissions: user.role?.permissions ?? {},
          modules: tenant.modules,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
        token.tenantId = (user as any).tenantId;
        token.tenantSlug = (user as any).tenantSlug;
        token.permissions = (user as any).permissions;
        token.modules = (user as any).modules;
      }
      return token;
    },
    session({ session, token }) {
      return {
        ...session,
        user: {
          ...session.user,
          id: token.sub!,
          role: token.role as string,
          tenantId: token.tenantId as string | null,
          tenantSlug: token.tenantSlug as string | undefined,
          permissions: token.permissions as Record<string, any>,
          modules: token.modules as string[],
        },
      };
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  /**
   * Session-strategi — strammere end før:
   *   - maxAge: 8 timer absolut max (ISO 27001 A.5.17, SOC 2 CC6.1)
   *   - updateAge: 30 min — token refreshes hvert 30. min af aktivitet,
   *     hvilket effektivt giver idle-timeout efter 30 min uden aktivitet
   *     (token-cookie udløber så).
   *
   *   Brugere kan altid logge ind igen. Konsulenthus-data er high-value,
   *   så 30 dage var for løst.
   */
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60,
    updateAge: 30 * 60,
  },
});

// Type augmentation for NextAuth session
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      role: string;
      tenantId: string | null;
      tenantSlug?: string;
      permissions: Record<string, Record<string, boolean>>;
      modules: string[];
    };
  }
}
