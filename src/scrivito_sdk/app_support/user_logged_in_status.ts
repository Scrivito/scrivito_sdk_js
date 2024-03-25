import { getUserInfoPath } from 'scrivito_sdk/app_support/user_info';
import { JrRestApi } from 'scrivito_sdk/client';
import { onTestResetBeforeEach, setInterval } from 'scrivito_sdk/common';

let userLoggedInStatusInterval: number | undefined;

export function startPollingLoggedUser(): void {
  if (userLoggedInStatusInterval) return;

  userLoggedInStatusInterval = setInterval(fetchLoggedUser, 60000);
}

export async function fetchLoggedUser(): Promise<void> {
  await JrRestApi.get(await getUserInfoPath());
}

onTestResetBeforeEach(() => {
  if (userLoggedInStatusInterval) clearInterval(userLoggedInStatusInterval);
  userLoggedInStatusInterval = undefined;
});
