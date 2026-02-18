# Sandbox CLI

Small CLI for creating and managing Apple `container` sandboxes.

Made as a helper for developing Openclaw or other tools where you need to 
make and manage multiple containers at runtime with minimal instructions.

For simple use cases, 
- Create a container with a provided image
- Copies a host folder to the container (upon creation), for instance a workspace in an Openclaw like tool
- Run a shell script in the container (upon creation) - set up installs etc..

## Commands

```bash
./sandbox create <dir> [dir...] [-n name] [-i image] [-d dest-base] [-s script.sh]
./sandbox ls
./sandbox ls <id>
./sandbox stop <id>
./sandbox delete <id>
```

## Notes

- Requires Apple's `container` CLI.
- `create` copies host directories into the container under `/sandbox/host/...`.
- `-s/--script` runs a shell script inside the container after copy.
