# Migration to S.A.N.I Branding

This release completes the product rename to **S.A.N.I** (Sovereign Autonomous Network Intelligence).

## Breaking changes

- The CLI command is now `sani`.
- Package branding and metadata now use S.A.N.I identity.
- Workspace/default identity files now center on `SANI.md`.
- User-facing docs, UI labels, templates, and examples now use S.A.N.I naming.

## Command changes

- Old: `openclaw <command> ...` (now a deprecated alias)
- New: `sani <command> ...`

Examples:

```bash
sani --help
sani onboard
sani gateway
sani message send --to +1234567890 --message "hello"
```

## Config/path naming updates

Where configuration examples used legacy product names, use the S.A.N.I equivalents.
If you have automation/scripts pinned to legacy command names, update them to `sani`.

## Validation checklist

- `pnpm build`
- `node sani.mjs --help`
- `rg -n "openclaw" .` only returns legacy/changelog notes or deprecated alias docs (if present)
