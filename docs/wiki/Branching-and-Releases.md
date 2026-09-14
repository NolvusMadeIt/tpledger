# Branching and releases

## Branch map

| Branch | Who | Purpose |
| --- | --- | --- |
| `main` | Maintainers | Default branch. App, docs, bundled plugins. Always the truth. |
| `version-X.Y.Z` | Automation + maintainers | One branch per shipped app. The desktop updater lists these. |
| `plugin_<name>_<version>` | Collaborators | The **only** branch shape collaborators open PRs from. |

### Collaborator branch name

```
plugin_<name_of_plugin>_<versionnumber>
```

- Lowercase.
- Plugin id in the name (hyphens ok).
- Version matches `plugin.json` `"version"` (semver: `1.0.0`).

Good:

```
plugin_flip-watch_1.2.0
plugin_chat-copy_1.1.0
plugin_ecto-alert_0.3.0
```

Bad:

```
main
feature/cool
plugin-flip-watch
flip-watch-1.2.0
version-1.2.0
```

One plugin per branch. Open the PR against **`main`**.

## What maintainers do on a release

1. Merge to `main`.
2. Build `TyriaLedger-win64.zip` (`node desktop/pack-win.mjs`).
3. Publish GitHub Release **`vX.Y.Z`** and attach the zip.
4. Workflow **Sync main on release** then:
   - Force-points `version-X.Y.Z` at that tag (updater)
   - Merges the tag into `main` if `main` does not already contain it

So: **every release updates `main`**. Collaborators never cut releases, never push `version-*`, never push `main`.

## After a plugin is merged

Maintainers bump / bundle as needed. The next **app** release is still a `vX.Y.Z` from `main`. Plugin version and app version are not the same number.
