# Clearing the SmartScreen red screen

Windows is not accusing the app of malware. It is saying **the publisher is unknown** because `Tyria Ledger.exe` is not Authenticode-signed. A self-signed cert will not fix this. Reputation also will not build while it stays unsigned.

## What I need from you

One of these:

1. **A code-signing certificate as `.pfx` / `.p12` plus the password**  
   Put it in `desktop/certs/codesign.pfx` (gitignored) and tell me the password in chat, or set `WINDOWS_CERT_PASSWORD`. I will sign the next exe from here.

2. **Cloud signing credentials** if the CA will not give you a PFX (most new certs after 2023 live on a USB token or in the cloud):
   - [Azure Trusted Signing](https://learn.microsoft.com/en-us/azure/trusted-signing/) — Microsoft's own, identity check, then I can sign from the packer
   - SSL.com eSigner / DigiCert KeyLocker — same idea

3. **Nothing yet** — until a cert exists, Windows will keep showing that prompt. Click **More info → Run anyway**. After enough signed downloads, SmartScreen quietens down.

## What to buy (if you do not have one)

Search for **Windows Authenticode / OV code signing certificate**. Individual / organization both work. Typical names: SSL.com, Sectigo, DigiCert, Certum.

- **OV (organization validation)** — publisher shows your name/org. SmartScreen still nags until the signed file gets reputation, but it is no longer "Unknown publisher".
- **EV (extended validation)** — USB or cloud HSM. SmartScreen reputation is immediate. Costs more.

Do **not** buy an SSL website cert. That cannot sign an `.exe`.

## After you have it

Tell me which of the three you have. I will pack **1.0.4** signed, timestamped, and upload it to the `version-1.0.4` release.
