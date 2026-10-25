/** The only page the app may open for account deletion. */
export const ACCOUNT_DELETE_PAGE = 'https://www.rappisportshub.com/account/delete';

const DELETE_HOST = 'www.rappisportshub.com';
const DELETE_PATH = '/account/delete';

/**
 * Accept only the exact https page on www.rappisportshub.com.
 * Other schemes, hosts, paths, ports, userinfo, queries, and fragments are refused
 * so this handoff cannot carry a token or key.
 */
export function assertAccountDeleteUrl(value: string): string {
  if (value !== ACCOUNT_DELETE_PAGE) {
    throw new Error('Account deletion page is not available.');
  }
  const url = new URL(value);
  if (
    url.protocol !== 'https:' ||
    url.hostname !== DELETE_HOST ||
    url.port !== '' ||
    url.username !== '' ||
    url.password !== '' ||
    url.pathname !== DELETE_PATH ||
    url.search !== '' ||
    url.hash !== '' ||
    url.href !== ACCOUNT_DELETE_PAGE
  ) {
    throw new Error('Account deletion page is not available.');
  }
  return ACCOUNT_DELETE_PAGE;
}

export type AccountDeleteHandoff = {
  url: string;
  endsSession: false;
};

/** Confirmation already happened in the app. Opening this page does not end the session. */
export function buildAccountDeleteHandoff(): AccountDeleteHandoff {
  return {
    url: assertAccountDeleteUrl(ACCOUNT_DELETE_PAGE),
    endsSession: false,
  };
}

/**
 * Opens the delete page in the in-app browser, then the system browser.
 * Both openers receive only the page URL. A failure uses a fixed message.
 */
export async function openAccountDeletePage(
  openInApp: (url: string) => Promise<unknown>,
  openSystem: (url: string) => Promise<unknown>,
): Promise<void> {
  const { url } = buildAccountDeleteHandoff();
  try {
    await openInApp(url);
    return;
  } catch {
    // The in-app browser could not open. Try the system browser with the same page.
  }
  try {
    await openSystem(url);
  } catch {
    throw new Error('Could not open the account deletion page.');
  }
}

export function accountDeletePhraseMatches(typed: string, expected: string): boolean {
  const phrase = expected.trim().toLowerCase();
  if (!phrase) return false;
  return typed.trim().toLowerCase() === phrase;
}
