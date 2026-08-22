import assert from "node:assert/strict";
import test from "node:test";
import { LazyTreeMetrics } from "../metrics";

test("records lazy directory reads without retaining entry objects", () => {
  const metrics = new LazyTreeMetrics();
  metrics.recordDirectoryRead(12, 7);
  metrics.recordDirectoryRead(3, 5);

  assert.deepEqual(metrics.snapshot(), {
    directoryReads: 2,
    entriesListed: 15,
    largestDirectoryListing: 12,
    failedDirectoryReads: 0,
    totalReadMilliseconds: 12
  });
});

test("records failed directory reads in the same timing total", () => {
  const metrics = new LazyTreeMetrics();
  metrics.recordDirectoryReadFailure(9);

  assert.deepEqual(metrics.snapshot(), {
    directoryReads: 1,
    entriesListed: 0,
    largestDirectoryListing: 0,
    failedDirectoryReads: 1,
    totalReadMilliseconds: 9
  });
});

test("resets all accumulated tree metrics", () => {
  const metrics = new LazyTreeMetrics();
  metrics.recordDirectoryRead(3, 2);
  metrics.recordDirectoryReadFailure(1);
  metrics.reset();

  assert.deepEqual(metrics.snapshot(), {
    directoryReads: 0,
    entriesListed: 0,
    largestDirectoryListing: 0,
    failedDirectoryReads: 0,
    totalReadMilliseconds: 0
  });
});
