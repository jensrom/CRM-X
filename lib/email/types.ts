/**
 * Shared types for email-providers.
 */

export type EmailProvider = "resend" | "microsoft" | "google" | "mailto";

export interface SendMailOpts {
  to:        string[] | string;
  cc?:       string[] | string;
  bcc?:      string[] | string;
  subject:   string;
  html:      string;
  text?:     string;
  replyTo?:  string;
  /** Knyttet ressource — bruges til EmailLog */
  resourceType?: string;
  resourceId?:   string;
}

export interface SendMailResult {
  success:   boolean;
  provider:  EmailProvider;
  messageId?: string;
  error?:    string;
  /** Den faktiske from-adresse der blev brugt */
  fromAddress: string;
}
