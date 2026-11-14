import { authConfig } from '../../../auth-config';

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

type SignInCodeDelivery = (email: string, code: string) => Promise<void>;

let deliverSignInCode: SignInCodeDelivery = (email, code) =>
  deliverToMailpit(email, 'Your Reviews sign-in code', code);

export function setSignInCodeDelivery(next: SignInCodeDelivery): void {
  deliverSignInCode = next;
}

export async function sendSignInCode(
  email: string,
  code: string,
): Promise<void> {
  await deliverSignInCode(email, code);
}

type InviteDelivery = (
  email: string,
  companyName: string,
  link: string,
  inviterName?: string,
) => Promise<void>;

function inviteLink(email: string): string {
  const url = new URL(authConfig.appURL);
  url.searchParams.set('email', email);
  return url.toString();
}

function inviteText(
  companyName: string,
  email: string,
  link: string,
  inviterName?: string,
): string {
  const intro = inviterName
    ? `${inviterName} invited you to join ${companyName} on Reviews.`
    : `You have been invited to join ${companyName} on Reviews.`;
  return `${intro}\nOpen this link and sign in as ${email} to join:\n${link}`;
}

let deliverInvite: InviteDelivery = (email, companyName, link, inviterName) =>
  deliverToMailpit(
    email,
    `Join ${companyName} on Reviews`,
    inviteText(companyName, email, link, inviterName),
  );

export function setInviteDelivery(next: InviteDelivery): void {
  deliverInvite = next;
}

export async function sendInvite(
  email: string,
  companyName: string,
  inviterName?: string,
): Promise<void> {
  await deliverInvite(email, companyName, inviteLink(email), inviterName);
}
