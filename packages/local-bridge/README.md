# Lazy Workspace Guard Local Bridge

Local UI companion for **Lazy Workspace Guard Remote Core**. It lists local `Host` aliases, then uses local `ssh -G` to resolve the selected OpenSSH profile without opening a connection. It copies an explicit `ssh` command or a file-specific `scp` download command, including effective host, user, port, identity-file paths, and ProxyJump where they can be represented safely. Complex `ProxyCommand` profiles remain config-backed. It never reads private-key contents or sends SSH configuration to the remote extension or a third party.

Install this extension locally. The Remote-SSH window's Lazy Workspace Guard core calls it when copying an SSH command. The first selected alias is remembered per remote machine.
