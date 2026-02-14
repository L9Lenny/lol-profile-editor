# 🏆 League Profile Tool

A professional-grade, premium tool built with **Tauri v2** and **React** for seamless League of Legends profile customization via the LCU (League Client Update) API.

[![Release](https://img.shields.io/github/v/release/L9Lenny/lol-profile-editor?color=c89b3c&label=latest&style=flat-square)](https://github.com/L9Lenny/lol-profile-editor/releases)
[![Build Status](https://img.shields.io/github/actions/workflow/status/L9Lenny/lol-profile-editor/release.yml?style=flat-square)](https://github.com/L9Lenny/lol-profile-editor/actions)
[![Security Scan](https://img.shields.io/github/actions/workflow/status/L9Lenny/lol-profile-editor/codeql-analysis.yml?label=security&style=flat-square)](https://github.com/L9Lenny/lol-profile-editor/actions/workflows/codeql-analysis.yml)
[![Downloads](https://img.shields.io/github/downloads/L9Lenny/lol-profile-editor/total?color=0ac1ff&style=flat-square)](https://github.com/L9Lenny/lol-profile-editor/releases)
[![License](https://img.shields.io/github/license/L9Lenny/lol-profile-editor?color=785a28&style=flat-square)](LICENSE)

---

## ☕ Support the Project

If this tool helped you customize your profile and you enjoy the Hextech experience, consider supporting the development! Every coffee helps keep the engine running and the UI polished.

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/profumato)

---

## ✨ Features

- 📝 **Profile Bio Management**: Update your chat status and bio with a single click.
- 🔗 **Smart LCU Sync**: Automated, real-time discovery and connection to the League Client.
- 🎨 **Hextech Glass UI**: A stunning, high-performance interface inspired by the official LoL client aesthetics.
- 📥 **One-Click Updates**: Keep your tool current with a built-in automated update system.
- 📥 **Tray Integration**: Fully managed system tray lifecycle with custom "Minimize to Tray" support.
- 🖥️ **Window Management**: Modern, resizable window support for all desktop resolutions.
- 📜 **Technical Console**: Built-in developer logs for real-time monitoring of client interactions.

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

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Contributions are welcome! Feel free to open issues or submit pull requests to improve the tool.

---
*Disclaimer: This tool is not affiliated with, endorsed by, or integrated with Riot Games in any official capacity.*
