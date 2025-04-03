import { OAuth2Client, Credentials } from 'google-auth-library';
import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { authenticate } from '@google-cloud/local-auth';

export class AuthenticationError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class AuthService {
  private static instance: AuthService;
  private auth: OAuth2Client | null = null;
  private credentials: Credentials | null = null;
  private readonly credentialsPath: string;
  private readonly oauthPath: string;

  private constructor() {
    const defaultCredentialsPath = path.join(os.homedir(), '.google/server-creds.json');
    const defaultOAuthPath = path.join(os.homedir(), '.google/oauth.keys.json');

    this.credentialsPath = process.env.GOOGLE_CREDENTIALS_PATH || defaultCredentialsPath;
    this.oauthPath = process.env.GOOGLE_OAUTH_PATH || defaultOAuthPath;
  }

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  private ensureDirectory(filePath: string): void {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  public async authenticate(): Promise<OAuth2Client> {
    // If we don't have auth or credentials, try to load them
    if (!this.auth || !this.credentials) {
      const loadedAuth = await this.loadSavedCredentials();
      if (!loadedAuth) {
        throw new AuthenticationError(
          'No saved credentials found. Please run `node dist/index.js auth` to authenticate.',
          'NO_CREDENTIALS'
        );
      }
    }

    // At this point we should have both auth and credentials
    if (!this.auth || !this.credentials) {
      throw new AuthenticationError(
        'Authentication state is invalid. Please run `node dist/index.js auth` to re-authenticate.',
        'INVALID_STATE'
      );
    }

    // Check if access token is expired or will expire soon (within 5 minutes)
    const expiryDate = this.credentials.expiry_date;
    const fiveMinutes = 5 * 60 * 1000; // 5 minutes in milliseconds
    
    if (expiryDate && expiryDate > Date.now() + fiveMinutes) {
      return this.auth;
    }

    // If we have a refresh token, try to use it
    if (this.credentials.refresh_token) {
      try {
        const response = await this.auth.refreshAccessToken();
        this.credentials = response.credentials;
        await this.saveCredentials(this.credentials);
        return this.auth;
      } catch (error) {
        throw new AuthenticationError(
          'Failed to refresh access token. Your refresh token may have expired. Please run `node dist/index.js auth` to re-authenticate.',
          'REFRESH_FAILED'
        );
      }
    }

    throw new AuthenticationError(
      'No refresh token available. Please run `node dist/index.js auth` to re-authenticate.',
      'NO_REFRESH_TOKEN'
    );
  }

  public async performFullAuthentication(): Promise<OAuth2Client> {
    if (!fs.existsSync(this.oauthPath)) {
      throw new AuthenticationError(
        `OAuth keys file not found at ${this.oauthPath}. Please set up your OAuth credentials first.`,
        'NO_OAUTH_KEYS'
      );
    }

    try {
      const oauthConfig = JSON.parse(await fs.promises.readFile(this.oauthPath, 'utf-8'));
      this.auth = new google.auth.OAuth2(
        oauthConfig.installed.client_id,
        oauthConfig.installed.client_secret,
        oauthConfig.installed.redirect_uris[0]
      );

      this.auth = await authenticate({
        keyfilePath: this.oauthPath,
        scopes: [
          "https://www.googleapis.com/auth/drive.file",
          "https://www.googleapis.com/auth/drive.metadata.readonly",
          "https://www.googleapis.com/auth/documents",
          "https://www.googleapis.com/auth/spreadsheets"
        ],
      });

      this.credentials = this.auth.credentials;
      await this.saveCredentials(this.credentials);
      return this.auth;
    } catch (error) {
      throw new AuthenticationError(
        'Failed to complete browser-based authentication. Please try again.',
        'AUTH_FAILED'
      );
    }
  }

  private async saveCredentials(credentials: Credentials): Promise<void> {
    try {
      this.ensureDirectory(this.credentialsPath);
      await fs.promises.writeFile(
        this.credentialsPath,
        JSON.stringify(credentials, null, 2)
      );
    } catch (error) {
      throw new AuthenticationError(
        `Failed to save credentials to ${this.credentialsPath}. Please check file permissions.`,
        'SAVE_FAILED'
      );
    }
  }

  public async loadSavedCredentials(): Promise<OAuth2Client | null> {
    try {
      if (!fs.existsSync(this.credentialsPath)) {
        return null;
      }

      if (!fs.existsSync(this.oauthPath)) {
        throw new AuthenticationError(
          `OAuth keys file not found at ${this.oauthPath}. Please set up your OAuth credentials first.`,
          'NO_OAUTH_KEYS'
        );
      }

      const content = await fs.promises.readFile(this.credentialsPath, 'utf-8');
      const credentials = JSON.parse(content);
      
      const oauthConfig = JSON.parse(await fs.promises.readFile(this.oauthPath, 'utf-8'));
      this.auth = new google.auth.OAuth2(
        oauthConfig.installed.client_id,
        oauthConfig.installed.client_secret,
        oauthConfig.installed.redirect_uris[0]
      );
      
      this.auth.setCredentials(credentials);
      this.credentials = credentials;
      
      return this.auth;
    } catch (error) {
      if (error instanceof AuthenticationError) {
        throw error;
      }
      throw new AuthenticationError(
        'Failed to load saved credentials. Please run `node dist/index.js auth` to re-authenticate.',
        'LOAD_FAILED'
      );
    }
  }

  public getAuth(): OAuth2Client | null {
    return this.auth;
  }
} 