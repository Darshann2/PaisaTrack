import firebaseConfig from '../../firebase-applet-config.json';

export interface FormattedAuthError {
  code: string;
  provider: 'password' | 'google.com' | 'unknown';
  title: string;
  message: string;
  isOperationNotAllowed: boolean;
  projectId: string;
  consoleUrl?: string;
  steps?: string[];
}

export function parseAuthError(
  err: any,
  provider: 'password' | 'google.com' = 'password',
  action: 'login' | 'register' | 'forgot' | 'update' = 'register'
): FormattedAuthError {
  const code = err?.code || '';
  const rawMessage = err?.message || String(err || '');
  const projectId = firebaseConfig.projectId;
  const consoleProvidersUrl = `https://console.firebase.google.com/project/${projectId}/authentication/providers`;

  if (code === 'auth/operation-not-allowed') {
    if (provider === 'password') {
      return {
        code,
        provider,
        title: 'Email/Password Sign-In Provider Disabled',
        message: `The Email/Password authentication provider is currently disabled for Firebase project "${projectId}". Firebase requires this provider to be enabled in the Firebase Console before accounts can be created or authenticated with email and password.`,
        isOperationNotAllowed: true,
        projectId,
        consoleUrl: consoleProvidersUrl,
        steps: [
          `Open the Firebase Console Sign-in Providers page for "${projectId}".`,
          'Under the "Sign-in providers" table, click on "Email/Password".',
          'Toggle the first switch ("Enable") to the ON position (leave Email link/passwordless off unless desired).',
          'Click the blue "Save" button.',
          `Return here and click "${action === 'register' ? 'Create Account' : action === 'login' ? 'Sign In' : 'Send Reset Link'}" to finish!`,
        ],
      };
    } else {
      return {
        code,
        provider,
        title: 'Google Sign-In Provider Disabled',
        message: `The Google authentication provider is currently disabled for Firebase project "${projectId}".`,
        isOperationNotAllowed: true,
        projectId,
        consoleUrl: consoleProvidersUrl,
        steps: [
          `Open the Firebase Console Sign-in Providers page for "${projectId}".`,
          'Click "Add new provider" and select "Google".',
          'Toggle "Enable" to ON, select your Project support email, and click "Save".',
          'Return here and sign in with Google.',
        ],
      };
    }
  }

  if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
    return {
      code,
      provider,
      title: 'Invalid Credentials',
      message: 'The email address or password you entered does not match our records. Please check your spelling and try again.',
      isOperationNotAllowed: false,
      projectId,
    };
  }

  if (code === 'auth/email-already-in-use') {
    return {
      code,
      provider,
      title: 'Email Already in Use',
      message: 'An account is already registered with this email address. Please switch to "Sign In" or use "Forgot password" to regain access.',
      isOperationNotAllowed: false,
      projectId,
    };
  }

  if (code === 'auth/weak-password') {
    return {
      code,
      provider,
      title: 'Weak Password',
      message: 'Firebase rejected the password because it does not meet minimum strength requirements. Please choose a password with at least 6 characters.',
      isOperationNotAllowed: false,
      projectId,
    };
  }

  if (code === 'auth/invalid-email') {
    return {
      code,
      provider,
      title: 'Invalid Email Address',
      message: 'Please enter a properly formatted email address (e.g., yourname@domain.com).',
      isOperationNotAllowed: false,
      projectId,
    };
  }

  if (code === 'auth/network-request-failed') {
    return {
      code,
      provider,
      title: 'Network Error',
      message: 'Unable to communicate with Firebase Authentication servers. Please check your internet connection and try again.',
      isOperationNotAllowed: false,
      projectId,
    };
  }

  if (code === 'auth/popup-blocked') {
    return {
      code,
      provider,
      title: 'Popup Blocked',
      message: 'Your browser prevented the authentication popup window from opening. Please allow popups for this site and retry.',
      isOperationNotAllowed: false,
      projectId,
    };
  }

  if (code === 'auth/popup-closed-by-user') {
    return {
      code,
      provider,
      title: 'Authentication Cancelled',
      message: 'The Google authentication popup was closed before completion. Please try again.',
      isOperationNotAllowed: false,
      projectId,
    };
  }

  if (code === 'auth/unauthorized-domain') {
    return {
      code,
      provider,
      title: 'Domain Not Authorized',
      message: `The domain "${typeof window !== 'undefined' ? window.location.hostname : 'current domain'}" is not authorized for OAuth operations in Firebase project "${projectId}".`,
      isOperationNotAllowed: false,
      projectId,
      consoleUrl: `https://console.firebase.google.com/project/${projectId}/authentication/settings`,
      steps: [
        'Open Firebase Console > Authentication > Settings tab.',
        'Scroll down to "Authorized domains".',
        `Click "Add domain" and add "${typeof window !== 'undefined' ? window.location.hostname : 'current domain'}".`,
        'Click "Save" and retry logging in.',
      ],
    };
  }

  if (code === 'auth/too-many-requests') {
    return {
      code,
      provider,
      title: 'Too Many Requests',
      message: 'Access to this account has been temporarily disabled due to multiple failed login attempts. You can wait a few moments or reset your password immediately.',
      isOperationNotAllowed: false,
      projectId,
    };
  }

  return {
    code,
    provider,
    title: 'Authentication Error',
    message: rawMessage || 'An unexpected error occurred during authentication.',
    isOperationNotAllowed: false,
    projectId,
  };
}
