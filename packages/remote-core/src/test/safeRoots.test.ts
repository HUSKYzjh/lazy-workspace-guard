import assert from "node:assert/strict";
import test from "node:test";
import {
  addSafeRoot,
  canStartSafeRemoteBrowse,
  getRemoteDirectoryCompletionContext,
  normalizeSafeRemoteDirectoryPath,
  removeSafeRoot,
  restoreSafeRemoteDirectoryPaths,
  supportsSafeRemoteBackend
} from "../safeRoots";

test("adds each safe remote URI once", () => {
  const root = "vscode-remote://ssh-remote+cluster/home/user/project";
  assert.deepEqual(addSafeRoot([], root), [root]);
  assert.deepEqual(addSafeRoot([root], root), [root]);
});

test("removes only the selected safe remote URI", () => {
  const first = "vscode-remote://ssh-remote+cluster/home/user/a";
  const second = "vscode-remote://ssh-remote+cluster/home/user/b";
  assert.deepEqual(removeSafeRoot([first, second], first), [second]);
});

test("accepts and normalizes only absolute remote Linux paths", () => {
  assert.equal(normalizeSafeRemoteDirectoryPath("/home/user/project"), "/home/user/project");
  assert.equal(normalizeSafeRemoteDirectoryPath(" /home/user/../user/project "), "/home/user/project");
  assert.equal(normalizeSafeRemoteDirectoryPath("vscode-remote://ssh-remote+cluster/home/user/project"), undefined);
  assert.equal(normalizeSafeRemoteDirectoryPath("relative/project"), undefined);
  assert.equal(normalizeSafeRemoteDirectoryPath("/home/user\0project"), undefined);
});

test("derives a bounded completion parent and prefix from an absolute path", () => {
  assert.deepEqual(getRemoteDirectoryCompletionContext("/home/zhaijiahui/work"), {
    parentPath: "/home/zhaijiahui",
    prefix: "work"
  });
  assert.deepEqual(getRemoteDirectoryCompletionContext("/home/zhaijiahui/"), {
    parentPath: "/home/zhaijiahui",
    prefix: ""
  });
  assert.equal(getRemoteDirectoryCompletionContext("home/zhaijiahui"), undefined);
});

test("restores only unique, normalized absolute paths from persisted storage", () => {
  assert.deepEqual(
    restoreSafeRemoteDirectoryPaths([" /home/user/project ", "/home/user/../user/project", 1, "relative/path"]),
    ["/home/user/project"]
  );
});

test("allows safe browsing only in an empty Remote-SSH window", () => {
  assert.equal(canStartSafeRemoteBrowse("ssh-remote", 0), true);
  assert.equal(canStartSafeRemoteBrowse("ssh-remote", 1), false);
  assert.equal(canStartSafeRemoteBrowse(undefined, 0), false);
});

test("limits the bounded listing backend to Linux remotes", () => {
  assert.equal(supportsSafeRemoteBackend("linux"), true);
  assert.equal(supportsSafeRemoteBackend("win32"), false);
  assert.equal(supportsSafeRemoteBackend("darwin"), false);
});
