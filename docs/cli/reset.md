---
summary: "CLI reference for `sani reset` (reset local state/config)"
read_when:
  - You want to wipe local state while keeping the CLI installed
  - You want a dry-run of what would be removed
title: "reset"
---

# `sani reset`

Reset local config/state (keeps the CLI installed).

```bash
sani reset
sani reset --dry-run
sani reset --scope config+creds+sessions --yes --non-interactive
```
