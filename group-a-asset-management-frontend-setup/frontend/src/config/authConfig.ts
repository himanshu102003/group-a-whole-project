//NEW AZURE APP: 

import { Configuration, PublicClientApplication } from '@azure/msal-browser';

export const msalConfig: Configuration = {
  auth: {
    clientId: '891b22c5-e944-4eac-b1fc-f872531b28c0', // NEW CLIENT ID
    authority: 'https://login.microsoftonline.com/common', // Support all account types
    redirectUri: window.location.origin,
  },
  cache: {
    cacheLocation: 'localStorage',
    storeAuthStateInCookie: false,
  },
};

export const loginRequest = {
  scopes: ['User.Read'],
};

export const createMsalInstance = () => {
  try {
    return new PublicClientApplication(msalConfig);
  } catch {
    return null;
  }
};

export const msalInstance = createMsalInstance();
