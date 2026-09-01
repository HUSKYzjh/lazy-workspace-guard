import assert from "node:assert/strict";
import test from "node:test";
import { buildSshCommand, normalizeHostAlias, parseSshHostAliases } from "../sshConfig";

test("lists only explicit SSH Host aliases", () => {
  assert.deepEqual(
    parseSshHostAliases("Host SAI-8V100 gpu\n  HostName hpc.example\nHost * !ignored\nHost gpu # duplicate\n"),
    ["gpu", "SAI-8V100"]
  );
});

test("builds an alias command without exposing resolved credentials", () => {
  assert.equal(buildSshCommand("SAI-8V100", "/home/user/.ssh/config", "/home/user/.ssh/config"), "ssh SAI-8V100");
  assert.equal(
    buildSshCommand("SAI-8V100", "/home/user/custom config", "/home/user/.ssh/config"),
    "ssh -F \"/home/user/custom config\" SAI-8V100"
  );
  assert.equal(normalizeHostAlias(" SAI-8V100 "), "SAI-8V100");
  assert.equal(normalizeHostAlias("bad;command"), undefined);
});
