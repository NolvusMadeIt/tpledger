# Windows signing cert (do not commit)

Drop your Authenticode certificate here as `codesign.pfx`.

Then either:

```bash
export WINDOWS_CERT_PFX=/absolute/path/to/codesign.pfx
export WINDOWS_CERT_PASSWORD='your-password'
node desktop/pack-win.mjs
```

or put the files next to this README:

- `desktop/certs/codesign.pfx`
- `desktop/certs/password.txt` (one line, the PFX password)

Never commit those files. The packer signs `Tyria Ledger.exe` with `osslsigncode` and a public timestamp so SmartScreen can show a real publisher instead of "Unknown publisher".
