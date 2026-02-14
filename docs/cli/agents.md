---
summary: "CLI reference for `sani agents` (list/add/delete/set identity)"
read_when:
  - You want multiple isolated agents (workspaces + routing + auth)
title: "agents"
---

# `sani agents`

Manage isolated agents (workspaces + auth + routing).

Related:

- Multi-agent routing: [Multi-Agent Routing](/concepts/multi-agent)
- Agent workspace: [Agent workspace](/concepts/agent-workspace)

## Examples

```bash
sani agents list
sani agents add work --workspace ~/.sani/workspace-work
sani agents set-identity --workspace ~/.sani/workspace --from-identity
sani agents set-identity --agent main --avatar avatars/sani.png
sani agents delete work
```

## Identity files

Each agent workspace can include an `IDENTITY.md` at the workspace root:

- Example path: `~/.sani/workspace/IDENTITY.md`
- `set-identity --from-identity` reads from the workspace root (or an explicit `--identity-file`)

Avatar paths resolve relative to the workspace root.

## Set identity

`set-identity` writes fields into `agents.list[].identity`:

- `name`
- `theme`
- `emoji`
- `avatar` (workspace-relative path, http(s) URL, or data URI)

Load from `IDENTITY.md`:

```bash
sani agents set-identity --workspace ~/.sani/workspace --from-identity
```

Override fields explicitly:

```bash
sani agents set-identity --agent main --name "SANI" --emoji "🦞" --avatar avatars/sani.png
```

Config sample:

```json5
{
  agents: {
    list: [
      {
        id: "main",
        identity: {
          name: "SANI",
          theme: "space lobster",
          emoji: "🦞",
          avatar: "avatars/sani.png",
        },
      },
    ],
  },
}
```
