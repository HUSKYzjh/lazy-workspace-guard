# Lazy Workspace Guard SSH Bridge

Local UI companion for **Lazy Workspace Guard**. It reads the local OpenSSH configuration file only to list `Host` aliases and returns a command such as `ssh SAI-8V100` to the remote core. It never reads private-key contents, opens an SSH connection, or sends your SSH configuration to a third party.

Install this extension locally. The Remote-SSH window's Lazy Workspace Guard core calls it when copying an SSH command. The first selected alias is remembered per remote machine.
