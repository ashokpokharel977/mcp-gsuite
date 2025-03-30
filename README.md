# @modelcontextprotocol/mcp-server-gsuite

[![CI](https://github.com/ashokpokharel977/mcp-gsuite/actions/workflows/ci.yml/badge.svg)](https://github.com/ashokpokharel977/mcp-gsuite/actions/workflows/ci.yml)
[![npm version](https://badge.fury.io/js/%40modelcontextprotocol%2Fmcp-server-gsuite.svg)](https://www.npmjs.com/package/@modelcontextprotocol/mcp-server-gsuite)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/node/v/@modelcontextprotocol/mcp-server-gsuite.svg)](https://nodejs.org)

MCP server for interacting with Google Drive, Sheets, and Docs. This package provides a TypeScript/JavaScript interface for Google Workspace services with rich formatting support.

## Features

- **Google Drive Operations**
  - Search and list files
  - Create and update files
  - Create and manage folders
  - Read file metadata and content
  - Support for file permissions

- **Google Docs Operations**
  - Create documents with rich formatting
  - Update document content
  - Support for cover pages, headers, footers
  - Text styling and formatting

- **Google Sheets Operations**
  - Create spreadsheets
  - Read and write cell values
  - Format cells (colors, fonts, borders)
  - Row and column operations (insert, delete, resize)
  - Cell merging

## Installation

```bash
npm install @modelcontextprotocol/mcp-server-gsuite
```

## Setup

1. [Create a new Google Cloud project](https://console.cloud.google.com/projectcreate)
2. [Enable the Google Drive API](https://console.cloud.google.com/workspace-api/products)
3. [Configure an OAuth consent screen](https://console.cloud.google.com/apis/credentials/consent)
4. Add required OAuth scopes:
   - `https://www.googleapis.com/auth/drive.file` - Create, update and read files created by the app
   - `https://www.googleapis.com/auth/drive.metadata.readonly` - View file metadata
   - `https://www.googleapis.com/auth/documents` - Create and edit Google Docs
   - `https://www.googleapis.com/auth/spreadsheets` - Create and edit Google Sheets
5. [Create an OAuth Client ID](https://console.cloud.google.com/apis/credentials/oauthclient) for application type "Desktop App"
6. Download the OAuth keys JSON file

## Usage

### Docker Usage

Authentication:
```bash
docker run -i --rm \
  --mount type=bind,source=/path/to/oauth-keys.json,target=/app/oauth-keys.json \
  -v mcp-gsuite:/app/credentials \
  -e GOOGLE_OAUTH_PATH=/app/oauth-keys.json \
  -e GOOGLE_CREDENTIALS_PATH=/app/credentials/credentials.json \
  -p 3000:3000 \
  @modelcontextprotocol/mcp-server-gsuite auth
```

Server configuration:
```json
{
  "mcpServers": {
    "gsuite": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "-v", "mcp-gsuite:/app/credentials",
        "-e", "GOOGLE_CREDENTIALS_PATH=/app/credentials/credentials.json",
        "@modelcontextprotocol/mcp-server-gsuite"
      ]
    }
  }
}
```

### NPX Usage

```json
{
  "mcpServers": {
    "gsuite": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/mcp-server-gsuite"
      ],
      "env": {
        "GOOGLE_CREDENTIALS_PATH": "/path/to/credentials.json",
        "GOOGLE_OAUTH_PATH": "/path/to/oauth-keys.json"
      }
    }
  }
}
```

### MCP Inspector usage

1. Running Local 
```bash
npx @modelcontextprotocol/inspector node dist/index.js -e GOOGLE_CREDENTIALS_PATH="$HOME/.google/server-creds.json" -e GOOGLE_OAUTH_PATH="$HOME/.google/oauth.keys.json"
```
1. Running Remote 
```bash
npx @modelcontextprotocol/inspector npx @modelcontextprotocol/mcp-server-gsuite -e GOOGLE_CREDENTIALS_PATH="$HOME/.google/server-creds.json" -e GOOGLE_OAUTH_PATH="$HOME/.google/oauth.keys.json"
```
## Development

### Prerequisites

- Node.js >= 18
- npm

### Setup

1. Clone the repository:
```bash
git clone https://github.com/ashokpokharel977/mcp-gsuite.git
cd mcp-gsuite
```

2. Install dependencies:
```bash
npm install
```

3. Build the project:
```bash
npm run build
```

### Available Scripts

- `npm run clean` - Clean build artifacts
- `npm run build` - Build the project
- `npm run dev` - Run in development mode with hot reload
- `npm start` - Start the server
- `npm run auth` - Run authentication flow

### Continuous Integration

The project uses GitHub Actions for CI/CD:

- **CI Workflow**: Runs on every push and pull request to the main branch
  - Builds the project
  - Runs type checks
  - Tests against Node.js 18.x and 20.x

- **Publish Workflow**: Automatically publishes to NPM when a new release is created
  - Requires `NPM_TOKEN` secret to be set in repository settings

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Publishing

To publish a new version:

1. Update version in `package.json`
2. Create and push a new tag:
```bash
git tag v0.0.1
git push origin v0.0.1
```
3. Create a new release on GitHub
4. The publish workflow will automatically publish to NPM

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
