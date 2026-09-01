import assert from "node:assert/strict";
import test from "node:test";
import { DiagnosticSampler } from "../diagnosticSampling";

function sample(capturedAt: number, rss: number) {
  return { capturedAt, rss, heapUsed: 10, heapTotal: 20, external: 5 };
}

test("keeps a stable baseline while bounding sample history", () => {
  const sampler = new DiagnosticSampler(sample(1, 100), 2);
  sampler.record(sample(2, 120));
  sampler.record(sample(3, 130));

  assert.deepEqual(sampler.getBaseline(), sample(1, 100));
  assert.deepEqual(sampler.getSamples(), [sample(2, 120), sample(3, 130)]);
  assert.equal(sampler.getRssDelta(), 30);
});

test("resets the baseline and discards earlier samples", () => {
  const sampler = new DiagnosticSampler(sample(1, 100), 3);
  sampler.record(sample(2, 120));
  sampler.resetBaseline(sample(3, 90));

  assert.deepEqual(sampler.getBaseline(), sample(3, 90));
  assert.deepEqual(sampler.getSamples(), [sample(3, 90)]);
  assert.equal(sampler.getRssDelta(), 0);
});
