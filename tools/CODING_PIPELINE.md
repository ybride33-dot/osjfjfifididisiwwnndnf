# Experimental compositional coding pipeline

This is a deterministic, explicit step composer, not a model or free-form coding AI. The user provides up to ten operations in order; examples are optional. Its main purpose is a broader foundation than the previous one-filter/one-transform array composer: strings, arrays, JSON objects, numbers, and multiple sequential operations. It creates standalone JavaScript from a built-in interpreter and JSON-encoded, allowlisted operations. The app does not run the generated or arbitrary user JavaScript. It only interprets the selected operations against supplied example JSON values. A sample pass is not a correctness guarantee.

Examples:
```
자비스 코딩 설계 도움말
자비스 코딩 설계 앞뒤 공백 제거 -> 소문자 -> 공백으로 나누기 -> 뒤집기 -> 하이픈으로 합치기 | [{"input":"  Hello World  ","output":"world-hello"}]
자비스 코딩 설계 속성 data -> 짝수만 -> 2 곱하기 -> 3 더하기 -> 정렬 -> 합 | [{"input":{"data":[8,1,2,-2]},"output":25}]
```

The app provides copy and download buttons after composing. An input may be JSON string, number, boolean, null, array or object; operations expect specific types. Limits: 1–10 stages, 1–8 examples (optional), JSON text 12,000 characters, each array/object at most 100 members, strings at most 2,000 UTF-16 code units, finite numeric values bounded to ±1 billion, and integer stage arguments within ±999,999. Sort accepts numbers only; join expects strings; even/odd select integer elements only; numeric operations check intermediate values. `length` counts Unicode code points for strings, while string length limit uses UTF-16 units. `mean`, `min`, and `max` return null on an empty array. The pipe character separates example JSON and cannot occur inside it. Data is ephemeral; no new storage is created. See `coding-pipeline.js` for exact semantics.

Tests: `node tests/coding-pipeline.test.js` checks known cases, type and size errors, hostile syntax rejection, example failure reports, routing, and 500 independently calculated random pipelines; it runs only fixed-interpreter code generated from validated steps in a Node VM (not arbitrary user/model source). `NODE_PATH=<playwright-node-modules> node tests/pipeline-browser.test.js` checks a mobile Chromium v20.30 update, actual chat and download, offline use and saved-state preservation. Mobile Chromium emulation is not a physical Galaxy A17 test.
