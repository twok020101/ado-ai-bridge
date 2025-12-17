# Installing ADO Agent Bridge Extension

## Installation Steps

Your extension has been packaged as: `ado-agent-bridge-0.0.1.vsix`

### Method 1: Install via Command Line

```bash
code --install-extension /Users/ks27301/Node/PR/ado-agent-bridge-0.0.1.vsix
```

### Method 2: Install via VS Code UI

1. Open VS Code/Antigravity
2. Press `Cmd+Shift+P` (or `Ctrl+Shift+P`)
3. Type: `Extensions: Install from VSIX...`
4. Navigate to `/Users/ks27301/Node/PR/ado-agent-bridge-0.0.1.vsix`
5. Click "Install"
6. Reload VS Code when prompted

## After Installation

1. **Find the Extension**:
    - Open the Explorer sidebar (file icon)
    - Scroll down to see "ADO PR Explorer" section

2. **Use Commands**:
    - Press `Cmd+Shift+P`
    - Type "ADO Bridge" to see available commands:
        - `ADO Bridge: Dump PR Context to Clipboard`
        - `ADO Bridge: Get PR Context`

3. **Configure** (Optional):
    - You can add settings to your VS Code settings.json for organization URL
    - Or enter them when prompted by the commands

## Uninstalling

If you need to uninstall:

1. Go to Extensions view (`Cmd+Shift+X`)
2. Search for "ADO Agent Bridge"
3. Click the gear icon → Uninstall

## Next Steps

- Implement real Azure DevOps authentication
- Fetch actual PR data from your organization
- Enhance the diff fetching logic
