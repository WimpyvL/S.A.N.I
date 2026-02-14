# Getting Started

## Install

```bash
npm i
npm run build
```

## Configure env

`npm run sani` and `npm run sani:doctor` use `config/sani.default.json` by default.

Optional overrides:

```bash
export SANI_CONFIG_PATH="$PWD/config/sani.default.json"
export OPENAI_API_KEY="your-key"
```

## Run

```bash
npm run sani
```

This starts the runtime with SANI enabled by default and prints a `SANI ACTIVE STATE` block before boot.

## Verify SANI mode toggles

1. Send `hey sani` in an active session to enable SANI mode.
2. Send `who am i` to enable labyrinth mode.
3. Send `exit sani mode` to clear both mode flags.

You can also inspect session state with `sani sessions --json`.

## Verify memory artifacts created

1. Confirm the workspace exists at `~/.sani/workspace` (or your configured workspace).
2. Confirm `SANI.md` exists in the workspace root.
3. Confirm memory paths are present/writable:
   - `<workspace>/memory/`
   - `~/.sani/memory/` (vector index storage)
4. Run the doctor check:

```bash
npm run sani:doctor
```
