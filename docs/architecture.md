# Package Architecture

The suite separates code by VS Code's extension-host boundary. This allows the remote browser to use Remote-SSH filesystems while the command generator reads the local user's OpenSSH configuration.

## Lazy Workspace Guard

`packages/lazy-workspace-guard/` is the public entry point, published as `hpc-tools.lazy-workspace-guard`. It is an Extension Pack and user guide. Installing it pulls the two components below; it contains no filesystem-scanning runtime.

## Remote Core

`packages/remote-core/` is `hpc-tools.lazy-workspace-guard-remote-core` with `extensionKind: ["workspace"]`. It runs on the connected Remote-SSH host, reads only user-expanded directories, and never creates a file watcher or recursive scan.

## Local Bridge

`packages/local-bridge/` is `hpc-tools.lazy-workspace-guard-local-bridge` with `extensionKind: ["ui"]`. It runs on the local client, resolves a selected alias through `ssh -G`, and copies `ssh` or `scp` commands. It does not read private-key contents or send SSH configuration to the remote extension.
