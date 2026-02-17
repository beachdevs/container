# Sandbox CLI

Small CLI for creating and managing Apple `container` sandboxes.

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
