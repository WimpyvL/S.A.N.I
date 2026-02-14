# @sani/feishu

Feishu/Lark channel plugin for SANI (WebSocket bot events).

## Install (local checkout)

```bash
sani plugins install ./extensions/feishu
```

## Install (npm)

```bash
sani plugins install @sani/feishu
```

Onboarding: select Feishu/Lark and confirm the install prompt to fetch the plugin automatically.

## Config

```json5
{
  channels: {
    feishu: {
      accounts: {
        default: {
          appId: "cli_xxx",
          appSecret: "xxx",
          domain: "feishu",
          enabled: true,
        },
      },
      dmPolicy: "pairing",
      groupPolicy: "open",
      blockStreaming: true,
    },
  },
}
```

Lark (global) tenants should set `domain: "lark"` (or a full https:// domain).

Restart the gateway after config changes.

## Docs

https://docs.sani.ai/channels/feishu
