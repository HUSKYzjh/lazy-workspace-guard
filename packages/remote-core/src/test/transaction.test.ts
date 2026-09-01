import assert from "node:assert/strict";
import test from "node:test";
import { runTransaction, type TransactionOperation } from "../transaction";

function operation(label: string, events: string[], fail = false): TransactionOperation {
  return {
    label,
    async apply() {
      events.push(`apply:${label}`);
      if (fail) {
        throw new Error(`${label} failed`);
      }
    },
    async rollback() {
      events.push(`rollback:${label}`);
    }
  };
}

test("applies all transaction operations in order", async () => {
  const events: string[] = [];
  await runTransaction([operation("watcher", events), operation("search", events)]);
  assert.deepEqual(events, ["apply:watcher", "apply:search"]);
});

test("rolls completed operations back in reverse order when an update fails", async () => {
  const events: string[] = [];
  await assert.rejects(
    runTransaction([operation("watcher", events), operation("search", events, true), operation("python", events)]),
    /search failed/
  );
  assert.deepEqual(events, ["apply:watcher", "apply:search", "rollback:watcher"]);
});
