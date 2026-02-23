# 🏆 League Profile Tool

A desktop tool built with **Tauri v2** and **React** for League of Legends profile customization through the LCU (League Client Update) API.

<p align="center">

<a href="https://github.com/L9Lenny/lol-profile-editor/releases">
  <img src="https://img.shields.io/github/v/release/L9Lenny/lol-profile-editor?style=flat-square&logo=github&color=2f81f7" />
</a>

<a href="https://github.com/L9Lenny/lol-profile-editor/actions">
  <img src="https://img.shields.io/github/actions/workflow/status/L9Lenny/lol-profile-editor/release.yml?style=flat-square&logo=githubactions&logoColor=white&color=238636" />
</a>

<a href="https://github.com/L9Lenny/lol-profile-editor/actions/workflows/virustotal-report.yml">
  <img src="https://img.shields.io/github/actions/workflow/status/L9Lenny/lol-profile-editor/virustotal-report.yml?style=flat-square&logo=virustotal&logoColor=white&label=VirusTotal&color=0b65d8" />
</a>

<a href="https://sonarcloud.io/summary/new_code?id=L9Lenny_lol-profile-editor">
  <img src="https://img.shields.io/badge/Code%20Quality-SonarCloud-F3702A?style=flat-square&logo=sonarcloud&logoColor=white" />
</a>

<a href="https://github.com/L9Lenny/lol-profile-editor/releases">
  <img src="https://img.shields.io/github/downloads/L9Lenny/lol-profile-editor/total?style=flat-square&logo=github&color=8250df" />
</a>

<a href="LICENSE">
  <img src="https://img.shields.io/github/license/L9Lenny/lol-profile-editor?style=flat-square&color=9e6a03" />
</a>

</p>

---

![League Profile Tool Demo](res/docs/img/demo.png)

> **Tip:** Fast links: [Download](https://github.com/L9Lenny/lol-profile-editor/releases) • [Security Report](res/docs/SECURITY_REPORT.md) • [Changelog](res/docs/CHANGELOG.md)

| 🚀 Start Here | 🔗 Link |
|---|---|
| Latest Release | [GitHub Releases](https://github.com/L9Lenny/lol-profile-editor/releases) |
| CI Workflows | [GitHub Actions](https://github.com/L9Lenny/lol-profile-editor/actions) |
| Security Report | [`res/docs/SECURITY_REPORT.md`](res/docs/SECURITY_REPORT.md) |

## ✨ Main Features

- **🆕 Profile Tokens**: Customize your 3 challenge medals with a visual image picker.
- **🎵 Music Integration**: Synchronize your profile bio with the song you're listening to on **Last.fm**.
- **🏆 Rank Mirror**: Customize your visible **Solo/Duo rank** with live draft previews.
- **🖼️ Icon Swapper**: Browse and apply **6,000+ profile icons** from the Data Dragon library.
- **📝 Presence Control**: Edit **bio/chat status** and set LCU presence (**Online, Away, Mobile, Offline**).
- **🛠️ Troubleshooting**: Export internal system logs for advanced support.
- **🔄 Auto-Updater**: Built-in update detection with secure ED25519 signatures.

## ⚡ Quick Start (Users)

1. Download the latest build from [Releases](https://github.com/L9Lenny/lol-profile-editor/releases).
2. Start League of Legends client.
3. Open **League Profile Tool**.
4. Apply your desired customizations directly through the Hextech-inspired UI.

## 🛠️ Development

### Prerequisites

- **Node.js**: `v20.x` or newer
- **Rust**: latest stable via [rustup](https://rustup.rs/)
- **League of Legends** client installed

### Run locally

```bash
git clone https://github.com/L9Lenny/lol-profile-editor.git
cd lol-profile-editor
npm ci
npm run tauri dev
```

### Production build

```bash
npm run tauri build
```

## 🔒 Security and Trust

This project uses automated checks and public reporting:

- **CodeQL** for static security analysis
- **SonarCloud** for quality and hotspot analysis
- **Dependabot** for dependency updates
- **VirusTotal release report** generated in CI and published at [`res/docs/SECURITY_REPORT.md`](res/docs/SECURITY_REPORT.md)

All checks run in GitHub Actions and are publicly visible from the repository Actions tab.

<details>
<summary><strong>🧪 How release verification works</strong></summary>

1. CI builds release artifacts.
2. Release assets are scanned via VirusTotal.
3. Results are published to `res/docs/SECURITY_REPORT.md`.
4. Users can cross-check release notes, hashes/signatures, and scan report.

</details>

## 🧰 Built With

- [Tauri v2](https://v2.tauri.app/)
- [React](https://react.dev/)
- [Lucide React](https://lucide.dev/)
- [Vite](https://vitejs.dev/)

## 📚 Project Docs

- [Changelog](res/docs/CHANGELOG.md)
- [Contributing](res/docs/CONTRIBUTING.md)
- [Code of Conduct](res/docs/CODE_OF_CONDUCT.md)
- [Security Policy](res/docs/SECURITY.md)

## 📄 License

This project is licensed under the [MIT License](LICENSE).

## ☕ Support

If the project is useful to you, you can support it here:

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/profumato)

## 👥 Contributors

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tbody>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/L9Lenny"><img src="https://avatars.githubusercontent.com/u/74313264?v=4?s=100" width="100px;" alt="L9Lenny"/><br /><sub><b>L9Lenny</b></sub></a><br /><a href="https://github.com/L9Lenny/lol-profile-editor/commits?author=L9Lenny" title="Code">💻</a> <a href="#design-L9Lenny" title="Design">🎨</a> <a href="#maintenance-L9Lenny" title="Maintenance">🚧</a></td>
    </tr>
  </tbody>
</table>

<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->

This project follows the [all-contributors](https://github.com/all-contributors/all-contributors) specification.

---

*Disclaimer: This tool is not affiliated with, endorsed by, or integrated with Riot Games in any official capacity.*
