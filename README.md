# 🏆 League Profile Tool

A professional-grade, premium tool built with **Tauri v2** and **React** for seamless League of Legends profile customization via the LCU (League Client Update) API.

<p align="center">

<a href="https://github.com/L9Lenny/lol-profile-editor/releases">
  <img src="https://img.shields.io/github/v/release/L9Lenny/lol-profile-editor?style=flat-square&logo=github&color=2f81f7" />
</a>

<a href="https://github.com/L9Lenny/lol-profile-editor/actions">
  <img src="https://img.shields.io/github/actions/workflow/status/L9Lenny/lol-profile-editor/release.yml?style=flat-square&logo=githubactions&logoColor=white&color=238636" />
</a>

<a href="https://github.com/L9Lenny/lol-profile-editor/actions/workflows/snyk.yml">
  <img src="https://img.shields.io/badge/Security-Snyk-4C4A73?style=flat-square&logo=snyk&logoColor=white" />
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

## ✨ Features

### 🛠️ Core Functionality
- **🏆 Rank Customization**: Modify your visible Solo/Duo rank from Iron to Challenger with live preview
- **🖼️ Icon Library**: Access to 6,000+ profile icons from Data Dragon with smart search and HD previews
- **💬 Profile Bio Management**: Update your chat status and biographical information in real-time
- **🟢 Status Control**: Set your LCU availability (Online, Away, Mobile, Offline) directly from the Bio tab
- **🗂️ Log Export**: Save your in-app logs to a file for troubleshooting
- **📊 Live Preview**: See changes before applying them to your profile

### 🎨 Premium Interface
- **Hextech Glass UI**: Borderless design with holographic grids and gold-trim glassmorphism
- **Smooth Animations**: Polished transitions and micro-interactions throughout
- **Dark Theme**: Eye-friendly interface inspired by the official League client
- **Responsive Layout**: Optimized for different screen sizes

### ⚡ Advanced Features
- **Smart LCU Sync**: Automatic discovery and connection to League Client (no manual configuration)
- **Technical Console**: Built-in logging system for monitoring API interactions
- **Minimize to Tray**: Keep the tool running in the background
- **Auto-Launch**: Start automatically with Windows
- **Auto-Updates**: One-click update system with secure signature verification
- **Security First**: Continuous vulnerability scanning and code quality monitoring

## 🚀 Getting Started

### Prerequisites

- **Node.js**: `v20.x` or higher.
- **Rust**: Latest stable version installed via [rustup](https://rustup.rs/).
- **League of Legends**: The client must be installed and running for the tool to interact with your profile.

### Development

```bash
# Clone the repository
git clone https://github.com/L9Lenny/lol-profile-editor.git

# Install dependencies
npm install

# Run in development mode
npm run tauri dev
```

### Build for Production

```bash
npm run tauri build
```

## 🛠️ Built With

- [Tauri v2](https://v2.tauri.app/) - High-performance desktop application framework.
- [React](https://react.dev/) - Modern UI library.
- [Lucide React](https://lucide.dev/) - Beautifully simple icons.
- [Vite](https://vitejs.dev/) - Next Generation Frontend Tooling.

## 🔒 Code Quality & Security

This project maintains high standards through automated quality gates and security scanning:

- **🛡️ Snyk Security**: Continuous vulnerability scanning of dependencies to ensure your installation is secure.
- **📊 SonarCloud**: Automated code quality analysis tracking code smells, bugs, and security hotspots.
- **✅ PullApprove**: Structured code review process ensuring all changes are properly vetted.
- **👥 All Contributors**: Recognition system for everyone who contributes to the project.

All security scans and quality checks run automatically on every commit and pull request.

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Contributions are welcome! Check out our [Contributing Guidelines](res/docs/CONTRIBUTING.md) and [Code of Conduct](res/docs/CODE_OF_CONDUCT.md).

---

## ☕ Support the Project

If this tool helped you customize your profile and you enjoy the Hextech experience, consider supporting the development! Every coffee helps keep the engine running and the UI polished.

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/profumato)

---

## 📜 Changelog

Stay up to date with the latest changes in the [CHANGELOG](res/docs/CHANGELOG.md).

## ✨ Contributors

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

This project follows the [all-contributors](https://github.com/all-contributors/all-contributors) specification. Contributions of any kind welcome!

---
*Disclaimer: This tool is not affiliated with, endorsed by, or integrated with Riot Games in any official capacity.*
