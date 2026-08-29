# Rank Override Plugin for Pengu Loader

A [Pengu Loader](https://github.com/PenguLoader/PenguLoader) plugin that overrides the rank display in the League of Legends client's profile overview, hovercards, and party crests.

This plugin works in conjunction with [League Profile Tool](https://github.com/L9Lenny/league_profile_tool) to display your custom rank in the client's profile overview.

## Features

- **Profile Overview**: Overrides rank emblem and text in your profile
- **Hovercards**: Shows custom rank when hovering over summoner names
- **Party Crests**: Updates rank display in party lobby
- **Tooltips**: Rank tooltips show the overridden rank

## Requirements

1. [Pengu Loader](https://github.com/PenguLoader/PenguLoader) installed
2. [League Profile Tool](https://github.com/L9Lenny/league_profile_tool) running with rank overrides applied

## Installation

### Automatic (via League Profile Tool)

1. Open League Profile Tool
2. Go to Settings → Pengu Loader
3. Click "Install Plugin"
4. Restart the League Client

### Manual Installation

1. Install [Pengu Loader](https://github.com/PenguLoader/PenguLoader)
2. Copy the `rank-override` folder to Pengu Loader's `plugins` directory:
   ```
   C:\Program Files\Pengu Loader\plugins\@l9lenny\rank-override\
   ```
3. Restart the League Client

## How It Works

1. The plugin reads your rank settings from the LCU API (`/lol-chat/v1/me`)
2. It finds the regalia elements in the client's DOM
3. It overrides the rank attributes to display your custom rank
4. A MutationObserver watches for DOM changes and re-applies overrides

## File Structure

```
rank-override/
├── index.js                    # Plugin entry point
├── modules/
│   └── rankOverride.js         # Rank override logic
└── README.md
```

## Troubleshooting

- **Rank not showing**: Make sure League Profile Tool is running and rank overrides are applied
- **Plugin not loading**: Check Pengu Loader console for errors
- **Stale rank**: The plugin refreshes rank data every 30 seconds

## License

MIT License - See [LICENSE](../../LICENSE) for details.
