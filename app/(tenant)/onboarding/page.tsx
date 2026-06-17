import Link from "next/link";
import { Sparkles, Users, FileSignature, TrendingUp, Bell, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProgressStrip } from "@/components/onboarding/ProgressStrip";

export default function WelcomePage() {
  return (
    <div>
      <ProgressStrip current="welcome" />

      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-emerald-500 mb-5">
          <Sparkles className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold mb-3">Lad os få dig i gang</h1>
        <p className="text-base text-muted-foreground max-w-xl mx-auto">
          Vi guider dig gennem fire korte trin der får CRM-X til at føles som dit eget system.
          Du kan altid springe over og vende tilbage senere via indstillinger.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
        <FeatureCard
          icon={Users}
          title="Firma-stamdata"
          description="CVR, adresse, branche — bruges på fakturaer og rapporter."
        />
        <FeatureCard
          icon={FileSignature}
          title="Branding & faktura-afsender"
          description="Logo, accent-farve, faktura-afsenderinfo til professionelle dokumenter."
        />
        <FeatureCard
          icon={TrendingUp}
          title="Inviter dit team"
          description="Lad kolleger logge ind og samarbejde fra dag ét."
        />
        <FeatureCard
          icon={Bell}
          title="Klar til kunder"
          description="Når opsætningen er færdig kan du tilføje din første kunde."
        />
      </div>

      <div className="bg-card border border-border rounded-xl p-5 text-center">
        <p className="text-sm text-muted-foreground mb-4">
          Klar? Det tager 2–3 minutter.
        </p>
        <Link href="/onboarding/company">
          <Button size="lg">
            Lad os starte
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, description }: { icon: any; title: string; description: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 flex items-start gap-3">
      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div>
        <p className="font-semibold text-sm">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}
