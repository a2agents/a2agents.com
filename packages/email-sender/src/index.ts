export type SendEmailInput = {
  from: string;
  to: string;
  subject: string;
  text: string;
  inReplyTo?: string;
  references?: string;
};

export type EmailSenderEnv = {
  POSTMARK_SERVER_TOKEN?: string;
};

export async function sendEmail(input: SendEmailInput, env: EmailSenderEnv): Promise<void> {
  if (!env.POSTMARK_SERVER_TOKEN) {
    throw new Error("Missing POSTMARK_SERVER_TOKEN secret");
  }

  const headers: Array<{ Name: string; Value: string }> = [];
  if (input.inReplyTo) {
    headers.push({ Name: "In-Reply-To", Value: input.inReplyTo });
  }
  if (input.references) {
    headers.push({ Name: "References", Value: input.references });
  }

  const response = await fetch("https://api.postmarkapp.com/email", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "accept": "application/json",
      "x-postmark-server-token": env.POSTMARK_SERVER_TOKEN
    },
    body: JSON.stringify({
      From: input.from,
      To: input.to,
      Subject: input.subject,
      TextBody: input.text,
      Headers: headers
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Postmark send failed: ${response.status} ${body}`);
  }
}
