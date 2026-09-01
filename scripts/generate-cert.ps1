# Generate Self-Signed Code Signing Certificate using OpenSSL
# Run this script after installing OpenSSL (winget install FireDaemon.OpenSSL)

param(
    [string]$OutputDir = ".",
    [string]$Password = ""
)

$openssl = "C:\Program Files\FireDaemon OpenSSL 4\bin\openssl.exe"

# Prompt for password if not provided
if (-not $Password) {
    $SecurePassword = Read-Host -Prompt "Enter certificate password" -AsSecureString
    $PasswordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
        [Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecurePassword)
    )
} else {
    $PasswordPlain = $Password
}

$keyPath = Join-Path $OutputDir "cert.key"
$csrPath = Join-Path $OutputDir "cert.csr"
$crtPath = Join-Path $OutputDir "cert.crt"
$pfxPath = Join-Path $OutputDir "cert.pfx"
$extPath = Join-Path $OutputDir "cert.ext"

# Generate private key
& $openssl genrsa -out $keyPath 2048 2>&1 | Out-Null

# Generate CSR
& $openssl req -new -key $keyPath -out $csrPath -subj "/CN=League Profile Tool" 2>&1 | Out-Null

# Create extension file
Set-Content -Path $extPath -Value "extendedKeyUsage=codeSigning"

# Self-sign the certificate with code signing extension
& $openssl x509 -req -in $csrPath -signkey $keyPath -out $crtPath -days 1095 -extfile $extPath 2>&1 | Out-Null

# Export to PFX
& $openssl pkcs12 -export -out $pfxPath -inkey $keyPath -in $crtPath -password pass:$PasswordPlain 2>&1 | Out-Null

# Cleanup temp files
Remove-Item -Force $keyPath, $csrPath, $crtPath, $extPath -ErrorAction SilentlyContinue

Write-Host "Certificate created successfully!" -ForegroundColor Green
Write-Host "  File:    $pfxPath"
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Encode for GitHub Secrets:"
Write-Host "     & `"$openssl`" base64 -A -in $pfxPath -out cert-base64.txt"
Write-Host "  2. Add to GitHub repo secrets:"
Write-Host "     WINDOWS_CERTIFICATE = content of cert-base64.txt"
Write-Host "     WINDOWS_CERTIFICATE_PASSWORD = $PasswordPlain"
