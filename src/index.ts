#!/usr/bin/env node

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { MCPGoogleSuiteServer } from "@/server.js";
import { AuthService } from "@/services/auth.js";

async function main() {
  try {
    const authService = AuthService.getInstance();
    
    // If auth argument is present, perform authentication flow
    if (process.argv.includes("auth")) {
      await authService.performFullAuthentication();
      console.error('Authentication completed successfully');
      process.exit(0);
    }

    // When running server, only try to load saved credentials
    const auth = await authService.loadSavedCredentials();
    if (!auth) {
      console.error('\nNo saved credentials found. Please run the following command first:');
      console.error(`node ${process.argv[1]} auth`);
      process.exit(1);
    }

    console.error("Starting server with authenticated client...");
    const transport = new StdioServerTransport();
    const server = new MCPGoogleSuiteServer(auth);
    await server.connect(transport);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main().catch(console.error);