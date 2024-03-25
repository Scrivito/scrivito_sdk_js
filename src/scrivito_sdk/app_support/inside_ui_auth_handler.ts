import { AuthHandler } from 'scrivito_sdk/app_support/auth_handler';
import { getTreatLocalhostLike } from 'scrivito_sdk/app_support/treat_localhost_like';
import { uiAdapter } from 'scrivito_sdk/app_support/ui_adapter';
import { TokenAuthorizationProvider } from 'scrivito_sdk/client';
import { assumePresence } from 'scrivito_sdk/common';
import { load } from 'scrivito_sdk/loadable';

export const insideUiAuthHandler: AuthHandler = {
  getUserData() {
    const userData = assumePresence(uiAdapter).currentEditor();
    if (!userData) return;

    return { ...userData, id: userData.id.replace(/^scrivito:/, '') };
  },

  isUserLoggedIn() {
    return true;
  },

  ensureUserIsLoggedIn() {
    // nothing to do, the user is always logged in inside the UI
  },

  iamAuthProvider() {
    return new TokenAuthorizationProvider(async () =>
      assumePresence(
        await load(
          () =>
            (
              uiAdapter?.getEditorAuthToken({
                treatLocalhostLike: getTreatLocalhostLike(),
              }) as { token: string }
            )?.token
        )
      )
    );
  },

  loginHandler() {
    return undefined;
  },
};
