/**
 * CRM-X — Demo-miljø seeder
 *
 * Wiper alle data på demo-tenanten (slug "demo") og bygger et komplet,
 * realistisk dansk konsulenthus-univers op:
 *   • 10 firmaer med 2-4 kontakter hver
 *   • 5 brugere (admin + 3 konsulenter + 1 supporter)
 *   • Klippekort i forskellige forbrugs-niveauer
 *   • Projekter i alle 3 statuses med backlog og timer
 *   • Tickets i alle 5 statuses
 *   • Fakturaer (kladde/sendt/betalt, B2B/B2C, med linje-rabat)
 *   • Pipeline deals fra ny til vundet/tabt
 *   • Leads + kampagner
 *   • Licenser (nogle udløber snart)
 *   • Produkter (SaaS, hardware, konsulentydelse)
 *   • Aktiviteter (møder, calls, opfølgning) til dashboard
 *
 * Kør med: npm run db:seed-demo
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

// Loud globalt error-handling så vi aldrig fejler stille
process.on("unhandledRejection", (err) => {
  console.error("\n❌ UNHANDLED REJECTION:");
  console.error(err);
  process.exit(1);
});
process.on("uncaughtException", (err) => {
  console.error("\n❌ UNCAUGHT EXCEPTION:");
  console.error(err);
  process.exit(1);
});

const db = new PrismaClient({ log: ["error", "warn"] });

const TENANT_SLUG = "demo";
const NOW = new Date();

/**
 * Tjek at Prisma-klienten kender alle de nye schema-felter.
 * Hvis user kun har kørt `prisma db push` men ikke `prisma generate` siden
 * sidste schema-ændring, vil scriptet fejle senere — vi vil hellere fejle nu.
 */
async function preflightSchemaCheck() {
  console.log("🔎 Preflight: tjekker at Prisma-klienten kender alle skema-felter...");
  const required = {
    Contact: ["linkedInUrl", "decisionRole"],
    User: ["phone", "title"],
    Product: ["type"],
    Company: ["invoiceEmail"],
    Invoice: ["vatEnabled", "vatPct", "customerType"],
    InvoiceLine: ["discountPct"],
  };
  const dmmf = (db)._runtimeDataModel ?? null;
  if (!dmmf) {
    console.log("   (kunne ikke læse runtime-model — fortsætter alligevel)");
    return;
  }
  const missing = [];
  for (const [model, fields] of Object.entries(required)) {
    const m = dmmf.models[model];
    if (!m) { missing.push(`${model} (hele modellen mangler)`); continue; }
    const known = new Set(m.fields.map((f) => f.name));
    for (const f of fields) {
      if (!known.has(f)) missing.push(`${model}.${f}`);
    }
  }
  if (missing.length > 0) {
    console.error("\n❌ Prisma-klienten mangler felter:");
    missing.forEach((m) => console.error(`   - ${m}`));
    console.error("\n👉 Kør først disse to kommandoer og prøv igen:");
    console.error("   npx prisma db push");
    console.error("   npx prisma generate\n");
    process.exit(1);
  }
  console.log("   ✓ Alle felter til stede");
}

await preflightSchemaCheck();

function daysAgo(n) {
  const d = new Date(NOW);
  d.setDate(d.getDate() - n);
  return d;
}
function daysFromNow(n) {
  return daysAgo(-n);
}
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function range(n) { return Array.from({ length: n }, (_, i) => i); }

/**
 * Wrap en section i try/catch så vi får en pænere fejl-besked
 * der peger på præcis hvilken sektion knaldede.
 */
async function section(name, fn) {
  try {
    await fn();
  } catch (err) {
    console.error(`\n❌ Fejl i sektion "${name}":`);
    console.error(err?.message ?? err);
    if (err?.meta) console.error("   meta:", err.meta);
    process.exit(1);
  }
}

// ============================================================
// 1. Find eller opret demo-tenanten
// ============================================================
let tenant = await db.tenant.findUnique({ where: { slug: TENANT_SLUG } });
if (!tenant) {
  console.log("ℹ️  Demo-tenant findes ikke — opretter den");
  tenant = await db.tenant.create({
    data: {
      name: "Plesner Demo Konsulent A/S",
      slug: TENANT_SLUG,
      modules: ["sales", "marketing", "support", "projects", "products", "licenses"],
      plan: "large",
      maxUsers: 50,
      status: "active",
      isActive: true,
      billingStatus: "manual",
      billingCurrency: "DKK",
      country: "Danmark",
      cvr: "37004791",
      address: "Pakhusvej 4",
      zipCode: "8000",
      city: "Aarhus C",
      industry: "consulting",
      ticketPrefix: "T",
      projectPrefix: "P",
      bundlePrefix: "KB",
      invoicePrefix: "F",
    },
  });
} else {
  console.log("ℹ️  Demo-tenant fundet, opdaterer stamdata");
  tenant = await db.tenant.update({
    where: { id: tenant.id },
    data: {
      name: "Plesner Demo Konsulent A/S",
      plan: "large",
      modules: ["sales", "marketing", "support", "projects", "products", "licenses"],
      status: "active",
      billingCurrency: "DKK",
      cvr: "37004791",
      address: "Pakhusvej 4",
      zipCode: "8000",
      city: "Aarhus C",
      industry: "consulting",
    },
  });
}
const tenantId = tenant.id;
console.log(`✅ Tenant: ${tenant.name} (${tenant.id})`);

// ============================================================
// 2. Wipe alt tenant-content (bevarer users, roles, bundlePricing, auditLog)
// ============================================================
console.log("🧹 Wiper eksisterende data...");

// Delete i FK-sikker rækkefølge
await db.invoiceLine.deleteMany({ where: { invoice: { tenantId } } });
await db.invoice.deleteMany({ where: { tenantId } });
await db.ticketComment.deleteMany({ where: { ticket: { tenantId } } });
await db.timeLog.deleteMany({ where: { tenantId } });
await db.backlogItem.deleteMany({ where: { project: { tenantId } } });
await db.projectBundle.deleteMany({ where: { tenantId } });
await db.projectProduct.deleteMany({ where: { project: { tenantId } } });
await db.hourBundle.deleteMany({ where: { tenantId } });
await db.licenseFile.deleteMany({ where: { license: { tenantId } } });
await db.license.deleteMany({ where: { tenantId } });
await db.customerProduct.deleteMany({ where: { tenantId } });
await db.activity.deleteMany({ where: { tenantId } });
await db.deal.deleteMany({ where: { tenantId } });
await db.lead.deleteMany({ where: { tenantId } });
await db.campaign.deleteMany({ where: { tenantId } });
await db.ticket.deleteMany({ where: { tenantId } });
await db.project.deleteMany({ where: { tenantId } });
await db.department.deleteMany({ where: { company: { tenantId } } });
await db.contact.deleteMany({ where: { tenantId } });
await db.product.deleteMany({ where: { tenantId } });
await db.activeCheckIn.deleteMany({ where: { user: { tenantId } } });
await db.notification.deleteMany({ where: { tenantId } });
await db.company.deleteMany({ where: { tenantId } });

console.log("✅ Data wiped");

// ============================================================
// 3. Brugere — sørg for at vi har admin + 3 konsulenter + 1 supporter
// ============================================================
const adminRole = await db.role.findFirst({ where: { tenantId, name: "Admin" } })
  ?? await db.role.create({ data: { tenantId, name: "Admin", isSystem: true, permissions: { sales: { view: true, create: true, edit: true, delete: true }, support: { view: true, create: true, edit: true, delete: true }, projects: { view: true, create: true, edit: true, delete: true }, products: { view: true, create: true, edit: true, delete: true }, licenses: { view: true, create: true, edit: true, delete: true }, marketing: { view: true, create: true, edit: true, delete: true } } } });
const konsulentRole = await db.role.findFirst({ where: { tenantId, name: "Konsulent" } })
  ?? await db.role.create({ data: { tenantId, name: "Konsulent", isSystem: true, permissions: { support: { view: true, create: true, edit: true }, projects: { view: true, edit: true }, products: { view: true } } } });

const userDefs = [
  { email: "admin@demo.dk",       name: "Demo Admin",      role: adminRole.id,       phone: "+45 30 11 22 33", title: "CTO" },
  { email: "mette@demo.dk",       name: "Mette Mortensen", role: konsulentRole.id,   phone: "+45 30 22 33 44", title: "Seniorkonsulent" },
  { email: "anders@demo.dk",      name: "Anders Knudsen",  role: konsulentRole.id,   phone: "+45 30 33 44 55", title: "Konsulent" },
  { email: "sofie@demo.dk",       name: "Sofie Birch",     role: konsulentRole.id,   phone: "+45 30 44 55 66", title: "Junior konsulent" },
  { email: "lars@demo.dk",        name: "Lars Holm",       role: konsulentRole.id,   phone: "+45 30 55 66 77", title: "Support-ansvarlig" },
];
const users = {};
const password = await bcrypt.hash("Demo2026!", 12);
for (const u of userDefs) {
  const existing = await db.user.findUnique({ where: { tenantId_email: { tenantId, email: u.email } } });
  if (existing) {
    users[u.email] = await db.user.update({
      where: { id: existing.id },
      data: { name: u.name, roleId: u.role, phone: u.phone, title: u.title, isActive: true, password },
    });
  } else {
    users[u.email] = await db.user.create({
      data: { tenantId, email: u.email, name: u.name, password, roleId: u.role, phone: u.phone, title: u.title, isActive: true },
    });
  }
}
console.log(`✅ ${Object.keys(users).length} brugere klar`);

// ============================================================
// 4. Bundle pricing tiers (klippekort-priser)
// ============================================================
await db.bundlePricingTier.deleteMany({ where: { tenantId } });
await db.bundlePricingTier.createMany({
  data: [
    { tenantId, minHours: 1,  hourlyRate: 1300, label: "Standard" },
    { tenantId, minHours: 21, hourlyRate: 1200, label: "Volumen" },
    { tenantId, minHours: 51, hourlyRate: 1100, label: "Storkunde" },
  ],
});
console.log("✅ Klippekort-pristrin: 1300/1200/1100 kr/t");

// ============================================================
// 5. Produkter
// ============================================================
const products = [];
const productDefs = [
  { name: "CRM-X Onboarding-pakke", type: "consulting", sku: "CON-ONB",     category: "Konsulent",  price: 35000, interval: "onetime", description: "20 timers introduktion + datakonvertering" },
  { name: "Plesner Cloud Suite",    type: "saas",       sku: "SAAS-PCS-1",  category: "SaaS",       price: 495,   interval: "monthly", description: "Hostet platform med automatiske opdateringer" },
  { name: "Plesner Cloud Suite Pro",type: "saas",       sku: "SAAS-PCS-2",  category: "SaaS",       price: 895,   interval: "monthly", description: "Professionel udgave med API-adgang" },
  { name: "Microsoft 365 BP",       type: "software_license", sku: "M365-BP", category: "Microsoft", price: 175, interval: "monthly", description: "Microsoft 365 Business Premium" },
  { name: "Fortinet Firewall 100F", type: "hardware",   sku: "FG-100F",     category: "Network",    price: 14500, interval: "onetime", description: "Next-gen firewall til SMB" },
  { name: "Service-aftale Standard", type: "consulting", sku: "CON-SLA-STD", category: "Konsulent",  price: 2500,  interval: "monthly", description: "SLA med 4 timers responstid" },
];
for (const p of productDefs) {
  const product = await db.product.create({
    data: {
      tenantId,
      name: p.name,
      description: p.description,
      sku: p.sku,
      type: p.type,
      category: p.category,
      isActive: true,
      pricing: { create: { interval: p.interval, price: p.price, currency: "DKK" } },
    },
  });
  products.push(product);
}
console.log(`✅ ${products.length} produkter oprettet`);

// ============================================================
// 6. Firmaer + kontakter (10 firmaer, 2-4 kontakter hver)
// ============================================================
const companyDefs = [
  {
    name: "Bjerregaard & Holm Advokater A/S", orgNumber: "27419583", industry: "consulting",
    phone: "+45 87 12 34 56", email: "info@bh-advokater.dk", invoiceEmail: "faktura@bh-advokater.dk",
    website: "https://bh-advokater.dk", address: "Frederiksgade 14", zipCode: "8000", city: "Aarhus C",
    notes: "Stor advokat-kæde med 3 lokationer. Bruger M365 + Plesner Cloud Suite Pro.",
    contacts: [
      { firstName: "Camilla", lastName: "Bjerregaard", title: "Managing Partner", email: "camilla.bjerregaard@bh-advokater.dk", phone: "+45 87 12 34 57", mobile: "+45 27 14 22 33", decisionRole: "budget_holder", linkedInUrl: "https://linkedin.com/in/camilla-bjerregaard" },
      { firstName: "Mikkel",  lastName: "Holm",       title: "Senior Partner",   email: "mikkel.holm@bh-advokater.dk",      phone: "+45 87 12 34 58", mobile: "+45 27 14 22 34", decisionRole: "decision_maker" },
      { firstName: "Anne",    lastName: "Nielsen",    title: "IT-chef",          email: "anne.nielsen@bh-advokater.dk",     phone: "+45 87 12 34 59", decisionRole: "influencer" },
      { firstName: "Peter",   lastName: "Schmidt",    title: "Office Manager",   email: "peter.schmidt@bh-advokater.dk",    phone: "+45 87 12 34 60", decisionRole: "none" },
    ],
  },
  {
    name: "NordVind Energi ApS", orgNumber: "38291746", industry: "engineering",
    phone: "+45 96 33 22 11", email: "kontakt@nordvind.dk", invoiceEmail: "regnskab@nordvind.dk",
    website: "https://nordvind.dk", address: "Vindmøllevej 22", zipCode: "9990", city: "Skagen",
    notes: "Vindmølle-udvikler. Forhandler om udvidet support-aftale.",
    contacts: [
      { firstName: "Jakob",   lastName: "Sørensen", title: "Driftschef",  email: "jakob@nordvind.dk",   phone: "+45 96 33 22 12", mobile: "+45 26 88 11 22", decisionRole: "decision_maker" },
      { firstName: "Maria",   lastName: "Eriksen",  title: "CFO",         email: "maria@nordvind.dk",   phone: "+45 96 33 22 13", decisionRole: "budget_holder" },
      { firstName: "Henrik",  lastName: "Bach",     title: "Systemansvarlig", email: "henrik@nordvind.dk", phone: "+45 96 33 22 14", decisionRole: "champion" },
    ],
  },
  {
    name: "Pixel & Pingvin Studio ApS", orgNumber: "41928374", industry: "marketing",
    phone: "+45 70 22 88 11", email: "hej@pixelpingvin.dk", invoiceEmail: null,
    website: "https://pixelpingvin.dk", address: "Klosterport 6", zipCode: "1153", city: "København K",
    notes: "Lille digital bureau, 12 ansatte. Vækst-kunde — passer på cashflow.",
    contacts: [
      { firstName: "Asbjørn", lastName: "Vinther",  title: "Founder & CEO",  email: "asbjorn@pixelpingvin.dk", phone: "+45 70 22 88 12", mobile: "+45 28 19 44 55", decisionRole: "decision_maker", linkedInUrl: "https://linkedin.com/in/asbjornvinther" },
      { firstName: "Trine",   lastName: "Lundgaard", title: "Creative Director", email: "trine@pixelpingvin.dk", phone: "+45 70 22 88 13", decisionRole: "influencer" },
      { firstName: "Daniel",  lastName: "Berg",    title: "Tech Lead",      email: "daniel@pixelpingvin.dk",  phone: "+45 70 22 88 14", decisionRole: "champion" },
    ],
  },
  {
    name: "Frostbjerg Fisk A/S", orgNumber: "33445566", industry: "manufacturing",
    phone: "+45 97 11 22 33", email: "info@frostbjerg.dk", invoiceEmail: "bogholderi@frostbjerg.dk",
    website: "https://frostbjerg.dk", address: "Havnegade 8", zipCode: "9850", city: "Hirtshals",
    notes: "Fiskeforarbejdning, 80 ansatte. Konservativ kunde, alt skal være rock-solid.",
    contacts: [
      { firstName: "Bent",    lastName: "Frostbjerg", title: "Adm. direktør", email: "bent@frostbjerg.dk", phone: "+45 97 11 22 34", mobile: "+45 23 14 88 99", decisionRole: "decision_maker" },
      { firstName: "Inger",   lastName: "Klausen",   title: "Økonomichef",  email: "inger@frostbjerg.dk", phone: "+45 97 11 22 35", decisionRole: "budget_holder" },
    ],
  },
  {
    name: "Møllers Mekaniske Værksted ApS", orgNumber: "55667788", industry: "manufacturing",
    phone: "+45 86 44 22 11", email: "post@moellers-mekanik.dk", invoiceEmail: null,
    website: null, address: "Industrivej 42", zipCode: "8700", city: "Horsens",
    notes: "Lille håndværker, har M365 + 1 firewall hos os.",
    contacts: [
      { firstName: "Jens",    lastName: "Møller",   title: "Værkfører",  email: "jens@moellers-mekanik.dk", phone: "+45 86 44 22 12", mobile: "+45 24 88 33 22", decisionRole: "decision_maker" },
      { firstName: "Karin",   lastName: "Møller",   title: "Bogholder",  email: "karin@moellers-mekanik.dk", phone: "+45 86 44 22 13", decisionRole: "budget_holder" },
    ],
  },
  {
    name: "Skagen Beauty ApS", orgNumber: "66778899", industry: "retail",
    phone: "+45 98 44 55 22", email: "info@skagenbeauty.dk", invoiceEmail: "regnskab@skagenbeauty.dk",
    website: "https://skagenbeauty.dk", address: "Strandvejen 11", zipCode: "9990", city: "Skagen",
    notes: "Kosmetik-webshop, mid-size kunde. Bruger Plesner Cloud Suite + support-aftale.",
    contacts: [
      { firstName: "Nina",     lastName: "Skagen",   title: "Founder",      email: "nina@skagenbeauty.dk", phone: "+45 98 44 55 23", mobile: "+45 26 14 77 88", decisionRole: "decision_maker", linkedInUrl: "https://linkedin.com/in/ninaskagen" },
      { firstName: "Magnus",   lastName: "Holst",    title: "COO",          email: "magnus@skagenbeauty.dk", phone: "+45 98 44 55 24", decisionRole: "budget_holder" },
      { firstName: "Liva",     lastName: "Fredriksen", title: "Webshop-ansvarlig", email: "liva@skagenbeauty.dk", phone: "+45 98 44 55 25", decisionRole: "influencer" },
      { firstName: "Thomas",   lastName: "Kragh",    title: "IT-konsulent", email: "thomas@skagenbeauty.dk", phone: "+45 98 44 55 26", decisionRole: "champion" },
    ],
  },
  {
    name: "Aalborg Tagdækning I/S", orgNumber: "77889900", industry: "manufacturing",
    phone: "+45 99 22 11 33", email: "kontakt@aalborgtag.dk", invoiceEmail: null,
    website: "https://aalborgtag.dk", address: "Vesterhavevej 18", zipCode: "9000", city: "Aalborg",
    notes: "Tagdækker, 25 ansatte. Vi har sat M365 op for dem.",
    contacts: [
      { firstName: "Birger",   lastName: "Olsen",    title: "Adm. direktør", email: "birger@aalborgtag.dk", phone: "+45 99 22 11 34", decisionRole: "decision_maker" },
      { firstName: "Susanne",  lastName: "Madsen",   title: "Kontorchef",    email: "susanne@aalborgtag.dk", phone: "+45 99 22 11 35", decisionRole: "influencer" },
    ],
  },
  {
    name: "GreenLeaf Bio ApS", orgNumber: "88990011", industry: "retail",
    phone: "+45 35 99 88 77", email: "hej@greenleaf.dk", invoiceEmail: "økonomi@greenleaf.dk",
    website: "https://greenleaf.dk", address: "Nørrebrogade 145", zipCode: "2200", city: "København N",
    notes: "Øko-startup, 8 ansatte. Vi er i opstart med dem — pilot-projekt kører.",
    contacts: [
      { firstName: "Stine",    lastName: "Andresen", title: "Founder & CEO", email: "stine@greenleaf.dk", phone: "+45 35 99 88 78", mobile: "+45 26 99 11 22", decisionRole: "decision_maker", linkedInUrl: "https://linkedin.com/in/stineandresen" },
      { firstName: "Mathias",  lastName: "Lykke",    title: "Operations",   email: "mathias@greenleaf.dk", phone: "+45 35 99 88 79", decisionRole: "champion" },
      { firstName: "Yasmin",   lastName: "Khan",     title: "Marketing",    email: "yasmin@greenleaf.dk", phone: "+45 35 99 88 80", decisionRole: "none" },
    ],
  },
  {
    name: "Carlsen Logistik A/S", orgNumber: "99001122", industry: "engineering",
    phone: "+45 76 33 44 55", email: "info@carlsen-log.dk", invoiceEmail: "faktura@carlsen-log.dk",
    website: "https://carlsen-log.dk", address: "Transportcentret 5", zipCode: "6000", city: "Kolding",
    notes: "Speditør med 60 lastbiler. Konkurrent forsøger at overtage — kritisk at holde dem glade.",
    contacts: [
      { firstName: "Vagn",     lastName: "Carlsen",  title: "Adm. direktør", email: "vagn@carlsen-log.dk", phone: "+45 76 33 44 56", mobile: "+45 24 11 22 33", decisionRole: "decision_maker" },
      { firstName: "Christian", lastName: "Friis",   title: "CTO",           email: "christian@carlsen-log.dk", phone: "+45 76 33 44 57", decisionRole: "champion", linkedInUrl: "https://linkedin.com/in/christianfriis" },
      { firstName: "Marianne", lastName: "Pedersen", title: "Økonomichef",   email: "marianne@carlsen-log.dk", phone: "+45 76 33 44 58", decisionRole: "budget_holder" },
    ],
  },
  {
    name: "Niels Vestergaard (privat)", orgNumber: null, industry: "other",
    phone: "+45 22 33 44 55", email: "niels@vestergaard.nu", invoiceEmail: null,
    website: null, address: "Engvej 7", zipCode: "8240", city: "Risskov",
    notes: "B2C-kunde — har bedt om hjælp med privat backup-løsning. Kun en faktura.",
    contacts: [
      { firstName: "Niels", lastName: "Vestergaard", title: "Privatperson", email: "niels@vestergaard.nu", phone: "+45 22 33 44 55", decisionRole: "decision_maker" },
    ],
  },
];

const companies = {};
for (const def of companyDefs) {
  const { contacts, ...stamdata } = def;
  const company = await db.company.create({
    data: { tenantId, ...stamdata, isActive: true },
  });
  for (const c of contacts) {
    await db.contact.create({
      data: { tenantId, companyId: company.id, ...c, isActive: true },
    });
  }
  companies[company.name] = company;
}
console.log(`✅ ${Object.keys(companies).length} firmaer + ${companyDefs.reduce((s, c) => s + c.contacts.length, 0)} kontakter`);

// Helper til at finde firmaer/kontakter
const co = (name) => companies[name];
async function firstContact(companyId) {
  return db.contact.findFirst({ where: { companyId } });
}

// ============================================================
// 7. Klippekort (HourBundles)
// ============================================================
const bundleDefs = [
  { company: "Bjerregaard & Holm Advokater A/S", name: "50 timer Q2 — Standard support", totalHours: 50, usedMinutes: 1860, price: 60000, daysOld: 45, expiresInDays: 90 },
  { company: "NordVind Energi ApS",              name: "30 timer Cloud-migration",        totalHours: 30, usedMinutes: 720,  price: 39000, daysOld: 30, expiresInDays: 60 },
  { company: "Pixel & Pingvin Studio ApS",       name: "20 timer Q2 — Hosting & DevOps",  totalHours: 20, usedMinutes: 1140, price: 26000, daysOld: 60, expiresInDays: 30 },
  { company: "Carlsen Logistik A/S",             name: "100 timer Volumen-aftale 2026",   totalHours: 100, usedMinutes: 2700, price: 110000, daysOld: 75, expiresInDays: 270 },
  { company: "Skagen Beauty ApS",                name: "40 timer Webshop-optimering",     totalHours: 40, usedMinutes: 2300, price: 48000, daysOld: 50, expiresInDays: 40 },
  { company: "GreenLeaf Bio ApS",                name: "15 timer Pilot — opstart",        totalHours: 15, usedMinutes: 900,  price: 19500, daysOld: 20, expiresInDays: 70 },
  { company: "Frostbjerg Fisk A/S",              name: "60 timer Helårsaftale",           totalHours: 60, usedMinutes: 3450, price: 72000, daysOld: 95, expiresInDays: 270 },
  { company: "Bjerregaard & Holm Advokater A/S", name: "20 timer Opbrugt — historisk",    totalHours: 20, usedMinutes: 1200, price: 26000, daysOld: 180, expiresInDays: -20 },
];
const bundles = [];
let bundleNum = 1;
for (const b of bundleDefs) {
  const company = co(b.company);
  if (!company) continue;
  const bundle = await db.hourBundle.create({
    data: {
      tenantId,
      companyId: company.id,
      number: bundleNum++,
      name: b.name,
      totalHours: b.totalHours,
      usedMinutes: b.usedMinutes,
      price: b.price,
      purchaseDate: daysAgo(b.daysOld),
      expiresAt: daysFromNow(b.expiresInDays),
      isActive: b.expiresInDays > 0,
    },
  });
  bundles.push({ bundle, companyName: b.company });
}
console.log(`✅ ${bundles.length} klippekort`);

// ============================================================
// 8. Projekter
// ============================================================
const projectDefs = [
  { company: "Bjerregaard & Holm Advokater A/S", title: "Migration til Plesner Cloud Suite Pro", status: "active",  managerEmail: "mette@demo.dk",  daysOld: 35, deadlineInDays: 40, useBundle: 0, products: [1, 5], description: "Migration af 80 advokat-arbejdspladser fra eget AD til Plesner Cloud Suite Pro." },
  { company: "NordVind Energi ApS",              title: "Vindmølle-data API-integration",        status: "active",  managerEmail: "anders@demo.dk", daysOld: 28, deadlineInDays: 30, useBundle: 1, products: [2], description: "Integration mellem SCADA og økonomisystem via REST API." },
  { company: "Carlsen Logistik A/S",             title: "GPS-flåde-styringsplatform",            status: "active",  managerEmail: "mette@demo.dk",  daysOld: 60, deadlineInDays: 50, useBundle: 3, products: [1, 4], description: "Roll-out af GPS-tracking til 60 lastbiler. Inkluderer Microsoft 365 til alle chauffører." },
  { company: "Skagen Beauty ApS",                title: "Webshop performance + SEO",             status: "active",  managerEmail: "sofie@demo.dk",  daysOld: 50, deadlineInDays: 20, useBundle: 4, products: [1], description: "Optimering af Magento-webshop + SEO-tuning. Mål: 30% hurtigere page-load." },
  { company: "GreenLeaf Bio ApS",                title: "Pilot — POS-system + inventory",        status: "active",  managerEmail: "sofie@demo.dk",  daysOld: 20, deadlineInDays: 70, useBundle: 5, products: [1], description: "Pilot på Pasar POS-løsning. 3 mdr. evaluerings-periode." },
  { company: "Frostbjerg Fisk A/S",              title: "Helårsaftale 2026 — drift & overvågning", status: "active", managerEmail: "lars@demo.dk",   daysOld: 95, deadlineInDays: 270, useBundle: 6, products: [3, 5], description: "Driftsaftale på Microsoft 365 + Fortinet + 24/7 support." },
  { company: "Pixel & Pingvin Studio ApS",       title: "Hosting-konsolidering",                 status: "waiting", managerEmail: "anders@demo.dk", daysOld: 70, deadlineInDays: 30, useBundle: 2, products: [1], description: "Afventer kunden's beslutning om de vil flytte væk fra AWS." },
  { company: "Aalborg Tagdækning I/S",           title: "Microsoft 365 opsætning",              status: "closed",  managerEmail: "lars@demo.dk",   daysOld: 120, deadlineInDays: -30, useBundle: -1, products: [3], description: "Initial Microsoft 365 setup. Lukket — alt leveret." },
  { company: "Møllers Mekaniske Værksted ApS",   title: "Firewall + backup-rutiner",            status: "closed",  managerEmail: "anders@demo.dk", daysOld: 150, deadlineInDays: -60, useBundle: -1, products: [4], description: "Installation af Fortinet 100F + automatisk backup. Lukket — kunde tilfreds." },
];

const projects = [];
let projectNum = 1;
for (const p of projectDefs) {
  const company = co(p.company);
  if (!company) continue;
  const manager = users[p.managerEmail];
  const project = await db.project.create({
    data: {
      tenantId,
      companyId: company.id,
      assignedToId: manager?.id ?? null,
      number: projectNum++,
      title: p.title,
      description: p.description,
      status: p.status,
      startDate: daysAgo(p.daysOld),
      endDate: daysFromNow(p.deadlineInDays),
    },
  });

  // Tilknyt produkter
  for (const productIdx of p.products) {
    if (products[productIdx]) {
      await db.projectProduct.create({
        data: { projectId: project.id, productId: products[productIdx].id },
      });
    }
  }

  // Tilknyt klippekort
  if (p.useBundle >= 0 && bundles[p.useBundle]) {
    await db.projectBundle.create({
      data: {
        tenantId,
        projectId: project.id,
        bundleId: bundles[p.useBundle].bundle.id,
        sortOrder: 0,
      },
    });
  }

  // Backlog (kun aktive projekter)
  if (p.status === "active") {
    const backlogTitles = [
      { title: "Kick-off møde med kunde",     status: "done",        priority: "high",   est: 2 },
      { title: "Teknisk specifikation",       status: "done",        priority: "high",   est: 8 },
      { title: "Setup udviklingsmiljø",       status: "done",        priority: "medium", est: 4 },
      { title: "Implementering — Fase 1",     status: "in_progress", priority: "high",   est: 24 },
      { title: "Migration af data",           status: "todo",        priority: "high",   est: 16 },
      { title: "User-acceptance test",        status: "todo",        priority: "medium", est: 8 },
      { title: "Go-live + dokumentation",     status: "todo",        priority: "medium", est: 12 },
    ];
    for (let i = 0; i < backlogTitles.length; i++) {
      const b = backlogTitles[i];
      await db.backlogItem.create({
        data: {
          projectId: project.id,
          title: b.title,
          status: b.status,
          priority: b.priority,
          estimateHours: b.est,
          sortOrder: i,
        },
      });
    }
  }

  projects.push({ project, companyName: p.company });
}
console.log(`✅ ${projects.length} projekter med backlog`);

// ============================================================
// 9. Tidsregistreringer (TimeLogs)
// ============================================================
const consultantUsers = [users["mette@demo.dk"], users["anders@demo.dk"], users["sofie@demo.dk"], users["lars@demo.dk"]];
let timeLogCount = 0;
for (const { project, companyName } of projects) {
  const bundleInfo = bundles.find((b) => b.companyName === companyName);
  const numLogs = project.status === "closed" ? 8 : 12;
  for (let i = 0; i < numLogs; i++) {
    const consultant = pick(consultantUsers);
    const duration = pick([60, 90, 120, 180, 240, 300, 360]);
    const daysBack = Math.floor(Math.random() * 30) + 1;
    await db.timeLog.create({
      data: {
        tenantId,
        userId: consultant.id,
        projectId: project.id,
        bundleId: bundleInfo?.bundle.id ?? null,
        date: daysAgo(daysBack),
        durationMin: duration,
        description: pick([
          "Implementering og test",
          "Møde med kunde + opfølgning",
          "Dokumentation",
          "Fejlretning",
          "Konfiguration",
          "Migration af data",
          "Bug-rettelse efter UAT",
          "Telefon-support",
        ]),
        isBillable: true,
        deductedFromBundle: !!bundleInfo,
      },
    });
    timeLogCount++;
  }
}
console.log(`✅ ${timeLogCount} timeregistreringer`);

// ============================================================
// 10. Tickets
// ============================================================
const ticketDefs = [
  { company: "Bjerregaard & Holm Advokater A/S", title: "Outlook synkroniserer ikke kalender", status: "open",              priority: "high",     assignee: "lars@demo.dk",   product: 3, daysOld: 1,  desc: "Vores partner Mikkel kan ikke se sin kalender på telefonen siden i går. Allerede prøvet at slå konto fra og til." },
  { company: "Bjerregaard & Holm Advokater A/S", title: "Tilføj 3 nye brugere til Cloud Suite", status: "pending_customer",  priority: "normal",   assignee: "lars@demo.dk",   product: 1, daysOld: 3,  desc: "Vi har 3 nye juniorer der skal have adgang. Afventer at HR sender CPR + ansættelsesdatoer." },
  { company: "NordVind Energi ApS",              title: "SCADA-API returnerer 401 ind imellem", status: "pending_supplier",  priority: "high",     assignee: "anders@demo.dk", product: null, daysOld: 5, desc: "Intermittent 401 fra SCADA-API. Har sendt logs til leverandøren og afventer svar." },
  { company: "Pixel & Pingvin Studio ApS",       title: "VPN-forbindelse går ned hver eftermiddag", status: "open",          priority: "critical", assignee: "anders@demo.dk", product: null, daysOld: 0, desc: "Hele kontoret mister VPN ca. 14:30. Kunden mistænker DHCP-konflikt." },
  { company: "Skagen Beauty ApS",                title: "Webshop er nede!",                      status: "resolved",          priority: "critical", assignee: "mette@demo.dk",  product: 1, daysOld: 4,  desc: "Webshoppen var nede i 2 timer. Årsag: udgået SSL-certifikat. Fornyet og deployed." },
  { company: "Skagen Beauty ApS",                title: "Tilføj betalingsmetode — MobilePay",   status: "open",              priority: "normal",   assignee: "sofie@demo.dk",  product: 1, daysOld: 7,  desc: "Kunden vil have MobilePay som betalingsoption. Skal integreres via deres webshop-plugin." },
  { company: "Carlsen Logistik A/S",             title: "Printer i Aalborg-afdelingen virker ikke", status: "pending_customer", priority: "low",   assignee: "lars@demo.dk",   product: null, daysOld: 2, desc: "Den gamle HP printer virker ikke. Afventer kunden's beslutning om reparation eller udskiftning." },
  { company: "Carlsen Logistik A/S",             title: "GPS-data fra lastbil 47 mangler",      status: "open",              priority: "normal",   assignee: "anders@demo.dk", product: null, daysOld: 1, desc: "Lastbil 47 har ikke sendt GPS-data siden 06:00 i dag. Tracker muligvis defekt." },
  { company: "Frostbjerg Fisk A/S",              title: "Backup-job fejler natten over",        status: "resolved",          priority: "high",     assignee: "lars@demo.dk",   product: 3, daysOld: 6,  desc: "Backup-job kørte ikke fredag nat. Årsag: fuld disk på backup-target. Disken er udvidet og job gengivet." },
  { company: "Frostbjerg Fisk A/S",              title: "Tilføj print-quota på alle Mac'er",    status: "closed",            priority: "low",      assignee: "lars@demo.dk",   product: null, daysOld: 20, desc: "Kunden ønsker print-quota på alle Mac-stationer. Implementeret og dokumenteret." },
  { company: "GreenLeaf Bio ApS",                title: "POS-system fryser ved kortbetalinger", status: "pending_supplier",  priority: "critical", assignee: "sofie@demo.dk",  product: 1, daysOld: 2,  desc: "POS fryser ca. hver 20. transaktion ved kortbetaling. Leverandør undersøger." },
  { company: "Møllers Mekaniske Værksted ApS",   title: "Spam-filter bruger fanger legitime mails", status: "resolved",      priority: "normal",   assignee: "lars@demo.dk",   product: 3, daysOld: 10, desc: "M365 spam-filter sætter for mange mails fra kunder i karantæne. Whitelist konfigureret." },
  { company: "Aalborg Tagdækning I/S",           title: "Setup ny laptop til projektleder",     status: "closed",            priority: "normal",   assignee: "lars@demo.dk",   product: 3, daysOld: 15, desc: "Ny laptop til Birger. M365 setup + Office + VPN. Leveret 10.06." },
  { company: "Bjerregaard & Holm Advokater A/S", title: "Implementer to-faktor på alle brugere", status: "closed",            priority: "high",     assignee: "mette@demo.dk",  product: 1, daysOld: 30, desc: "Roll-out af MFA på alle 80 brugere. Træning + dokumentation. Lukket — alt OK." },
];

let ticketNum = 1;
const ticketsCreated = [];
for (const t of ticketDefs) {
  const company = co(t.company);
  if (!company) continue;
  const assignee = users[t.assignee];
  const product = t.product !== null ? products[t.product] : null;
  const contact = await firstContact(company.id);

  const created = daysAgo(t.daysOld);
  const ticket = await db.ticket.create({
    data: {
      tenantId,
      number: ticketNum++,
      companyId: company.id,
      contactId: contact?.id ?? null,
      productId: product?.id ?? null,
      assignedToId: assignee?.id ?? null,
      title: t.title,
      description: t.desc,
      status: t.status,
      priority: t.priority,
      resolvedAt: ["resolved", "closed"].includes(t.status) ? daysAgo(Math.max(0, t.daysOld - 2)) : null,
      closedAt: t.status === "closed" ? daysAgo(Math.max(0, t.daysOld - 1)) : null,
      createdAt: created,
      updatedAt: created,
    },
  });
  ticketsCreated.push(ticket);

  // 1-3 kommentarer pr. ticket
  const numComments = pick([1, 2, 3]);
  for (let i = 0; i < numComments; i++) {
    const commentUser = pick(consultantUsers);
    const isInternal = i === 0 && Math.random() < 0.4;
    await db.ticketComment.create({
      data: {
        ticketId: ticket.id,
        userId: commentUser.id,
        content: isInternal
          ? "Intern note: kunde virker stresset over deadline — håndter med fløjlshandsker."
          : pick([
              "Hej — jeg har kigget på sagen og afprøver et par ting. Vender tilbage senest i morgen.",
              "Status: undersøger logs, der er noget mistænkeligt omkring 14:25. Fortsætter.",
              "Problemet er løst. Konfigurations-ændring er rullet ud. Bekræft venligst i jeres ende.",
              "Tak for tilbagemeldingen. Lukker sagen nu.",
            ]),
        isInternal,
        createdAt: new Date(created.getTime() + (i + 1) * 3600000),
      },
    });
  }

  // Timelog på lukkede / løste tickets
  if (["resolved", "closed"].includes(t.status)) {
    await db.timeLog.create({
      data: {
        tenantId,
        userId: assignee.id,
        ticketId: ticket.id,
        date: daysAgo(t.daysOld - 1),
        durationMin: pick([30, 45, 60, 90, 120]),
        description: "Fejlsøgning og løsning",
        isBillable: true,
      },
    });
  }
}
console.log(`✅ ${ticketsCreated.length} tickets med kommentarer + timelogs`);

// ============================================================
// 11. Pipeline / Deals
// ============================================================
const dealDefs = [
  { company: "Bjerregaard & Holm Advokater A/S", title: "Roll-out af Plesner Cloud Suite Pro til alle 80 brugere", value: 480000, stage: "negotiation", probability: 60, assignee: "mette@demo.dk", expectedDaysFromNow: 14 },
  { company: "Carlsen Logistik A/S",             title: "Fortinet firewall til 3 lokationer",                       value: 145000, stage: "proposal",    probability: 50, assignee: "anders@demo.dk", expectedDaysFromNow: 21 },
  { company: "NordVind Energi ApS",              title: "Udvidet support-aftale 2026",                              value: 240000, stage: "qualified",   probability: 35, assignee: "mette@demo.dk", expectedDaysFromNow: 30 },
  { company: "Skagen Beauty ApS",                title: "Plesner Cloud Suite Pro upgrade",                          value: 89000,  stage: "negotiation", probability: 75, assignee: "sofie@demo.dk", expectedDaysFromNow: 7 },
  { company: "GreenLeaf Bio ApS",                title: "Pilot → fuld aftale efter 3 mdr.",                         value: 175000, stage: "qualified",   probability: 40, assignee: "sofie@demo.dk", expectedDaysFromNow: 60 },
  { company: "Pixel & Pingvin Studio ApS",       title: "Hosting-flytning fra AWS",                                 value: 95000,  stage: "new",         probability: 20, assignee: "anders@demo.dk", expectedDaysFromNow: 45 },
  { company: "Bjerregaard & Holm Advokater A/S", title: "Konvertering af gammelt sagsystem",                        value: 320000, stage: "won",         probability: 100, assignee: "mette@demo.dk", expectedDaysFromNow: -10 },
  { company: "Frostbjerg Fisk A/S",              title: "Tilbud på ERP-integration (afslået)",                      value: 220000, stage: "lost",        probability: 0,  assignee: "anders@demo.dk", expectedDaysFromNow: -5 },
];

for (const d of dealDefs) {
  const company = co(d.company);
  if (!company) continue;
  const assignee = users[d.assignee];
  const contact = await firstContact(company.id);
  await db.deal.create({
    data: {
      tenantId,
      companyId: company.id,
      contactId: contact?.id ?? null,
      assignedToId: assignee?.id ?? null,
      title: d.title,
      value: d.value,
      currency: "DKK",
      stage: d.stage,
      probability: d.probability,
      expectedCloseDate: daysFromNow(d.expectedDaysFromNow),
      closedAt: ["won", "lost"].includes(d.stage) ? daysFromNow(d.expectedDaysFromNow) : null,
      lostReason: d.stage === "lost" ? "Kunde valgte konkurrent grundet pris" : null,
      notes: d.stage === "won" ? "Vundet — kontrakt underskrevet. Onboarding planlagt." : null,
    },
  });
}
console.log(`✅ ${dealDefs.length} deals i pipeline`);

// ============================================================
// 12. Kampagner + leads
// ============================================================
const campaign1 = await db.campaign.create({
  data: {
    tenantId,
    name: "Cloud Suite roadshow forår 2026",
    type: "event",
    status: "active",
    startDate: daysAgo(60),
    endDate: daysFromNow(30),
    budget: 75000,
    notes: "Roadshow med 4 stop: Aarhus, Aalborg, København, Odense.",
  },
});
const campaign2 = await db.campaign.create({
  data: {
    tenantId,
    name: "LinkedIn ads — Konsulent-segmentet",
    type: "ads",
    status: "completed",
    startDate: daysAgo(120),
    endDate: daysAgo(30),
    budget: 25000,
    notes: "B2B-kampagne mod konsulenthuse. Genereret 23 leads.",
  },
});

const leadDefs = [
  { firstName: "Søren", lastName: "Klausen",  email: "soren@kraftvaerk.dk",   company: "Kraftværk ApS",       jobTitle: "Driftschef", source: "event",     campaign: campaign1.id, status: "qualified" },
  { firstName: "Pia",   lastName: "Lykkegaard", email: "pia@scanmek.dk",     company: "ScanMek A/S",         jobTitle: "CFO",        source: "event",     campaign: campaign1.id, status: "contacted" },
  { firstName: "Bo",    lastName: "Daugaard", email: "bo@daugaard.dk",      company: "Daugaard Service ApS", jobTitle: "Ejer",       source: "event",     campaign: campaign1.id, status: "new" },
  { firstName: "Helle", lastName: "Mikkelsen", email: "helle@nordbygg.dk",   company: "Nord Byg A/S",        jobTitle: "Direktør",   source: "web",       campaign: null,         status: "new" },
  { firstName: "Kim",   lastName: "Larsen",   email: "kim@elteknik.dk",     company: "El-Teknik Vejle",     jobTitle: "Ejer",       source: "referral",  campaign: null,         status: "contacted" },
  { firstName: "Lise",  lastName: "Reimann",  email: "lise@reimann.com",    company: "Reimann Consult",     jobTitle: "Founder",    source: "cold-call", campaign: campaign2.id, status: "qualified" },
  { firstName: "Ole",   lastName: "Brink",    email: "ole@brink-it.dk",     company: "Brink IT ApS",        jobTitle: "IT-direktør",source: "web",       campaign: null,         status: "lost" },
  { firstName: "Tina",  lastName: "Vang",     email: "tina@vang-as.dk",     company: "Vang A/S",            jobTitle: "Adm. dir.",  source: "referral",  campaign: null,         status: "converted" },
];

for (const l of leadDefs) {
  await db.lead.create({
    data: {
      tenantId,
      campaignId: l.campaign,
      firstName: l.firstName,
      lastName: l.lastName,
      email: l.email,
      company: l.company,
      jobTitle: l.jobTitle,
      source: l.source,
      status: l.status,
    },
  });
}
console.log(`✅ 2 kampagner + ${leadDefs.length} leads`);

// ============================================================
// 13. Licenser
// ============================================================
const licenseDefs = [
  { company: "Bjerregaard & Holm Advokater A/S", productIdx: 3, name: "Microsoft 365 BP × 80", licenseKey: "MS365-BH-2026-XJL2-MK99", expiresInDays: 240, status: "active" },
  { company: "Skagen Beauty ApS",                productIdx: 3, name: "Microsoft 365 BP × 15", licenseKey: "MS365-SB-2026-PQR4-LS22", expiresInDays: 25,  status: "pending_renewal" },
  { company: "Frostbjerg Fisk A/S",              productIdx: 3, name: "Microsoft 365 BP × 80", licenseKey: "MS365-FF-2026-NB88-KK11", expiresInDays: 365, status: "active" },
  { company: "Carlsen Logistik A/S",             productIdx: 4, name: "Fortinet 100F × 3",      licenseKey: "FG100F-CL-2026-WW",       expiresInDays: 180, status: "active" },
  { company: "Aalborg Tagdækning I/S",           productIdx: 3, name: "Microsoft 365 BP × 25", licenseKey: "MS365-AT-2026-AAB9-XS44", expiresInDays: -10, status: "expired" },
  { company: "Møllers Mekaniske Værksted ApS",   productIdx: 4, name: "Fortinet 100F × 1",      licenseKey: "FG100F-MM-2026-PP",       expiresInDays: 90,  status: "active" },
];
for (const l of licenseDefs) {
  const company = co(l.company);
  if (!company) continue;
  await db.license.create({
    data: {
      tenantId,
      companyId: company.id,
      productId: products[l.productIdx]?.id,
      name: l.name,
      licenseKey: l.licenseKey,
      expiresAt: daysFromNow(l.expiresInDays),
      status: l.status,
      notifyDaysBefore: 30,
    },
  });
}
console.log(`✅ ${licenseDefs.length} licenser`);

// ============================================================
// 14. Customer products (tilknytninger)
// ============================================================
const cpDefs = [
  { company: "Bjerregaard & Holm Advokater A/S", productIdx: 1, daysAgo: 90 },
  { company: "Bjerregaard & Holm Advokater A/S", productIdx: 3, daysAgo: 120 },
  { company: "NordVind Energi ApS",              productIdx: 1, daysAgo: 60 },
  { company: "Skagen Beauty ApS",                productIdx: 1, daysAgo: 80 },
  { company: "Skagen Beauty ApS",                productIdx: 5, daysAgo: 80 },
  { company: "Carlsen Logistik A/S",             productIdx: 1, daysAgo: 100 },
  { company: "Carlsen Logistik A/S",             productIdx: 4, daysAgo: 95 },
  { company: "Frostbjerg Fisk A/S",              productIdx: 3, daysAgo: 365 },
  { company: "Frostbjerg Fisk A/S",              productIdx: 4, daysAgo: 200 },
  { company: "GreenLeaf Bio ApS",                productIdx: 1, daysAgo: 30 },
  { company: "Aalborg Tagdækning I/S",           productIdx: 3, daysAgo: 100 },
  { company: "Møllers Mekaniske Værksted ApS",   productIdx: 4, daysAgo: 150 },
];
for (const cp of cpDefs) {
  const company = co(cp.company);
  if (!company) continue;
  await db.customerProduct.create({
    data: {
      tenantId,
      companyId: company.id,
      productId: products[cp.productIdx].id,
      startDate: daysAgo(cp.daysAgo),
      isActive: true,
    },
  });
}
console.log(`✅ ${cpDefs.length} customer-product tilknytninger`);

// ============================================================
// 15. Fakturaer
// ============================================================
const invoiceDefs = [
  // Kladder
  { company: "Bjerregaard & Holm Advokater A/S", projectIdx: 0, status: "draft", customerType: "B2B", daysOld: 2, dueDays: 30,
    lines: [
      { description: "Konsulent-timer maj 2026 (28t × 1.300 kr.)", quantity: 28, unitPrice: 1300, type: "time", discountPct: 0 },
      { description: "Plesner Cloud Suite Pro × 80 brugere (juni)", quantity: 80, unitPrice: 895, type: "product", discountPct: 5 },
    ] },
  { company: "Carlsen Logistik A/S", projectIdx: 2, status: "draft", customerType: "B2B", daysOld: 1, dueDays: 30,
    lines: [
      { description: "GPS-installations-timer × 45", quantity: 45, unitPrice: 1300, type: "time", discountPct: 0 },
      { description: "Fortinet 100F installation",   quantity: 1, unitPrice: 14500, type: "product", discountPct: 0 },
    ] },
  // Sendte
  { company: "NordVind Energi ApS", projectIdx: 1, status: "sent", customerType: "B2B", daysOld: 10, dueDays: 20,
    lines: [
      { description: "API-integration timer × 30",   quantity: 30, unitPrice: 1300, type: "time", discountPct: 0 },
      { description: "Plesner Cloud Suite × 5 brugere (juni)", quantity: 5, unitPrice: 495, type: "product", discountPct: 0 },
    ] },
  { company: "Skagen Beauty ApS", projectIdx: 3, status: "sent", customerType: "B2B", daysOld: 15, dueDays: 15,
    lines: [
      { description: "SEO-optimering timer × 18",    quantity: 18, unitPrice: 1300, type: "time", discountPct: 10 },
      { description: "Service-aftale Standard (maj)", quantity: 1, unitPrice: 2500, type: "product", discountPct: 0 },
    ] },
  // Betalt
  { company: "Aalborg Tagdækning I/S", projectIdx: 7, status: "paid", customerType: "B2B", daysOld: 45, dueDays: -15,
    lines: [
      { description: "M365 opsætning timer × 16",    quantity: 16, unitPrice: 1300, type: "time", discountPct: 0 },
      { description: "M365 Business Premium × 25 (april)", quantity: 25, unitPrice: 175, type: "product", discountPct: 0 },
    ] },
  // B2C — privatkunde
  { company: "Niels Vestergaard (privat)", projectIdx: null, status: "sent", customerType: "B2C", daysOld: 5, dueDays: 25,
    lines: [
      { description: "Backup-opsætning hjemmekontor × 4 timer", quantity: 4, unitPrice: 1300, type: "time", discountPct: 0 },
      { description: "Ekstern harddisk 4TB", quantity: 1, unitPrice: 950, type: "product", discountPct: 0 },
    ] },
];

let invoiceNum = 1;
for (const inv of invoiceDefs) {
  const company = co(inv.company);
  if (!company) continue;
  const project = inv.projectIdx !== null && projects[inv.projectIdx] ? projects[inv.projectIdx].project : null;
  await db.invoice.create({
    data: {
      tenantId,
      companyId: company.id,
      projectId: project?.id ?? null,
      number: invoiceNum++,
      status: inv.status,
      issueDate: daysAgo(inv.daysOld),
      dueDate: daysFromNow(inv.dueDays),
      currency: "DKK",
      vatEnabled: true,
      vatPct: 25,
      customerType: inv.customerType,
      notes: inv.status === "paid" ? "Betalt rettidigt — tak!" : null,
      lines: { create: inv.lines.map((l, i) => ({
        description: l.description,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        discountPct: l.discountPct,
        type: l.type,
        sortOrder: i,
      })) },
    },
  });
}
console.log(`✅ ${invoiceDefs.length} fakturaer (kladde/sendt/betalt, B2B+B2C, m. linje-rabat)`);

// ============================================================
// 16. Aktiviteter (møder, calls, opfølgning)
// ============================================================
const activityDefs = [
  { type: "meeting", subject: "Kvartalsmøde med Bjerregaard & Holm",  company: "Bjerregaard & Holm Advokater A/S", daysOffset: 3,  user: "mette@demo.dk",  done: false },
  { type: "call",    subject: "Opfølgning på Cloud Suite Pro tilbud", company: "Bjerregaard & Holm Advokater A/S", daysOffset: -1, user: "mette@demo.dk",  done: true },
  { type: "meeting", subject: "Vindmølle-API kick-off",                company: "NordVind Energi ApS",              daysOffset: 5,  user: "anders@demo.dk", done: false },
  { type: "task",    subject: "Send revised tilbud — Cloud Suite Pro upgrade", company: "Skagen Beauty ApS",        daysOffset: 1,  user: "sofie@demo.dk",  done: false },
  { type: "call",    subject: "Opfølgning på POS-fryse-problem",       company: "GreenLeaf Bio ApS",                daysOffset: -2, user: "sofie@demo.dk",  done: true },
  { type: "meeting", subject: "GPS-platform demo for hele kunde-team", company: "Carlsen Logistik A/S",             daysOffset: 7,  user: "mette@demo.dk",  done: false },
  { type: "followup", subject: "Følg op på MFA-roll-out",              company: "Bjerregaard & Holm Advokater A/S", daysOffset: 10, user: "lars@demo.dk",   done: false },
  { type: "note",    subject: "Kunden har nævnt mulig ekspansion til Norge", company: "Carlsen Logistik A/S",        daysOffset: -5, user: "mette@demo.dk",  done: true },
];

for (const a of activityDefs) {
  const company = co(a.company);
  if (!company) continue;
  const user = users[a.user];
  const contact = await firstContact(company.id);
  await db.activity.create({
    data: {
      tenantId,
      userId: user.id,
      type: a.type,
      subject: a.subject,
      description: a.type === "note" ? "Vigtig kommerciel info — diskutér på næste pipeline-møde." : null,
      dueDate: daysFromNow(a.daysOffset),
      completedAt: a.done ? daysFromNow(a.daysOffset) : null,
      companyId: company.id,
      contactId: contact?.id ?? null,
    },
  });
}
console.log(`✅ ${activityDefs.length} aktiviteter`);

// ============================================================
// 17. Login-history på users (for senere logins-grafer)
// ============================================================
for (const u of Object.values(users)) {
  await db.user.update({
    where: { id: u.id },
    data: { lastLogin: daysAgo(Math.floor(Math.random() * 3)) },
  });
}

console.log("\n🎉 Demo-miljø klart!");
console.log(`   Login som: admin@demo.dk / Demo2026!`);
console.log(`   Eller:     mette@demo.dk / Demo2026! (konsulent)`);
console.log(`   Tenant:    demo.plesnertech.dk (lokal: ?tenant=demo)`);
console.log("");

await db.$disconnect();
