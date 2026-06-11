import { AppTopbar } from "@/components/layout/AppTopbar";
import { BackButton } from "@/components/shared/BackButton";
import { ContactCsvImport } from "@/components/contacts/ContactCsvImport";
import { getCompanies } from "@/app/actions/companies";

export default async function ImportContactsPage() {
  const companies = await getCompanies();

  return (
    <>
      <AppTopbar pageTitle="Importer kontakter" />
      <BackButton href="/contacts" label="Kontakter" />
      <ContactCsvImport companies={companies.map((c) => ({ id: c.id, name: c.name }))} />
    </>
  );
}
