import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { loadChallenge } from "./build.mjs";

const { data, registerText, run } = await loadChallenge();

test("the Encounter board resolves all canonical claims and its five starter trails", async () => {
  const all = await run("pd.search", { query: "", category: "" });
  assert.deepEqual(all, data.dossier.claims);
  assert.equal(new Set(all.map(claim => claim.id)).size, 240);
  const starters = await run("pd.starters");
  assert.equal(starters.length, 5);
  for (const trail of starters) {
    assert.equal((await run("pd.inspect", trail.id)).starter.title, trail.title);
  }
  await assert.rejects(run("pd.inspect", "YM-999"), /canonical board/);
});

test("search is literal, case-insensitive and scoped by the selected category", async () => {
  assert.deepEqual((await run("pd.search", { query: " ym-143 ", category: "L" })).map(claim => claim.id), ["YM-143"]);
  assert.deepEqual(await run("pd.search", { query: "ym-143", category: "T" }), []);
  assert.deepEqual(await run("pd.search", { query: ".*", category: "" }), []);
  assert.equal((await run("pd.search", { query: "", category: "T" })).length, 12);
});

test("a proposal pins its source and preserves the distinction between attribution and forecast", async () => {
  const selection = await run("pd.inspect", "YM-235");
  assert.equal(selection.claim.status, "attribution");
  assert.deepEqual(selection.sources.map(source => source.id), ["miri"]);
  const draft = {
    approach: "discriminate",
    proposition: "MIRI published the conditional forecast.",
    scope: "The Problem, opening forecast.",
    rival: "The number was attributed only by a secondary source.",
    test: "Read the identified primary statement.",
    kill: "The source lacks an attributed number under that scenario.",
    disposition: "open",
    result: "",
  };
  const packet = await run("pd.pack", { id: "YM-235", draft });
  assert.equal(packet.authority, "proposal-only");
  assert.equal(packet.claim.statement, selection.claim.statement);
  assert.equal(packet.claim.dossierStatus, "attribution");
  assert.equal(packet.provenance.dossierSha256, createHash("sha256").update(registerText).digest("hex"));
  assert.equal(packet.provenance.attachmentSha256, data.dossier.sourceSha256);
  assert.equal(packet.worksheet.proposition, draft.proposition);
  await assert.rejects(run("pd.pack", { id: "YM-235", draft: { ...draft, rival: "  " } }), /required fields/);
  await assert.rejects(run("pd.pack", { id: "YM-235", draft: { ...draft, disposition: "defeated-in-scope" } }), /missing input/);
  await assert.rejects(run("pd.pack", { id: "YM-235", draft: { ...draft, disposition: "admitted" } }), /supported disposition/);
});

test("the public queue receives the scoped result and preserves long drafts for copying", async () => {
  const draft = {
    approach: "kill",
    disposition: "defeated-in-scope",
    proposition: "Blocking interruption is always preferred in this payoff model.",
    scope: "Two actions. Continuation pays ten. The operator interrupts half the time.",
    rival: "Blocking costs six points.",
    test: "Compare four points from blocking against five from respecting the switch.",
    kill: "A permitted cost reverses the ranking.",
    result: "The cost of six defeats the universal proposition in this model.",
  };
  const packet = await run("pd.pack", { id: "YM-090", draft });
  const issue = await run("pd.reviewIssue", packet);
  assert.equal(issue.title, "[YM-090] Clean kill");
  assert.ok(issue.body.includes(draft.result));
  assert.ok(issue.body.includes(packet.provenance.dossierSha256));
  assert.equal(issue.prefill, true);

  const result = "⚡".repeat(1000);
  const longPacket = await run("pd.pack", { id: "YM-090", draft: { ...draft, result } });
  const longIssue = await run("pd.reviewIssue", longPacket);
  assert.equal(longIssue.prefill, false);
  assert.ok(longIssue.body.includes(result));
});
