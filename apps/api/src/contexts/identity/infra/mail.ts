type MagicLinkDelivery = (email: string, url: string) => Promise<void>;

async function deliverToMailpit(email: string, url: string): Promise<void> {
  const base = process.env.MAILPIT_URL ?? 'http://127.0.0.1:8025';
  const response = await fetch(`${base}/api/v1/send`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      From: { Email: 'reviews@localhost' },
      To: [{ Email: email }],
      Subject: 'Sign in to Reviews',
      Text: url,
    }),
  });
  if (!response.ok) {
    throw new Error(`mailpit send failed ${response.status}`);
  }
}

let deliverMagicLink: MagicLinkDelivery = deliverToMailpit;

export function setMagicLinkDelivery(next: MagicLinkDelivery): void {
  deliverMagicLink = next;
}

export async function sendMagicLink(email: string, url: string): Promise<void> {
  await deliverMagicLink(email, url);
}
