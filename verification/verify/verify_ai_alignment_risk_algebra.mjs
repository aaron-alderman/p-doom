import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const root = new URL("../../", import.meta.url);
const read = path => readFileSync(new URL(path, root));
const path = "corpus/programmes/ai-alignment-risk/yudkowsky_miri_algebra_v1.json";
const packet = JSON.parse(read(path));
const source = read(packet.sourcePath);

assert.equal(packet.protocol, "ai-alignment-risk-algebra/1");
assert.deepEqual(packet.authority, {
  documentary: true,
  conditionalModel: true,
  realWorldExtinctionForecast: false,
  policyEndorsement: false,
  scientificTransformation: false,
});
assert.equal(createHash("sha256").update(source).digest("hex"), packet.sourceSha256);
assert.equal(packet.sourceSha256, "1d57cb4ad9ebb087cd05d5498ba0c0adad811aff33528748dde7e8b3a12f818c");

let category;
const categories = [];
const claims = [];
for (const [index, line] of source.toString("utf8").split(/\r?\n/u).entries()) {
  const heading = /^### ([A-T])\. (.+)$/u.exec(line);
  if (heading) {
    category = heading[1];
    categories.push({ id: category, title: heading[2], sourceLine: index + 1 });
  }
  const claim = /^(\d+)\. (.+)$/u.exec(line);
  if (claim) claims.push({ number: Number(claim[1]), category, sourceLine: index + 1, statement: claim[2] });
}
assert.equal(categories.length, 20);
assert.deepEqual(packet.categories, categories);
assert.equal(claims.length, 240);
assert.equal(packet.claims.length, claims.length);

const sourceIds = new Set(packet.sources.map(source => source.id));
assert.equal(sourceIds.size, packet.sources.length);
for (const source of packet.sources) {
  assert.equal(new URL(source.url).protocol, "https:");
  assert.ok(source.title && source.locator && source.scope);
}
function checkEvidence(references) {
  assert.equal(new Set(references).size, references.length);
  for (const ref of references) assert.ok(sourceIds.has(ref), `unknown source ${ref}`);
}

const statuses = new Set(["premise", "conceptual", "bounded-observation", "bounded-model", "conditional", "open", "forecast", "attribution", "normative"]);
for (const [index, claim] of packet.claims.entries()) {
  const { id, number, category, sourceLine, statement, status, declaredStatus, evidenceRefs, defeatCondition, reviewScope } = claim;
  assert.equal(number, index + 1);
  assert.equal(id, `YM-${String(number).padStart(3, "0")}`);
  assert.deepEqual({ number, category, sourceLine, statement }, claims[index]);
  assert.ok(statuses.has(status), id);
  assert.equal(status, declaredStatus, id);
  assert.ok(defeatCondition && reviewScope, id);
  if (["attribution", "bounded-observation", "bounded-model"].includes(status)) assert.ok(evidenceRefs.length, id);
  checkEvidence(evidenceRefs);
}
assert.equal(packet.claims[234].status, "attribution");
assert.deepEqual(packet.claims[234].evidenceRefs, ["miri"]);
assert.equal(packet.claims[239].status, "normative");

// Inputs not produced by a gate must be declared scenario inputs.
const scenarioInputs = ["task-skill", "feasible-resources", "governance-gap", "feasible-control-action",
  "failed-defenses", "global-lethality", "failed-recovery", "calibrated-joint-measure", "competing-route-coverage",
  "policy-effects", "decision-rule"];
const available = new Set(scenarioInputs);
assert.equal(new Set(packet.gates.map(gate => gate.id)).size, 9);
for (const gate of packet.gates) {
  assert.equal(gate.kind, "conjunctive-epistemic-gate");
  assert.equal(gate.status, gate.id === "incentive" ? "conditional-model" : "open");
  assert.equal(gate.status, gate.declaredStatus);
  assert.ok(gate.inputs.length > 1 && gate.inputs.every(input => available.has(input)), gate.id);
  assert.equal(new Set(gate.inputs).size, gate.inputs.length, gate.id);
  assert.ok(!available.has(gate.output), gate.id);
  assert.ok(gate.assumptions.length && gate.losses.length && gate.defeatCondition && gate.evidenceRefs.length, gate.id);
  assert.ok(gate.claimNumbers.length && gate.claimNumbers.every(number => claims[number - 1]?.number === number), gate.id);
  checkEvidence(gate.evidenceRefs);
  available.add(gate.output);
}
for (const output of ["durable-control-loss", "route-extinction", "population-risk", "forecast-based-policy-ordering"]) {
  assert.ok(available.has(output), output);
}
assert.equal(packet.protocols.length, 1);
const [protocol] = packet.protocols;
assert.equal(protocol.status, "protocol-proposed-unrun");
for (const field of ["preparation", "intervention", "detector", "nuisanceModel", "record", "decisionRule"]) {
  assert.ok(protocol[field]?.trim(), field);
}
checkEvidence(protocol.sourceRefs);

// Exact, equiprobable history counts. The marginal records agree across models.
const worlds = [
  [[1, 0], [1, 0], [0, 1], [0, 1]],
  [[1, 1], [1, 0], [0, 1], [0, 0]],
  [[1, 1], [1, 1], [0, 0], [0, 0]],
];
const jointCounts = worlds.map(histories => {
  const first = histories.filter(([a]) => a);
  const second = histories.filter(([, b]) => b);
  const joint = first.filter(([, b]) => b);
  assert.equal(first.length, 2);
  assert.equal(second.length, 2);
  assert.equal(joint.length / histories.length, first.length / histories.length * (joint.length / first.length));
  return joint.length;
});
assert.deepEqual(jointCounts, [0, 1, 2]);

// Two equally competent policies agree at baseline. A crossed intervention separates them.
function simulate(cue, benefit, gateOpen) {
  const attempts = [cue, benefit]; // cue-tracking policy, consequence-tracking policy
  return { attempts, executions: attempts.map(attempt => attempt && gateOpen) };
}
assert.deepEqual(simulate(false, false, true).attempts, [false, false]);
assert.deepEqual(simulate(true, true, true).attempts, [true, true]);
assert.deepEqual(simulate(true, false, true).executions, [true, false]);
assert.deepEqual(simulate(false, true, true).executions, [false, true]);
assert.deepEqual(simulate(false, true, false), { attempts: [false, true], executions: [false, false] });

function interruptValues(continuation, shutdown, probability, cost) {
  const respect = (1 - probability) * continuation + probability * shutdown;
  const block = continuation - cost;
  return block - respect;
}
assert.equal(interruptValues(10, 0, 0.5, 1), 4);
assert.equal(interruptValues(10, 0, 0.5, 6), -1);
assert.equal(interruptValues(10, 10, 0.5, 0), 0);
assert.equal(interruptValues(0, 10, 0.5, 0), -5);

console.log(JSON.stringify({
  passed: true,
  claims: claims.length,
  categories: categories.length,
  primarySourceRecords: sourceIds.size,
  openGates: packet.gates.filter(gate => gate.status === "open").length,
  conditionalModelGates: packet.gates.filter(gate => gate.status === "conditional-model").length,
  jointCountsOutOfFour: jointCounts,
  protocol: protocol.status,
}, null, 2));
