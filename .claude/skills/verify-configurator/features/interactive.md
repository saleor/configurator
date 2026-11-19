# Interactive start and prompts

In a terminal the CLI prompts: `start` walks users through a menu, missing `--url`/`--token` are asked for, and deploy asks for confirmation. Bash is never a TTY, so these run only under `record` (V8).

## Sub-features

- `interactive-start`: `start` shows the menu and runs the chosen command.
- `interactive-missing-args`: running `diff` without `--url` prompts for the URL.
- `interactive-confirm`: `deploy` in a terminal shows the plan and asks before applying; answering no applies nothing.

## How to get to it (user POV)

`configurator start`; `configurator diff` with no flags; `configurator deploy` in a terminal.

## Driving it with verify-configurator

- Start, end to end: `record --name start-flow --feature interactive --keys "Sleep 3s,y,Enter,Sleep 2s,{url},Enter,Sleep 2s,{token},Enter,Sleep 40s" -- start` → the wizard confirms, prompts for the URL and a masked token, introspects, and writes `work/config.yml`. This also covers prompts for missing arguments.
- Confirm: copy the seed with one product change, `record --name deploy-confirm --feature interactive --keys "Sleep 30s,n,Enter,Sleep 3s" --wait 1s -- deploy --config=confirm.yml --include=products` → the screenshot shows the plan and "Deployment cancelled by user".
- **Proof:** after the declined deploy, `gql` reads the changed field → still the old value. Put the png screenshots inline in the reply (V14).

## Gotchas

- `record` types the command with `--url $SALEOR_URL --token $SALEOR_TOKEN` for remote commands, so the screen never shows the token. Prompts don't expand env vars: use the `{url}` and `{token}` keys; `{token}` is typed while recording is hidden.
- The confirmation prompt lists every unsupported delete as "This will be permanently deleted"; scope with `--include` to keep the screenshot readable.
- Tune `--wait` and `Sleep` keys to the sandbox's latency; a screenshot taken before output arrives is a harness failure, not a product one.
