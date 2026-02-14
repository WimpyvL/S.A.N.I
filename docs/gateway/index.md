---
summary: "Runbook for the Gateway service, lifecycle, and operations"
read_when:
  - Running or debugging the gateway process
title: "Gateway Runbook"
---

# Gateway service runbook

Last updated: 2025-12-09

## What it is

- The always-on process that owns the single Baileys/Telegram connection and the control/event plane.
- Replaces the legacy `gateway` command. CLI entry point: `sani gateway`.
- Runs until stopped; exits non-zero on fatal errors so the supervisor restarts it.

## Supported vessels

SANI uses a vessel adapter boundary for inbound/outbound messaging I/O.

- `whatsapp` (default) — backed by the existing WhatsApp Web gateway path.
- `cli` — stdin/stdout local vessel for terminal chat loops.

Local CLI vessel example:

```bash
npm run sani -- --vessel=cli
```

Type messages at `you>` and SANI replies at `sani>`. Use `/exit` to stop.

## Add a new vessel adapter

Implement `VesselAdapter` in `src/vessels/types.ts` and wire it into CLI routing:

1. Add an adapter under `src/vessels/<name>.ts` with:
   - `onMessage(handler)` for inbound subscription.
   - `sendMessage(...)` for outbound delivery.
   - `getSessionKey(envelope)` and `getChannelMetadata(envelope)`.
   - `capabilities` (`text`, `images`, `voice`).
2. Emit a normalized message envelope (`NormalizedMessageEnvelope`) so plugin hooks see consistent metadata regardless of vessel.
3. Register the new vessel selector in `src/cli/vessel-chat.ts`.

## How to run (local)

```bash
sani gateway --port 18789
# for full debug/trace logs in stdio:
sani gateway --port 18789 --verbose
# if the port is busy, terminate listeners then start:
sani gateway --force
# dev loop (auto-reload on TS changes):
pnpm gateway:watch
```

- Config hot reload watches `~/.sani/sani.json` (or `SANI_CONFIG_PATH`).
  - Default mode: `gateway.reload.mode="hybrid"` (hot-apply safe changes, restart on critical).
  - Hot reload uses in-process restart via **SIGUSR1** when needed.
  - Disable with `gateway.reload.mode="off"`.
- Binds WebSocket control plane to `127.0.0.1:<port>` (default 18789).
- The same port also serves HTTP (control UI, hooks, A2UI). Single-port multiplex.
  - OpenAI Chat Completions (HTTP): [`/v1/chat/completions`](/gateway/openai-http-api).
  - OpenResponses (HTTP): [`/v1/responses`](/gateway/openresponses-http-api).
  - Tools Invoke (HTTP): [`/tools/invoke`](/gateway/tools-invoke-http-api).
- Starts a Canvas file server by default on `canvasHost.port` (default `18793`), serving `http://<gateway-host>:18793/__sani__/canvas/` from `~/.sani/workspace/canvas`. Disable with `canvasHost.enabled=false` or `SANI_SKIP_CANVAS_HOST=1`.
- Logs to stdout; use launchd/systemd to keep it alive and rotate logs.
- Pass `--verbose` to mirror debug logging (handshakes, req/res, events) from the log file into stdio when troubleshooting.
- `--force` uses `lsof` to find listeners on the chosen port, sends SIGTERM, logs what it killed, then starts the gateway (fails fast if `lsof` is missing).
- If you run under a supervisor (launchd/systemd/mac app child-process mode), a stop/restart typically sends **SIGTERM**; older builds may surface this as `pnpm` `ELIFECYCLE` exit code **143** (SIGTERM), which is a normal shutdown, not a crash.
- **SIGUSR1** triggers an in-process restart when authorized (gateway tool/config apply/update, or enable `commands.restart` for manual restarts).
- Gateway auth is required by default: set `gateway.auth.token` (or `SANI_GATEWAY_TOKEN`) or `gateway.auth.password`. Clients must send `connect.params.auth.token/password` unless using Tailscale Serve identity.
- The wizard now generates a token by default, even on loopback.
- Port precedence: `--port` > `SANI_GATEWAY_PORT` > `gateway.port` > default `18789`.

## Remote access

- Tailscale/VPN preferred; otherwise SSH tunnel:
  ```bash
  ssh -N -L 18789:127.0.0.1:18789 user@host
  ```
- Clients then connect to `ws://127.0.0.1:18789` through the tunnel.
- If a token is configured, clients must include it in `connect.params.auth.token` even over the tunnel.

## Multiple gateways (same host)

Usually unnecessary: one Gateway can serve multiple messaging channels and agents. Use multiple Gateways only for redundancy or strict isolation (ex: rescue bot).

Supported if you isolate state + config and use unique ports. Full guide: [Multiple gateways](/gateway/multiple-gateways).

Service names are profile-aware:

- macOS: `bot.molt.<profile>` (legacy `com.sani.*` may still exist)
- Linux: `sani-gateway-<profile>.service`
- Windows: `SANI Gateway (<profile>)`

Install metadata is embedded in the service config:

- `SANI_SERVICE_MARKER=sani`
- `SANI_SERVICE_KIND=gateway`
- `SANI_SERVICE_VERSION=<version>`

Rescue-Bot Pattern: keep a second Gateway isolated with its own profile, state dir, workspace, and base port spacing. Full guide: [Rescue-bot guide](/gateway/multiple-gateways#rescue-bot-guide).

### Dev profile (`--dev`)

Fast path: run a fully-isolated dev instance (config/state/workspace) without touching your primary setup.

```bash
sani --dev setup
sani --dev gateway --allow-unconfigured
# then target the dev instance:
sani --dev status
sani --dev health
```

Defaults (can be overridden via env/flags/config):

- `SANI_STATE_DIR=~/.sani-dev`
- `SANI_CONFIG_PATH=~/.sani-dev/sani.json`
- `SANI_GATEWAY_PORT=19001` (Gateway WS + HTTP)
- browser control service port = `19003` (derived: `gateway.port+2`, loopback only)
- `canvasHost.port=19005` (derived: `gateway.port+4`)
- `agents.defaults.workspace` default becomes `~/.sani/workspace-dev` when you run `setup`/`onboard` under `--dev`.

Derived ports (rules of thumb):

- Base port = `gateway.port` (or `SANI_GATEWAY_PORT` / `--port`)
- browser control service port = base + 2 (loopback only)
- `canvasHost.port = base + 4` (or `SANI_CANVAS_HOST_PORT` / config override)
- Browser profile CDP ports auto-allocate from `browser.controlPort + 9 .. + 108` (persisted per profile).

Checklist per instance:

- unique `gateway.port`
- unique `SANI_CONFIG_PATH`
- unique `SANI_STATE_DIR`
- unique `agents.defaults.workspace`
- separate WhatsApp numbers (if using WA)

Service install per profile:

```bash
sani --profile main gateway install
sani --profile rescue gateway install
```

Example:

```bash
SANI_CONFIG_PATH=~/.sani/a.json SANI_STATE_DIR=~/.sani-a sani gateway --port 19001
SANI_CONFIG_PATH=~/.sani/b.json SANI_STATE_DIR=~/.sani-b sani gateway --port 19002
```

## Protocol (operator view)

- Full docs: [Gateway protocol](/gateway/protocol) and [Bridge protocol (legacy)](/gateway/bridge-protocol).
- Mandatory first frame from client: `req {type:"req", id, method:"connect", params:{minProtocol,maxProtocol,client:{id,displayName?,version,platform,deviceFamily?,modelIdentifier?,mode,instanceId?}, caps, auth?, locale?, userAgent? } }`.
- Gateway replies `res {type:"res", id, ok:true, payload:hello-ok }` (or `ok:false` with an error, then closes).
- After handshake:
  - Requests: `{type:"req", id, method, params}` → `{type:"res", id, ok, payload|error}`
  - Events: `{type:"event", event, payload, seq?, stateVersion?}`
- Structured presence entries: `{host, ip, version, platform?, deviceFamily?, modelIdentifier?, mode, lastInputSeconds?, ts, reason?, tags?[], instanceId? }` (for WS clients, `instanceId` comes from `connect.client.instanceId`).
- `agent` responses are two-stage: first `res` ack `{runId,status:"accepted"}`, then a final `res` `{runId,status:"ok"|"error",summary}` after the run finishes; streamed output arrives as `event:"agent"`.

## Methods (initial set)

- `health` — full health snapshot (same shape as `sani health --json`).
- `status` — short summary.
- `system-presence` — current presence list.
- `system-event` — post a presence/system note (structured).
- `send` — send a message via the active channel(s).
- `agent` — run an agent turn (streams events back on same connection).
- `node.list` — list paired + currently-connected nodes (includes `caps`, `deviceFamily`, `modelIdentifier`, `paired`, `connected`, and advertised `commands`).
- `node.describe` — describe a node (capabilities + supported `node.invoke` commands; works for paired nodes and for currently-connected unpaired nodes).
- `node.invoke` — invoke a command on a node (e.g. `canvas.*`, `camera.*`).
- `node.pair.*` — pairing lifecycle (`request`, `list`, `approve`, `reject`, `verify`).

See also: [Presence](/concepts/presence) for how presence is produced/deduped and why a stable `client.instanceId` matters.

## Events

- `agent` — streamed tool/output events from the agent run (seq-tagged).
- `presence` — presence updates (deltas with stateVersion) pushed to all connected clients.
- `tick` — periodic keepalive/no-op to confirm liveness.
- `shutdown` — Gateway is exiting; payload includes `reason` and optional `restartExpectedMs`. Clients should reconnect.

## WebChat integration

- WebChat is a native SwiftUI UI that talks directly to the Gateway WebSocket for history, sends, abort, and events.
- Remote use goes through the same SSH/Tailscale tunnel; if a gateway token is configured, the client includes it during `connect`.
- macOS app connects via a single WS (shared connection); it hydrates presence from the initial snapshot and listens for `presence` events to update the UI.

## Typing and validation

- Server validates every inbound frame with AJV against JSON Schema emitted from the protocol definitions.
- Clients (TS/Swift) consume generated types (TS directly; Swift via the repo’s generator).
- Protocol definitions are the source of truth; regenerate schema/models with:
  - `pnpm protocol:gen`
  - `pnpm protocol:gen:swift`

## Connection snapshot

- `hello-ok` includes a `snapshot` with `presence`, `health`, `stateVersion`, and `uptimeMs` plus `policy {maxPayload,maxBufferedBytes,tickIntervalMs}` so clients can render immediately without extra requests.
- `health`/`system-presence` remain available for manual refresh, but are not required at connect time.

## Error codes (res.error shape)

- Errors use `{ code, message, details?, retryable?, retryAfterMs? }`.
- Standard codes:
  - `NOT_LINKED` — WhatsApp not authenticated.
  - `AGENT_TIMEOUT` — agent did not respond within the configured deadline.
  - `INVALID_REQUEST` — schema/param validation failed.
  - `UNAVAILABLE` — Gateway is shutting down or a dependency is unavailable.

## Keepalive behavior

- `tick` events (or WS ping/pong) are emitted periodically so clients know the Gateway is alive even when no traffic occurs.
- Send/agent acknowledgements remain separate responses; do not overload ticks for sends.

## Replay / gaps

- Events are not replayed. Clients detect seq gaps and should refresh (`health` + `system-presence`) before continuing. WebChat and macOS clients now auto-refresh on gap.

## Supervision (macOS example)

- Use launchd to keep the service alive:
  - Program: path to `sani`
  - Arguments: `gateway`
  - KeepAlive: true
  - StandardOut/Err: file paths or `syslog`
- On failure, launchd restarts; fatal misconfig should keep exiting so the operator notices.
- LaunchAgents are per-user and require a logged-in session; for headless setups use a custom LaunchDaemon (not shipped).
  - `sani gateway install` writes `~/Library/LaunchAgents/bot.molt.gateway.plist`
    (or `bot.molt.<profile>.plist`; legacy `com.sani.*` is cleaned up).
  - `sani doctor` audits the LaunchAgent config and can update it to current defaults.

## Gateway service management (CLI)

Use the Gateway CLI for install/start/stop/restart/status:

```bash
sani gateway status
sani gateway install
sani gateway stop
sani gateway restart
sani logs --follow
```

Notes:

- `gateway status` probes the Gateway RPC by default using the service’s resolved port/config (override with `--url`).
- `gateway status --deep` adds system-level scans (LaunchDaemons/system units).
- `gateway status --no-probe` skips the RPC probe (useful when networking is down).
- `gateway status --json` is stable for scripts.
- `gateway status` reports **supervisor runtime** (launchd/systemd running) separately from **RPC reachability** (WS connect + status RPC).
- `gateway status` prints config path + probe target to avoid “localhost vs LAN bind” confusion and profile mismatches.
- `gateway status` includes the last gateway error line when the service looks running but the port is closed.
- `logs` tails the Gateway file log via RPC (no manual `tail`/`grep` needed).
- If other gateway-like services are detected, the CLI warns unless they are SANI profile services.
  We still recommend **one gateway per machine** for most setups; use isolated profiles/ports for redundancy or a rescue bot. See [Multiple gateways](/gateway/multiple-gateways).
  - Cleanup: `sani gateway uninstall` (current service) and `sani doctor` (legacy migrations).
- `gateway install` is a no-op when already installed; use `sani gateway install --force` to reinstall (profile/env/path changes).

Bundled mac app:

- SANI.app can bundle a Node-based gateway relay and install a per-user LaunchAgent labeled
  `bot.molt.gateway` (or `bot.molt.<profile>`; legacy `com.sani.*` labels still unload cleanly).
- To stop it cleanly, use `sani gateway stop` (or `launchctl bootout gui/$UID/bot.molt.gateway`).
- To restart, use `sani gateway restart` (or `launchctl kickstart -k gui/$UID/bot.molt.gateway`).
  - `launchctl` only works if the LaunchAgent is installed; otherwise use `sani gateway install` first.
  - Replace the label with `bot.molt.<profile>` when running a named profile.

## Supervision (systemd user unit)

SANI installs a **systemd user service** by default on Linux/WSL2. We
recommend user services for single-user machines (simpler env, per-user config).
Use a **system service** for multi-user or always-on servers (no lingering
required, shared supervision).

`sani gateway install` writes the user unit. `sani doctor` audits the
unit and can update it to match the current recommended defaults.

Create `~/.config/systemd/user/sani-gateway[-<profile>].service`:

```
[Unit]
Description=SANI Gateway (profile: <profile>, v<version>)
After=network-online.target
Wants=network-online.target

[Service]
ExecStart=/usr/local/bin/sani gateway --port 18789
Restart=always
RestartSec=5
Environment=SANI_GATEWAY_TOKEN=
WorkingDirectory=/home/youruser

[Install]
WantedBy=default.target
```

Enable lingering (required so the user service survives logout/idle):

```
sudo loginctl enable-linger youruser
```

Onboarding runs this on Linux/WSL2 (may prompt for sudo; writes `/var/lib/systemd/linger`).
Then enable the service:

```
systemctl --user enable --now sani-gateway[-<profile>].service
```

**Alternative (system service)** - for always-on or multi-user servers, you can
install a systemd **system** unit instead of a user unit (no lingering needed).
Create `/etc/systemd/system/sani-gateway[-<profile>].service` (copy the unit above,
switch `WantedBy=multi-user.target`, set `User=` + `WorkingDirectory=`), then:

```
sudo systemctl daemon-reload
sudo systemctl enable --now sani-gateway[-<profile>].service
```

## Windows (WSL2)

Windows installs should use **WSL2** and follow the Linux systemd section above.

## Operational checks

- Liveness: open WS and send `req:connect` → expect `res` with `payload.type="hello-ok"` (with snapshot).
- Readiness: call `health` → expect `ok: true` and a linked channel in `linkChannel` (when applicable).
- Debug: subscribe to `tick` and `presence` events; ensure `status` shows linked/auth age; presence entries show Gateway host and connected clients.

## Safety guarantees

- Assume one Gateway per host by default; if you run multiple profiles, isolate ports/state and target the right instance.
- No fallback to direct Baileys connections; if the Gateway is down, sends fail fast.
- Non-connect first frames or malformed JSON are rejected and the socket is closed.
- Graceful shutdown: emit `shutdown` event before closing; clients must handle close + reconnect.

## CLI helpers

- `sani gateway health|status` — request health/status over the Gateway WS.
- `sani message send --target <num> --message "hi" [--media ...]` — send via Gateway (idempotent for WhatsApp).
- `sani agent --message "hi" --to <num>` — run an agent turn (waits for final by default).
- `sani gateway call <method> --params '{"k":"v"}'` — raw method invoker for debugging.
- `sani gateway stop|restart` — stop/restart the supervised gateway service (launchd/systemd).
- Gateway helper subcommands assume a running gateway on `--url`; they no longer auto-spawn one.

## Migration guidance

- Retire uses of `sani gateway` and the legacy TCP control port.
- Update clients to speak the WS protocol with mandatory connect and structured presence.
