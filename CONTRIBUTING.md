# Contributing to Tyria Ledger

Full walkthrough: **[Wiki](https://github.com/NolvusMadeIt/tpledger/wiki)**.

## Branches

| Who | Branch | What |
| --- | --- | --- |
| Maintainers | `main` | App, docs, bundled plugins, releases |
| Maintainers | `version-X.Y.Z` | Created automatically when a GitHub Release is published |
| Collaborators | `plugin_<name>_<version>` | Plugin submissions only |

Examples of collaborator branches:

```
plugin_flip-watch_1.2.0
plugin_chat-copy_1.1.0
plugin_my-cool-thing_0.1.0
```

Rules:

- Do **not** open PRs from `main`, `version-*`, or random names.
- One plugin per branch. Files live under `public/plugins/<id>/` (or a new folder you add to `public/plugins/index.json` if it should ship bundled).
- Version in the branch name must match `plugin.json` `"version"`.
- Open a pull request **into `main`**. Maintainers merge.

## Releases (maintainers)

1. Land the work on `main`.
2. Publish a GitHub Release (`vX.Y.Z`) with `TyriaLedger-win64.zip`.
3. The **Sync main on release** workflow:
   - Points `version-X.Y.Z` at that tag (the app updater reads these branches)
   - Merges the tag into `main` if it is not already there

Collaborators never cut releases.

## Plugins

Copy [`docs/plugin-template/`](docs/plugin-template/). See the [Plugin Guide](https://github.com/NolvusMadeIt/tpledger/wiki/Plugin-Guide).
