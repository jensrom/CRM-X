/**
 * Email — unified facade.
 *
 * En enkelt sendMail() der tager opts + en preference: "system" (Resend)
 * eller "user" (brugerens egen OAuth-koblede mailbox).
 *
 * Alt logges til EmailLog uanset provider, saa man har et komplet audit-spor.
 */

import { db } from "@/lib/db";
import { sendMailViaResend } from "./resend";
import { sendMailViaMicrosoft } from "./microsoft";
import { sendMailViaGoogle } from "./google";
import type { SendMailOpts, SendMailResult } from "./types";

export * from "./types";

interface SendOptions extends SendMailOpts {
  /** Hvem afsender: system-mail (Resend) eller brugerens egen mailbox */
  via: "system" | "user";
  tenantId: string;
  /** Naar via="user" skal vi vide hvem der sender */
  userId?: string;
}

/**
 * Send en mail. Vaelger korrekt provider ud fra opts.via og bruger-konfiguration.
 * Logger ALTID til EmailLog — ogsaa ved fejl.
 */
export async function sendMail(opts: SendOptions): Promise<SendMailResult> {
  const { via, tenantId, userId, ...mailOpts } = opts;

  let result: SendMailResult;

  if (via === "system") {
    result = await sendMailViaResend(tenantId, mailOpts);
  } else {
    if (!userId) {
      result = {
        success: false,
        provider: "resend",
        fromAddress: "",
        error: "userId paakraevet for via='user'",
      };
    } else {
      // Find brugerens provider
      const user = await db.user.findFirst({
        where: { id: userId },
        select: { emailProvider: true },
      });
      if (!user?.emailProvider) {
        result = {
          success: false,
          provider: "resend",
          fromAddress: "",
          error: "Brugeren har ikke en koblet mailbox — falder ikke automatisk tilbage til system-mail",
        };
      } else if (user.emailProvider === "microsoft") {
        result = await sendMailViaMicrosoft(userId, mailOpts);
      } else if (user.emailProvider === "google") {
        result = await sendMailViaGoogle(userId, mailOpts);
      } else {
        result = {
          success: false,
          provider: "resend",
          fromAddress: "",
          error: `Ukendt email-provider: ${user.emailProvider}`,
        };
      }
    }
  }

  // Log uanset succes/fejl
  try {
    await db.emailLog.create({
      data: {
        tenantId,
        userId: userId ?? null,
        provider: result.provider,
        status: result.success ? "sent" : "failed",
        fromAddress: result.fromAddress,
        toAddresses:  Array.isArray(mailOpts.to)  ? mailOpts.to  : [mailOpts.to],
        ccAddresses:  mailOpts.cc  ? (Array.isArray(mailOpts.cc)  ? mailOpts.cc  : [mailOpts.cc])  : [],
        bccAddresses: mailOpts.bcc ? (Array.isArray(mailOpts.bcc) ? mailOpts.bcc : [mailOpts.bcc]) : [],
        subject: mailOpts.subject,
        bodyHtml: mailOpts.html,
        bodyText: mailOpts.text ?? null,
        providerMessageId: result.messageId ?? null,
        resourceType: mailOpts.resourceType ?? null,
        resourceId:   mailOpts.resourceId ?? null,
        errorMessage: result.error ?? null,
        failedAt: result.success ? null : new Date(),
      },
    });
  } catch (logErr) {
    console.error("[email] kunne ikke skrive EmailLog:", logErr);
  }

  return result;
}
