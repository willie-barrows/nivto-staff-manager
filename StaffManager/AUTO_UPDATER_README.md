# Auto-Updater Setup Guide

The NIVTO Staff Manager Windows app now includes automatic update functionality using `electron-updater` and GitHub Releases.

## How It Works

1. **Automatic Check**: The app checks for updates 3 seconds after launch (production builds only)
2. **Manual Check**: Users can check for updates in Settings → Application Updates
3. **GitHub Releases**: Updates are distributed through GitHub Releases
4. **Seamless Process**: Download → Install → Restart

## Publishing Updates

### Prerequisites

1. **GitHub Personal Access Token**
   - Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
   - Click "Generate new token (classic)"
   - Give it a name (e.g., "NIVTO Updater")
   - Select scopes: `repo` (all)
   - Generate and save the token securely

2. **Set Environment Variable**
   ```bash
   # Windows PowerShell
   $env:GH_TOKEN="your_github_token_here"
   
   # Or add to system environment variables permanently
   ```

### Release Process

1. **Update Version**
   - Edit `package.json` and increment the `version` field
   - Example: `"version": "1.0.0"` → `"version": "1.1.0"`

2. **Build and Publish**
   ```bash
   npm run build
   
   # After build completes, publish to GitHub
   npx electron-builder --win --x64 --publish always
   ```

3. **GitHub Release Created**
   - This automatically creates a new release on GitHub
   - Includes the installer and necessary update files
   - Users will be notified of the update

### Manual GitHub Release (Alternative)

If you prefer manual control:

1. Build the app: `npm run build`
2. Go to GitHub → Releases → Create a new release
3. Tag version (e.g., `v1.1.0`)
4. Upload these files from `dist/`:
   - `NIVTO Setup 1.0.0.exe` (rename to match version)
   - `latest.yml`
5. Publish the release

## Version Numbering

Follow semantic versioning (MAJOR.MINOR.PATCH):
- **MAJOR**: Breaking changes (1.0.0 → 2.0.0)
- **MINOR**: New features (1.0.0 → 1.1.0)  
- **PATCH**: Bug fixes (1.0.0 → 1.0.1)

## User Experience

1. **Notification**: Users see "Update Available" in Settings
2. **Download**: Click "Download Update" button
3. **Progress**: Real-time download progress displayed
4. **Install**: Click "Install & Restart" when ready
5. **Automatic**: App restarts with new version

## Testing

- Development builds skip update checks (shows "Updates only work in production build")
- Test with a production build by creating a GitHub release with higher version number
- Install the older version, then check for updates to test the flow

## Configuration

Located in `package.json`:
```json
"publish": {
  "provider": "github",
  "owner": "willie-barrows",
  "repo": "nivto-staff-manager"
}
```

## Troubleshooting

- **Updates not working**: Ensure `GH_TOKEN` is set and has `repo` permissions
- **"Update error"**: Check internet connection and GitHub repository access
- **Dev mode updates**: Not supported - updates only work in packaged builds

## Security

- Updates are verified using code signing (if configured)
- Only downloads from official GitHub repository
- Users can verify update authenticity through GitHub releases page
