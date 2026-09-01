# Release Code Signing

The release workflow signs the Windows and macOS artifacts. Certificates and private keys must never be committed to this repository.

## Windows

Purchase an Authenticode code-signing certificate from a trusted certificate authority and export it as a password-protected `.pfx` file.

Create these repository secrets:

- `WINDOWS_CERTIFICATE`: base64 of the `.pfx` file
- `WINDOWS_CERTIFICATE_PASSWORD`: password used to export the `.pfx`

Encode the certificate on a machine with OpenSSL:

```bash
openssl base64 -A -in certificate.pfx -out certificate-base64.txt
```

The workflow imports the certificate into the Windows certificate store, detects its thumbprint, configures Tauri, and signs the generated installer with SHA-256 and a trusted timestamp server.

## macOS

Use an Apple Developer account and a `Developer ID Application` certificate for distribution outside the App Store. Export the certificate and its private key from Keychain Access as a password-protected `.p12` file.

Create these repository secrets:

- `APPLE_CERTIFICATE`: base64 of the `.p12` file
- `APPLE_CERTIFICATE_PASSWORD`: password used to export the `.p12`
- `KEYCHAIN_PASSWORD`: temporary CI keychain password
- `APPLE_API_KEY`: App Store Connect API key ID
- `APPLE_API_ISSUER`: App Store Connect issuer ID
- `APPLE_API_KEY_BASE64`: base64 of the API key `.p8` file

Encode the certificate and API key on a machine with OpenSSL:

```bash
openssl base64 -A -in certificate.p12 -out certificate-base64.txt
openssl base64 -A -in AuthKey_KEYID.p8 -out api-key-base64.txt
```

The API key needs permission to submit builds for notarization. The workflow creates an ephemeral keychain, imports the certificate, signs the app, and notarizes the macOS artifacts before publishing them.

## Verification

After a tagged release completes, verify the signatures locally:

```powershell
Get-AuthenticodeSignature .\League-Profile-Tool_1.12.1_x64-setup.exe
```

```bash
codesign --verify --deep --strict --verbose=2 "League-Profile-Tool.app"
spctl --assess --type execute --verbose "League-Profile-Tool.app"
```
