# Plugins

Drop a folder here (or next to the desktop exe in `plugins/`). Tyria Ledger lists it under Settings.

**Submitting a plugin?** Use branch `plugin_<name>_<version>` and a PR into `main`.  
Template: [`docs/plugin-template/`](../../docs/plugin-template/).  
Wiki: [Plugin Guide](https://github.com/NolvusMadeIt/tpledger/wiki/Plugin-Guide).

A plugin is a folder:

```
my-plugin/
  plugin.json
  index.js
```

See the template for a full `plugin.json` and `start(api)` example.
