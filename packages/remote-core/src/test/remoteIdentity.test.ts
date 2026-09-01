import assert from "node:assert/strict";
import test from "node:test";
import {
  getRemoteScopedStorageKey,
  getRemoteSshHost,
  getSshCommand,
  getSshCommandForHost,
  normalizeSshHostAlias
} from "../remoteIdentity";

test("scopes persisted values to the connected Remote-SSH host", () => {
  const firstHost = 'ssh-remote+{"hostName":"SAI-8V100"}';
  const secondHost = 'ssh-remote+{"hostName":"OTHER-HPC"}';

  assert.equal(
    getRemoteScopedStorageKey("safeRemoteDirectoryPaths", firstHost),
    getRemoteScopedStorageKey("safeRemoteDirectoryPaths", firstHost)
  );
  assert.notEqual(
    getRemoteScopedStorageKey("safeRemoteDirectoryPaths", firstHost),
    getRemoteScopedStorageKey("safeRemoteDirectoryPaths", secondHost)
  );
  assert.notEqual(
    getRemoteScopedStorageKey("directorySortMode", firstHost),
    getRemoteScopedStorageKey("directorySortMode", secondHost)
  );
  assert.notEqual(
    getRemoteScopedStorageKey("safeRemoteDirectoryPaths", "ssh-remote", "hpc-a"),
    getRemoteScopedStorageKey("safeRemoteDirectoryPaths", "ssh-remote", "hpc-b")
  );
});

test("reads legacy, JSON, and hexadecimal JSON Remote-SSH authorities", () => {
  assert.equal(getRemoteSshHost("ssh-remote+SAI-8V100"), "SAI-8V100");
  assert.equal(getRemoteSshHost('ssh-remote+{"hostName":"SAI-8V100"}'), "SAI-8V100");
  assert.equal(
    getRemoteSshHost("ssh-remote+7b22686f73744e616d65223a225341492d3856313030227d"),
    "SAI-8V100"
  );
});

test("returns a directly usable SSH command only for a safe host alias", () => {
  assert.equal(getSshCommand('ssh-remote+{"hostName":"SAI-8V100"}'), "ssh SAI-8V100");
  assert.equal(getSshCommand("ssh-remote+bad host"), undefined);
  assert.equal(getSshCommand(undefined), undefined);
  assert.equal(normalizeSshHostAlias(" SAI-8V100 "), "SAI-8V100");
  assert.equal(getSshCommandForHost("SAI-8V100"), "ssh SAI-8V100");
  assert.equal(getSshCommandForHost("bad;command"), undefined);
});
