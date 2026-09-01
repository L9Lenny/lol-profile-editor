# Generate Self-Signed Code Signing Certificate
# Run this script as Administrator

param(
    [string]$Subject = "CN=League Profile Tool",
    [string]$OutputPath = ".\cert.pfx",
    [string]$Password = ""
)

# Prompt for password if not provided
if (-not $Password) {
    $SecurePassword = Read-Host -Prompt "Enter certificate password" -AsSecureString
    $PasswordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
        [Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecurePassword)
    )
} else {
    $SecurePassword = ConvertTo-SecureString $Password -AsPlainText -Force
    $PasswordPlain = $Password
}

# Create certificate
$cert = New-SelfSignedCertificate `
    -Subject $Subject `
    -Type CodeSigningCert `
    -CertStoreLocation "Cert:\CurrentUser\My" `
    -KeyUsage DigitalSignature `
    -KeyAlgorithm RSA `
    -KeyLength 2048 `
    -KeyExportPolicy Exportable `
    -NotAfter (Get-Date).AddYears(3)

# Export to PFX using certutil for better compatibility
$certPath = "Cert:\CurrentUser\My\$($cert.Thumbprint)"
certutil -exportPFX -p $PasswordPlain $certPath $OutputPath | Out-Null

Write-Host "Certificate created successfully!" -ForegroundColor Green
Write-Host "  Thumbprint: $($cert.Thumbprint)"
Write-Host "  Subject:    $($cert.Subject)"
Write-Host "  Expires:    $($cert.NotAfter)"
Write-Host "  File:       $OutputPath"
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Encode for GitHub Secrets:"
Write-Host "     openssl base64 -A -in $OutputPath -out cert-base64.txt"
Write-Host "  2. Add to GitHub repo secrets:"
Write-Host "     WINDOWS_CERTIFICATE = content of cert-base64.txt"
Write-Host "     WINDOWS_CERTIFICATE_PASSWORD = $PasswordPlain"
