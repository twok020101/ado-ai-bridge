# Contributing to ADO Agent Bridge

## Development Setup

1.  **Install Dependencies**:
    ```bash
    npm install
    ```
2.  **Mock Mode**:
    This extension supports a "Mock Mode" for development without real ADO credentials.
    - Go to VS Code Settings (`Cmd+,`).
    - Search for `ADO Agent Bridge: Enable Mock Mode` and check it.
    - Run `ADO Bridge: Configure` (you can skip inputs) and then `ADO Bridge: List Repositories` to see dummy data.

## Scripts

- `npm run build`: Compile TypeScript.
- `npm run watch`: Watch for changes.
- `npm run lint`: Lint code with ESLint.
- `npm run format`: Format code with Prettier.
- `npm test`: Run unit tests with Jest.

## Testing

We use Jest for unit testing.

```bash
npm test
```
