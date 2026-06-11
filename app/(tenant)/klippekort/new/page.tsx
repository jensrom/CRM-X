import { getCompanies } from "@/app/actions/companies";
import { getBundlePricingTiers } from "@/app/actions/bundle-pricing";
import {
  DEFAULT_BUNDLE_HOURLY_RATE,
  DEFAULT_BUNDLE_LABEL,
} from "@/lib/bundle-pricing-config";
import { NewBundleForm } from "./NewBundleForm";

export default async function NewBundlePage() {
  const [companies, tiers] = await Promise.all([
    getCompanies(),
    getBundlePricingTiers(),
  ]);

  const plainCompanies = companies.map((c) => ({
    id: c.id,
    name: c.name,
    orgNumber: c.orgNumber,
    industry: c.industry,
    city: c.city,
  }));

  // Serialiser Decimal → number for client-component
  const plainTiers = tiers.map((t) => ({
    minHours: t.minHours,
    hourlyRate: Number(t.hourlyRate),
    label: t.label,
  }));

  return (
    <NewBundleForm
      companies={plainCompanies}
      pricingTiers={plainTiers}
      defaultHourlyRate={DEFAULT_BUNDLE_HOURLY_RATE}
      defaultLabel={DEFAULT_BUNDLE_LABEL}
    />
  );
}
