import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

export abstract class GoogleService {
  protected auth: OAuth2Client;

  constructor(auth: OAuth2Client) {
    this.auth = auth;
    google.options({ auth });
    this.initialize();
  }

  protected abstract initialize(): void;
} 