---
summary: "Install SANI, onboard the Gateway, and pair your first channel."
read_when:
  - You want the fastest path from install to a working Gateway
title: "Quick start"
---

<Note>
SANI requires Node 22 or newer.
</Note>

## Install

<Tabs>
  <Tab title="npm">
    ```bash
    npm install -g sani@latest
    ```
  </Tab>
  <Tab title="pnpm">
    ```bash
    pnpm add -g sani@latest
    ```
  </Tab>
</Tabs>

## Onboard and run the Gateway

<Steps>
  <Step title="Onboard and install the service">
    ```bash
    sani onboard --install-daemon
    ```
  </Step>
  <Step title="Pair WhatsApp">
    ```bash
    sani channels login
    ```
  </Step>
  <Step title="Start the Gateway">
    ```bash
    sani gateway --port 18789
    ```
  </Step>
</Steps>

After onboarding, the Gateway runs via the user service. You can still run it manually with `sani gateway`.

<Info>
Switching between npm and git installs later is easy. Install the other flavor and run
`sani doctor` to update the gateway service entrypoint.
</Info>

## From source (development)

```bash
git clone https://github.com/sani/sani.git
cd sani
pnpm install
pnpm ui:build # auto-installs UI deps on first run
pnpm build
sani onboard --install-daemon
```

If you do not have a global install yet, run onboarding via `pnpm sani ...` from the repo.

## Multi instance quickstart (optional)

```bash
SANI_CONFIG_PATH=~/.sani/a.json \
SANI_STATE_DIR=~/.sani-a \
sani gateway --port 19001
```

## Send a test message

Requires a running Gateway.

```bash
sani message send --target +15555550123 --message "Hello from SANI"
```
