# Jarvis experimental coding transformer v1

## What it is (and is not)
A from-scratch, **44,544-parameter** conditional, causal Transformer: one attention block, four heads, width 48, an 80-character context, learned positions, and an ASCII character output vocabulary. Korean input is **hashed character 1- and 2-gram features**, not a Korean-language Transformer tokenizer: those features are linearly injected into each decoding position. Inference uses deterministic greedy generation. No downloaded pretrained model, external AI service, unrestricted code search, or generated-code execution is involved. This is not a general programming model and confidently produces erroneous code. Only known types with short answers can work; output is capped at 80 characters. The original request MLP remains available separately because the new model regressed on some old examples.

## Data and training
`code-corpus.json` is from trekhleb/javascript-algorithms revision `85293e3e2b88f4d2ce330d956b139cf628aa1e82`, MIT license `third-party/javascript-algorithms-LICENSE.txt`. Exact-file deduplication and a deterministic folder-based split yield 297 train, 22 validation and 41 test JavaScript files. Code is normalized to ASCII printable characters, tabs and line breaks become spaces, other characters become `?`. No claim of semantic deduplication: related files or patterns can remain across splits. The test was used in an earlier speed trial and previous code-model work, so it is a reused development measure.

Initial seed 20261119, AdamW, batch 16, 6,000 code pretraining updates with a best validation checkpoint selected at 6,000. Then 7,000 instruction updates over 216 human-written Korean requests of 22 types (`training/transformer-instructions.json`), with the best validation loss checkpoint selected at step 2,000. All 22 target answer strings were seen during supervised training; exact answer generation may be memorization. Validation uses 44 paraphrases of the same types; 38/44 exact after training. Frozen `training/transformer-training-log.txt` and `training/transformer-validation.json` record the run. On the same 30,720 reused held-out code windows, next-character accuracy was 1.0% initially, 56.5% after pretraining and **25.3% after instruction tuning**; cross-entropy was 4.847, 1.674, then **5.321 nats**, respectively. Instruction tuning harmed this measure of general code prediction: this result is not hidden or described as a general improvement.

## Benchmark and comparison
`training/coding-benchmark-v1.json` contains 50 hand-authored requests, fixed before training: 20 new expressions for 10 old MLP types, 24 expressions for 12 newly instructed types, and six types excluded from the instruction question/answer training. Source pretraining may nevertheless contain related code. The baseline old MLP was measured before training and remains available at `training/coding-benchmark-baseline.json`. Both are scored by exact equality to one hand-authored JavaScript answer per task; this can count semantically equivalent programs as wrong. It is a small test, human-authored by the same team as the training data, and expressions can overlap; it does not represent general coding accuracy.

| subset | old instruction MLP | new transformer |
|---|---:|---:|
| original 10 types, 20 requests | 15/20 | 13/20 |
| 12 additional trained types, 24 requests | 0/24 | 17/24 |
| 6 instruction-held-out types | 0/6 | 0/6 |
| all | 15/50 | 30/50 |

The old model was trained on 10 task types, the new on 22; therefore this comparison **does not isolate model architecture**. One held-out reference has 82 characters and cannot exactly match the new model's 80-character output cap; exact-match score penalizes the new model on that case. After the checkpoint and initial 50-case results were fixed, a separate small set of 30 manually written prompts was created (`training/transformer-fresh-probes.json`): on 20 expressions of trained types the old model matched 7/20 and the new 14/20; on 10 instruction-excluded types both matched 0/10. Two references in that latter set exceed the transformer's 80-character cap. Some excluded types also appeared in the first benchmark, and these probes use similar vocabulary; this does not establish broad generalization.

`tests/coding-benchmark.test.js` separately checks the hand-authored canonical programs against independent input/output examples: 90 checks corresponding to the new model's exact matches and 45 to the old model's matches. Only the fixed audited canonical code is evaluated in a Node VM; VM is not a security boundary and arbitrary model or user code is never run.

## Example checking and bounded repair proposals
`자비스 코딩 트랜스포머 보고`

`자비스 코딩 트랜스포머 두 숫자를 더하는 함수를 만들어줘 | [{"args":[2,3],"output":5},{"args":[-2,4],"output":2}]`

The generated source is compared **as text** against 22 predefined known snippets. Only if there is an exact match does `coding-auditor.js` run its separately written reference operation on 2–8 user examples; it never executes the model's source or arbitrary JavaScript. Integers are restricted to -1000…1000, numeric arrays to 100 elements, and strings to 256 UTF-16 code units. If the generated snippet fails or is not recognized, the tool compares up to **22 predefined reference operations** with the examples. It offers a candidate only when exactly one matches; multiple matches trigger a request for distinguishing examples. This is bounded, deterministic search over fixed operations, not unconstrained coding, training, self-improvement, or proof of the user's intent. Passing examples does not guarantee correctness on other inputs. No arbitrary code sandbox is claimed.

For a reproducible failed-generation/suggestion example:
`자비스 코딩 트랜스포머 배열 안에 들어 있는 원소의 개수를 반환해줘 | [{"args":[[1,2,3]],"output":3},{"args":[[]],"output":0}]`

The neural model first returns an even-filter snippet; both examples fail and a known length snippet is offered as an example-matching candidate. It does not silently replace the model output.

## Browser, offline and reproduction
The original and new models have separate commands, and previously saved app data is unchanged. `transformer-coding-model.js` and `coding-auditor.js` are in the offline shell; `transformer-coding-weights.json` (~900 KB) loads lazily. First model use needs a connection; after successful download it may work offline while service-worker cache remains. New app versions or cache eviction can require another download. Mobile Chromium tests are emulation, not physical Galaxy A17 performance, memory, camera, or PWA verification.

To reproduce (PyTorch CPU and NumPy required, no model downloads):
```
python3 tools/build_coding_benchmark.py
node tools/evaluate_coding_baseline.js
OPENBLAS_NUM_THREADS=1 python3 tools/train_coding_transformer.py --pretrain-steps 6000 --steps 7000 --batch 16 --interval 500
node tools/evaluate_coding_transformer.js
python3 tools/build_transformer_fresh_probes.py
node tools/evaluate_transformer_fresh.js
node tests/coding-benchmark.test.js
node tests/coding-auditor.test.js
node tests/transformer-coding-model.test.js
OPENBLAS_NUM_THREADS=1 python3 tools/verify_coding_transformer.py
```
`verify_coding_transformer.py` checks 80 Python/JS generated strings, dataset splits, saved held-out next-character metrics, updated weights and a finite-difference autograd check. Results can vary with PyTorch/platform numerical implementation. Mobile browser test: `NODE_PATH=<playwright-node-modules> node tests/transformer-browser.test.js`.
