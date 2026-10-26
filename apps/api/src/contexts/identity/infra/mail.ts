type MagicLinkDelivery = (email: string, url: string) => Promise<void>;

async function deliverToMailpit(
  email: string,
  subject: string,
  text: string,
): Promise<void> {
  const base = process.env.MAILPIT_URL ?? 'http://127.0.0.1:8025';
  const response = await fetch(`${base}/api/v1/send`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      From: { Email: 'reviews@localhost' },
      To: [{ Email: email }],
      Subject: subject,
      Text: text,
    }),
  });
  if (!response.ok) {
    throw new Error(`mailpit send failed ${response.status}`);
  }
}

let deliverMagicLink: MagicLinkDelivery = (email, url) =>
  deliverToMailpit(email, 'Sign in to Reviews', url);

export function setMagicLinkDelivery(next: MagicLinkDelivery): void {
  deliverMagicLink = next;
}

export async function sendMagicLink(email: string, url: string): Promise<void> {
  await deliverMagicLink(email, url);
}

type InviteDelivery = (
  email: string,
  companyName: string,
  invitationId: string,
) => Promise<void>;

let deliverInvite: InviteDelivery = (email, companyName, invitationId) =>
  deliverToMailpit(
    email,
    `Join ${companyName} on Reviews`,
    `You are invited to ${companyName} on Reviews.\nSign in as ${email} and we will add you to the company.\nInvitation: ${invitationId}`,
  );

export function setInviteDelivery(next: InviteDelivery): void {
  deliverInvite = next;
}

export async function sendInvite(
  email: string,
  companyName: string,
  invitationId: string,
): Promise<void> {
  await deliverInvite(email, companyName, invitationId);
}
