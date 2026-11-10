# p(doom) Encounter Challenge

Pick one of 240 propositions in the Yudkowsky–MIRI argument. Freeze a claim at a scope you can test. Return a proof, a reproducible observation, a clean counterexample, or the exact input that blocks the work.

Run from the repository root with Node.js 24.

```powershell
node applications/pdoom-encounter/preview.mjs
```

Open [the local preview](http://127.0.0.1:4199/). The board is searchable by claim ID and text and filterable by category. Five starter trails cover shutdown incentives, evaluation blind spots, strategic leverage, extinction and the 90% attribution. Each claim opens its current assessment, available primary sources, related argument gates and a field notebook. You can switch claims and return to your draft in the same tab.

Three illustrated field dispatches give readers another way in. Each starts with a thought experiment, follows it through published work and ends with a test for the field notebook. Readers can take the test, follow a related dispatch, or return to the board. The dispatches are original editorial writing inspired by the form of Yudkowsky's argument.

## What to bring back

State the exact proposition, its assumptions, the strongest rival explanation, the certificate or replay plan, and the observation that would defeat the proposition. For a result, include the scope of the result and the smallest useful next step. A blocked trail should name the missing input precisely. Export an open plan for critique or a scoped result for review.

Prepare a public submission to open a draft in the [GitHub review queue](https://github.com/aaron-alderman/p-doom/issues). Review the text, add supporting files, and post from your own GitHub account. The same proposal can be downloaded as JSON. It pins the selected claim, the corpus register bytes, the original attachment identity and the Encounter source. Drafts live in the current tab and reset on refresh.

## Source and replay

The [p(doom) dossier register](../../corpus/programmes/ai-alignment-risk/yudkowsky_miri_algebra_v1.json) controls the argument and its statuses. [Challenge source](source/challenge.encounter) owns starter trails, search, claim inspection, draft routing, worksheet validation and the review packet and issue draft. [Dispatch source](source/dispatches.encounter) owns article content, source references, and the passages between dispatches and the notebook. The build checks that every dispatch resolves to an existing claim, a related dispatch, and its cited sources. The exported packet binds both Encounter modules. The build reuses the retained Creator Studio process frontend, Temple lowering and admission, kernel, and browser mechanisms. HTML and CSS supply presentation. The build writes the disposable static bundle under `.build/site/`.

The [artwork notes](source/art/README.md) record the four original illustrations generated with the built-in image tool and the prompts used for them.

The challenge borrows the [Halloween Monster Hunt](https://github.com/aaron-alderman/halloween-monster-hunt/blob/main/FOR_AGENTS.md) rule that an adverse result is useful when it has a reproducible scope and a reopening condition.

```powershell
node --test applications/pdoom-encounter/challenge.test.mjs
node verification/verify/verify_ai_alignment_risk_algebra.mjs
```
