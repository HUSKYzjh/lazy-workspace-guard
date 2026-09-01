import assert from "node:assert/strict";
import test from "node:test";
import {
  buildResolvedScpDownloadCommand,
  buildResolvedSshCommand,
  buildSshCommand,
  normalizeHostAlias,
  parseEffectiveSshConfiguration,
  parseSshHostAliases
} from "../sshConfig";

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

test("resolves OpenSSH output into explicit SSH and download commands", () => {
  const configuration = parseEffectiveSshConfiguration(
    "user zhaijiahui\nhostname login.example.edu\nport 2202\nidentityfile C:\\Users\\zhaijiahui\\.ssh\\id_ed25519\nproxyjump gateway.example.edu\nidentitiesonly yes\nproxycommand none\n"
  );

  assert.deepEqual(configuration, {
    user: "zhaijiahui",
    hostname: "login.example.edu",
    port: "2202",
    identityFiles: ["C:\\Users\\zhaijiahui\\.ssh\\id_ed25519"],
    proxyJump: "gateway.example.edu",
    proxyCommand: "none",
    identitiesOnly: "yes"
  });
  assert.deepEqual(
    buildResolvedSshCommand("SAI-8V100", "C:\\Users\\zhaijiahui\\.ssh\\config", "C:\\Users\\zhaijiahui\\.ssh\\config", configuration),
    {
      command: "ssh -p 2202 -i \"C:\\Users\\zhaijiahui\\.ssh\\id_ed25519\" -J \"gateway.example.edu\" -o IdentitiesOnly=yes zhaijiahui@login.example.edu",
      usesConfigFallback: false
    }
  );
  assert.deepEqual(
    buildResolvedScpDownloadCommand(
      "SAI-8V100",
      "C:\\Users\\zhaijiahui\\.ssh\\config",
      "C:\\Users\\zhaijiahui\\.ssh\\config",
      "/home/zhaijiahui/results/figure.png",
      configuration
    ),
    {
      command: "scp -P 2202 -i \"C:\\Users\\zhaijiahui\\.ssh\\id_ed25519\" -J \"gateway.example.edu\" -o IdentitiesOnly=yes \"zhaijiahui@login.example.edu:/home/zhaijiahui/results/figure.png\" .",
      usesConfigFallback: false
    }
  );
});

test("keeps complex ProxyCommand profiles config-backed", () => {
  const configuration = parseEffectiveSshConfiguration("hostname internal.example\nuser user\nproxycommand ssh jump nc %h %p\n");
  assert.deepEqual(
    buildResolvedScpDownloadCommand("internal", "/home/user/.ssh/config", "/home/user/.ssh/config", "/tmp/file.txt", configuration),
    { command: "scp \"internal:/tmp/file.txt\" .", usesConfigFallback: true }
  );
});
