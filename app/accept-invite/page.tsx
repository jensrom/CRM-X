import { validateInviteToken } from "@/app/actions/invite";
import { AcceptInviteForm } from "@/components/admin/onboarding/AcceptInviteForm";
import { ShieldCheck, AlertCircle } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "Aktivér din konto — CRM-X",
};

export default async function AcceptInvitePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token) {
    return <InvalidView message="Manglende invite-token i URL'en" />;
  }

  const info = await validateInviteToken(token);

  if (!info.ok) {
    return <InvalidView message={info.error ?? "Ugyldigt invite"} />;
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-block w-12 h-12 rounded-2xl bg-primary text-primary-foreground font-bold text-lg flex items-center justify-center mb-3">
            CX
          </div>
          <h1 className="text-2xl font-bold mb-1">Velkommen til CRM-X 🌱</h1>
          <p className="text-sm text-muted-foreground">
            Du er inviteret til <strong className="text-foreground">{info.tenantName}</strong>
          </p>
        </div>

        <div className="bg-card border border-border rounded-2xl shadow-sm p-6">
          <AcceptInviteForm
            token={token}
            email={info.email!}
            defaultName={info.name ?? ""}
            tenantSlug={info.tenantSlug!}
          />
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          CRM-X · Drevet af{" "}
          <Link href="https://plesnertech.dk" className="hover:text-foreground underline">
            Plesner Tech
          </Link>
        </p>
      </div>
    </div>
  );
}

function InvalidView({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md text-center">
        <div className="inline-flex w-14 h-14 rounded-2xl bg-destructive/10 items-center justify-center mb-4">
          <AlertCircle className="h-7 w-7 text-destructive" />
        </div>
        <h1 className="text-xl font-bold mb-2">Linket virker ikke</h1>
        <p className="text-sm text-muted-foreground mb-6">{message}</p>
        <p className="text-xs text-muted-foreground">
          Kontakt din tenant-admin og bed om et nyt invite-link.
        </p>
      </div>
    </div>
  );
}
