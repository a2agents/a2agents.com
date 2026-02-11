export type EmailIngestEvent = {
  from: string;
  to: string;
  subject: string;
  snippet: string;
  messageId?: string;
};

export type SlackWebhookPayload = {
  text: string;
};
