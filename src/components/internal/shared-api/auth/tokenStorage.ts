const TOKEN_KEY = 'token';
const REFRESH_TOKEN_KEY = 'refreshToken';
const USER_KEY = 'user';

export const getAuthToken = (): string | null =>
  localStorage.getItem(TOKEN_KEY);

export const getRefreshToken = (): string | null =>
  localStorage.getItem(REFRESH_TOKEN_KEY);

export const setAuthToken = (token: string, refreshToken?: string): void => {
  const oldToken = localStorage.getItem(TOKEN_KEY);
  localStorage.setItem(TOKEN_KEY, token);
  if (refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  }

  const currentUser = localStorage.getItem(USER_KEY);
  if (currentUser) {
    try {
      const userObj = JSON.parse(currentUser);
      userObj.token = token;
      if (refreshToken) {
        userObj.refreshToken = refreshToken;
      }
      localStorage.setItem(USER_KEY, JSON.stringify(userObj));
    } catch {

    }
  }

  window.dispatchEvent(
    new CustomEvent('localStorageChange', {
      detail: { key: TOKEN_KEY, newValue: token, oldValue: oldToken },
    })
  );
};

export const clearAuthToken = (): void => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);

  window.dispatchEvent(
    new CustomEvent('localStorageChange', {
      detail: { key: TOKEN_KEY, newValue: null, oldValue: null },
    })
  );
  window.dispatchEvent(
    new CustomEvent('localStorageChange', {
      detail: { key: USER_KEY, newValue: null, oldValue: null },
    })
  );
};
