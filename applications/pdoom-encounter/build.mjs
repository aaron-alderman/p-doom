import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";

const app = new URL("./", import.meta.url);
const studio = new URL("../creator-studio/", app);
const vendor = new URL("vendor/worldwright/", studio);
const require = createRequire(vendor);
const output = new URL(".build/site/", app);
const registerPath = "corpus/programmes/ai-alignment-risk/yudkowsky_miri_algebra_v1.json";
const register = new URL(`../../${registerPath}`, app);
const read = file => readFile(file, "utf8");
const json = async file => JSON.parse(await read(file));
const digest = text => createHash("sha256").update(text).digest("hex");
const budget = 20_000_000;
const { createProcessCompiler } = require("./bootstrap/ports/process-source.cjs");
const { createKernel } = require("./bootstrap/temple-seed.cjs");
const { lower } = require("./bootstrap/ports/algebra-lower.cjs");
const { valuePorts } = require("./bootstrap/ports/value.cjs");
const { computationalPorts } = require("./bootstrap/ports/browser-effects.cjs");
const { invoke } = require("./bootstrap/ports/programme.cjs");

const manifest = {
  entry: "pd.boot",
  agentEntry: "pd.inspect",
  budget,
  grants: [
    "kernel.invoke", "text.trim", "text.replaceAll", "text.split", "text.match",
    "json.stringify", "value.describe", "value.string", "number.calculate", "record.put", "text.utf8Length",
    "browser.on", "browser.property", "browser.focus", "browser.write",
    "browser.content", "state.get", "state.set", "download.text",
  ],
};

export async function loadChallenge() {
  const files = ["source/challenge.encounter", "source/dispatches.encounter"];
  const [sources, registerText] = await Promise.all([
    Promise.all(files.map(file => read(new URL(file, app)))),
    read(register),
  ]);
  const compiler = await createProcessCompiler({
    read: file => read(new URL(file, studio)),
    digest,
  }, "source/languages/usewords-frontend.json", budget);
  const compiled = [];
  for (const [index, file] of files.entries()) compiled.push(await compiler.compile(file, sources[index]));
  const html = await json(new URL("algebra/html.process.json", vendor));
  const queries = { "html.escape": html.queries["html.escape"] };
  for (const module of compiled) {
    for (const [name, steps] of Object.entries(module.surface.queries)) {
      if (Object.hasOwn(queries, name)) throw new Error(`Duplicate Encounter process: ${name}`);
      queries[name] = steps;
    }
  }
  for (const module of compiled) await compiler.link(module.surface, queries);

  const ports = { ...valuePorts(), ...computationalPorts() };
  const lowerer = await json(new URL("algebra/lowering.process.json", vendor));
  const definitions = await json(new URL("algebra/operators.expression.json", vendor));
  const lowerModel = input => lower({
    compiler: lowerer, definitions, primitives: createKernel.operators,
    input, mode: "model", ports, limit: budget,
  });
  const model = await lowerModel({ entry: manifest.entry, queries });
  const admission = await lowerModel(await json(new URL("algebra/admission.process.json", vendor)));
  const profile = await json(new URL("bootstrap/kernel-profile.json", vendor));
  for (const entry of ["admit.model", "admit.effects"]) {
    await invoke({ model: admission, entry, input: { target: model, profile, grants: manifest.grants }, ports, limit: budget });
  }
  const data = {
    dossier: JSON.parse(registerText),
    dossierPath: registerPath,
    dossierSha256: digest(registerText),
    processSha256: digest(JSON.stringify(compiled.map(module => module.sourceHash))),
  };
  const run = async (entry, eventInput = {}) => (await invoke({
    model, entry, input: { data, eventInput }, ports,
    nested: ["kernel.invoke"], limit: budget,
  })).value;
  await run("pd.checkBoard");
  await run("pd.checkDispatches");
  return { model, data, run, registerText };
}

export async function build() {
  const { model, data, run, registerText } = await loadChallenge();
  const images = ["observatory", "social-card", ...(await run("pd.dispatches")).map(story => story.id)];
  const files = {
    seed: new URL("bootstrap/temple-seed.cjs", vendor),
    value: new URL("bootstrap/ports/value.cjs", vendor),
    effects: new URL("bootstrap/ports/browser-effects.cjs", vendor),
    browser: new URL("bootstrap/ports/browser.cjs", vendor),
    bridge: new URL("bootstrap/ports/kernel.cjs", vendor),
    client: new URL("bootstrap/client.cjs", studio),
  };
  const modules = await Promise.all(Object.entries(files).map(async ([name, file]) =>
    `modules[${JSON.stringify(name)}] = (() => { const module = { exports: {} };\n${await read(file)}\nreturn module.exports; })();`));
  const payload = JSON.stringify({ model, data, manifest })
    .replaceAll("<", "\\u003c").replaceAll("\u2028", "\\u2028").replaceAll("\u2029", "\\u2029");
  const bundle = `/* Encounter compilation and retained browser mechanisms. */\n(async () => {\n"use strict";\nconst modules = {};\n${modules.join("\n")}\nawait modules.client.start(${payload}, modules);\n})().catch(error => { document.querySelector("[data-temple-errors]").textContent = error.message; console.error(error); });\n`;
  await mkdir(new URL("art/", output), { recursive: true });
  await Promise.all([
    writeFile(new URL("index.html", output), await read(new URL("source/index.html", app))),
    writeFile(new URL("style.css", output), await read(new URL("source/style.css", app))),
    writeFile(new URL("app.js", output), bundle),
    writeFile(new URL("dossier.json", output), registerText),
    ...images.map(id => copyFile(new URL(`source/art/${id}.jpg`, app), new URL(`art/${id}.jpg`, output))),
  ]);
  return output;
}
