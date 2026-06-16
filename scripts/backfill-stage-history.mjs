/**
 * Backfill DealStageHistory for eksisterende deals.
 *
 * Strategi (begrænset af manglende historik):
 *   1) For hvert deal uden historie → opret én entry der dækker hele dets levetid:
 *        enteredAt = createdAt
 *        exitedAt  = null hvis dealet stadig er aabent
 *        exitedAt  = closedAt hvis dealet er won/lost
 *
 *   2) Hvis dealet har closedAt og stage er won/lost, fortolker vi det som:
 *        "Dealet eksisterede i tidligere stadier mellem createdAt og closedAt,
 *         vi har bare ingen praecis breakdown."
 *
 *      For at faa et meningsfuldt velocity-billede laver vi en heuristik:
 *      Vi splitter perioden ligeligt mellem alle stadier op til den endelige.
 *      Eks: oprettet for 60 dage siden, vundet i dag → 4 stadier (new, qualified,
 *      proposal, negotiation) faar hver 15 dage, og 'won' faar 0 dage (afslutning).
 *
 *      Det er en HEURISTIK — fremover (efter denne backfill) bliver historie 100%
 *      præcis fordi updateDealStage logger hver transition.
 *
 * Idempotent: deals der allerede har historie springes over.
 *
 * Koerl: node scripts/backfill-stage-history.mjs
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const STAGE_ORDER = ["new", "qualified", "proposal", "negotiation"];
const TERMINAL_STAGES = new Set(["won", "lost"]);

const deals = await db.deal.findMany({
  include: { stageHistory: { select: { id: true } } },
});

console.log(`Fandt ${deals.length} deals. Backfiller dem uden historie...`);
let created = 0;
let skipped = 0;

for (const deal of deals) {
  if (deal.stageHistory.length > 0) {
    skipped++;
    continue;
  }

  const created_ = deal.createdAt;
  const isTerminal = TERMINAL_STAGES.has(deal.stage);
  const closedAt = deal.closedAt ?? deal.updatedAt;

  if (!isTerminal) {
    // Aabent deal — en raekke der starter ved createdAt
    await db.dealStageHistory.create({
      data: {
        tenantId:  deal.tenantId,
        dealId:    deal.id,
        stage:     deal.stage,
        enteredAt: created_,
        exitedAt:  null,
      },
    });
    created++;
    continue;
  }

  // Terminal deal — split perioden lineært over alle stadier op til terminal
  const stagesPassed = [...STAGE_ORDER, deal.stage]; // f.eks. [new, qualified, proposal, negotiation, won]
  const totalMs = Math.max(closedAt.getTime() - created_.getTime(), 0);
  // Tildel 100% af perioden ligeligt mellem ikke-terminale stadier
  const nonTerminalCount = stagesPassed.length - 1;
  const perStageMs = nonTerminalCount > 0 ? totalMs / nonTerminalCount : 0;

  let cursor = created_.getTime();
  for (let i = 0; i < stagesPassed.length; i++) {
    const stage = stagesPassed[i];
    const isLast = i === stagesPassed.length - 1; // terminal-stadiet
    const enteredAt = new Date(cursor);
    const exitedAt = isLast ? null : new Date(cursor + perStageMs);
    await db.dealStageHistory.create({
      data: {
        tenantId:  deal.tenantId,
        dealId:    deal.id,
        stage,
        enteredAt,
        // For terminal-stage: lad exitedAt vaere null saa "still in stage" semantikken giver mening
        exitedAt,
      },
    });
    cursor += perStageMs;
    created++;
  }
}

console.log(`\nFærdig.\n  Oprettede: ${created} stage-history-rows\n  Sprang over: ${skipped} deals (havde allerede historie)`);
await db.$disconnect();
