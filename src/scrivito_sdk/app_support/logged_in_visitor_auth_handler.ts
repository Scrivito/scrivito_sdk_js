import { AuthHandler } from 'scrivito_sdk/app_support/auth_handler';
import { changeLoggedInState } from 'scrivito_sdk/app_support/logged_in_state';
import { startPollingLoggedUser } from 'scrivito_sdk/app_support/user_logged_in_status';
import { getUserInfo } from 'scrivito_sdk/app_support/userinfo';
import { ClientError } from 'scrivito_sdk/client';
import { ScrivitoPromise } from 'scrivito_sdk/common';
import { load } from 'scrivito_sdk/loadable';

export const loggedInVisitorAuthHandler: AuthHandler = {
  getUserData() {
    try {
      const userInfo = getUserInfo();
      if (!userInfo) return;

      const { sub: id, name, email } = userInfo;

      return { id, name, email };
    } catch (error: unknown) {
      if (error instanceof ClientError && error.code === 'auth_missing') {
        return;
      }

      throw error;
    }
  },

  isUserLoggedIn() {
    verifyUserIsLoggedIn();
    startPollingLoggedUser();

    return true;
  },

  ensureUserIsLoggedIn() {
    // nothing to do, we are logged in already
  },
};

async function verifyUserIsLoggedIn() {
  const user = await ScrivitoPromise.race([
    load(loggedInVisitorAuthHandler.getUserData),
    timeoutAfter30Seconds(),
  ]);

  if (!user) changeLoggedInState(false);
}

function timeoutAfter30Seconds() {
  return new ScrivitoPromise((resolve) =>
    setTimeout(() => resolve(null), 30000)
  );
}
