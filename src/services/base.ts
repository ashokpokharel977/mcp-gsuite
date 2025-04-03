import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { AuthService, AuthenticationError } from '@/services/auth.js';

export abstract class GoogleService {
  protected auth: OAuth2Client;
  private authService: AuthService;

  constructor(auth: OAuth2Client) {
    this.auth = auth;
    this.authService = AuthService.getInstance();
    google.options({ auth });
    console.error('Initializing Google service with auth:', {
      hasAuth: !!auth,
      hasCredentials: !!auth?.credentials,
      scopes: auth?.credentials?.scope,
    });
    this.initialize();
  }

  protected abstract initialize(): void;

  protected async ensureValidAuth(): Promise<void> {
    try {
      this.auth = await this.authService.authenticate();
      google.options({ auth: this.auth });
    } catch (error) {
      if (error instanceof AuthenticationError) {
        // Just rethrow AuthenticationError as it already has a clear message
        throw error;
      }
      // For unexpected errors, provide a generic message
      throw new AuthenticationError(
        'An unexpected authentication error occurred. Please run `node dist/index.js auth` to re-authenticate.',
        'UNKNOWN_ERROR'
      );
    }
  }
} 