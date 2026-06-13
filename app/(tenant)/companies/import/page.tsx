import { AppTopbar } from "@/components/layout/AppTopbar";
import { BackButton } from "@/components/shared/BackButton";
import { CompanyCsvImport } from "@/components/companies/CompanyCsvImport";

export default function ImportCompaniesPage() {
  return (
    <>
      <AppTopbar pageTitle="Importer kunder" />
      <BackButton href="/companies" label="Kunder" />
      <CompanyCsvImport />
    </>
  );
}
