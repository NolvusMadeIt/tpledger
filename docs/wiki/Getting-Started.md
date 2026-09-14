# Getting started

## Players

You do **not** need this wiki. Download [the latest release](https://github.com/NolvusMadeIt/tpledger/releases/latest), unzip, double-click `Tyria Ledger.exe`.

## Collaborators

You will submit plugins (or, if you are a maintainer, app changes) through GitHub.

```bash
git clone https://github.com/NolvusMadeIt/tpledger.git
cd tpledger
npm install
npm run dev
```

The preview URL is usually `http://127.0.0.1:8080`.

### First plugin in 10 minutes

1. Copy `docs/plugin-template/` to `public/plugins/hello-ledger/`.
2. Edit `plugin.json` (`id`, `name`, `version`, `author`).
3. Add `"hello-ledger"` to `public/plugins/index.json` **only** if maintainers agree it should ship bundled. Otherwise leave `index.json` alone and drop the folder into the desktop `plugins/` directory to test.
4. Create a branch named exactly:

   ```
   plugin_hello-ledger_0.1.0
   ```

   (`plugin_` + plugin id + `_` + version from `plugin.json`)

5. Push and open a pull request **into `main`**.

```bash
git checkout -b plugin_hello-ledger_0.1.0
git add public/plugins/hello-ledger
git commit -m "plugin: hello-ledger 0.1.0"
git push -u origin plugin_hello-ledger_0.1.0
```

Then open the PR on GitHub. Use the PR template.

### Test without a PR

Copy your folder next to the installed exe:

```
Tyria Ledger.exe
plugins/
  hello-ledger/
    plugin.json
    index.js
```

Open Settings → enable it.

Next: [Plugin guide](Plugin-Guide).
