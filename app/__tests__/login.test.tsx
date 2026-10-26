// US-04 Log in/out on the app (FR-ACC-04, FR-ACC-09, E-ACC-03, E-ACC-05, E-ACC-06, IF-COM-03, NFR-06). The API is
// mocked; the token is kept in expo-secure-store (an in-memory mock in jest.setup.ts).
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { fireEvent, screen, waitFor } from 'expo-router/testing-library';
import { getMe, login, logout, updateMyLanguage, type SessionUser } from '@/api/client';
import { TOKEN_KEY } from '@/auth/tokenStorage';
import { renderApp } from './helpers/renderApp';
import { headerDirections } from './helpers/headerDirection';

jest.mock('@/api/client', () => ({
  isServerHealthy: jest.fn().mockResolvedValue(true),
  registerConsumer: jest.fn(),
  login: jest.fn(),
  logout: jest.fn().mockResolvedValue(undefined),
  getMe: jest.fn(),
  updateMyLanguage: jest.fn().mockResolvedValue(true),
  listApplications: jest.fn().mockResolvedValue({ kind: 'ok', applications: [] }),
  decideApplication: jest.fn(),
}));

const mockedLogin = jest.mocked(login);
const mockedLogout = jest.mocked(logout);
const mockedGetMe = jest.mocked(getMe);
const mockedUpdateLanguage = jest.mocked(updateMyLanguage);
const store = (SecureStore as unknown as { __secureStore: Map<string, string> }).__secureStore;

function user(overrides: Partial<SessionUser> = {}): SessionUser {
  return { id: 'u1', role: 'consumer', status: 'Active', language: 'en', ...overrides };
}

beforeEach(async () => {
  await AsyncStorage.clear();
  store.clear();
  mockedLogin.mockReset();
  mockedGetMe.mockReset();
  mockedLogout.mockClear();
  mockedUpdateLanguage.mockClear();
});

async function openLogin() {
  const app = await renderApp('/login');
  await screen.findByLabelText('Email address or mobile number');
  return app;
}

async function logInWith(emailOrPhone: string, password = 'abcd1234') {
  await fireEvent.changeText(screen.getByLabelText('Email address or mobile number'), emailOrPhone);
  await fireEvent.changeText(screen.getByLabelText('Password'), password);
  await fireEvent.press(screen.getByRole('button', { name: 'Log in' }));
}

describe('FR-ACC-04 logging in on the app', () => {
  test('FR-ACC-04 a consumer logs in with email, the token is saved securely and the consumer home opens', async () => {
    mockedLogin.mockResolvedValue({ kind: 'ok', token: 'tok-1', user: user() });
    const app = await openLogin();

    await logInWith(' mona@example.com ');

    expect(await screen.findByTestId('home-consumer')).toBeOnTheScreen();
    expect(app.getPathname()).toBe('/home');
    expect(mockedLogin).toHaveBeenCalledWith('mona@example.com', 'abcd1234');
    expect(store.get(TOKEN_KEY)).toBe('tok-1');
    expect(await AsyncStorage.getItem(TOKEN_KEY)).toBeNull();
  });

  test('FR-ACC-04 a mobile number is accepted in the same field', async () => {
    mockedLogin.mockResolvedValue({ kind: 'ok', token: 'tok-2', user: user() });
    await openLogin();

    await logInWith('01012345678');

    expect(await screen.findByTestId('home-consumer')).toBeOnTheScreen();
    expect(mockedLogin).toHaveBeenCalledWith('01012345678', 'abcd1234');
  });

  test.each([
    ['vendor', 'home-vendor'],
    ['charity', 'home-partner'],
    ['other', 'home-partner'],
    ['admin', 'home-admin'],
  ] as const)('FR-ACC-04 an approved %s gets the home screen of its role', async (role, testID) => {
    mockedLogin.mockResolvedValue({
      kind: 'ok',
      token: 't',
      user: user({ role, status: role === 'admin' ? 'Active' : 'Approved' }),
    });
    await openLogin();

    await logInWith('x@example.com');

    expect(await screen.findByTestId(testID)).toBeOnTheScreen();
  });

  test('FR-ACC-09 after login the app switches to the language saved on the account', async () => {
    mockedLogin.mockResolvedValue({ kind: 'ok', token: 't', user: user({ language: 'ar' }) });
    await openLogin();

    await logInWith('mona@example.com');

    expect(await screen.findByTestId('home-consumer')).toBeOnTheScreen();
    expect(await AsyncStorage.getItem('nowaste.language')).toBe('ar');
    expect(screen.getByTestId('home-consumer')).toBeOnTheScreen();
    expect(mockedUpdateLanguage).not.toHaveBeenCalled();
  });

  test('FR-ACC-09 switching the language while logged in saves it on the account', async () => {
    mockedLogin.mockResolvedValue({ kind: 'ok', token: 'tok-3', user: user({ language: 'en' }) });
    await openLogin();
    await logInWith('mona@example.com');
    await screen.findByTestId('home-consumer');

    await fireEvent.press(screen.getByRole('button', { name: 'العربية' }));

    await waitFor(() => {
      expect(mockedUpdateLanguage).toHaveBeenCalledWith('tok-3', 'ar');
    });
  });
});

describe('E-ACC-03 wrong credentials on the app', () => {
  test('E-ACC-03 a wrong login shows one message that does not say which credential was wrong', async () => {
    mockedLogin.mockResolvedValue({ kind: 'invalid' });
    const app = await openLogin();

    await logInWith('mona@example.com', 'wrong-pass1');

    expect(
      await screen.findByText(
        'The email address, mobile number or password is not correct. Several failed tries pause logging in to this account for a while.',
      ),
    ).toBeOnTheScreen();
    expect(app.getPathname()).toBe('/login');
    expect(store.size).toBe(0);
  });

  test('E-ACC-03 empty fields are marked and nothing is sent', async () => {
    await openLogin();

    await fireEvent.press(screen.getByRole('button', { name: 'Log in' }));

    expect(screen.getByText('Enter your email address or mobile number.')).toBeOnTheScreen();
    expect(screen.getByText('Enter your password.')).toBeOnTheScreen();
    expect(mockedLogin).not.toHaveBeenCalled();
  });

  test('FR-ACC-04 an unreachable server is explained', async () => {
    mockedLogin.mockResolvedValue({ kind: 'unreachable' });
    await openLogin();

    await logInWith('mona@example.com');

    expect(await screen.findByText(/could not reach the server/)).toBeOnTheScreen();
  });
});

describe('FR-ACC-04 IF-COM-03 logging out', () => {
  test('FR-ACC-04 Log out in the header ends the session, deletes the token and shows Welcome', async () => {
    mockedLogin.mockResolvedValue({ kind: 'ok', token: 'tok-4', user: user() });
    const app = await openLogin();
    await logInWith('mona@example.com');
    await screen.findByTestId('home-consumer');

    await fireEvent.press(screen.getByRole('button', { name: 'Log out' }));

    expect(await screen.findByText('Welcome to NoWaste')).toBeOnTheScreen();
    expect(app.getPathname()).toBe('/');
    expect(mockedLogout).toHaveBeenCalledWith('tok-4');
    expect(store.size).toBe(0);
  });

  test('FR-ACC-04 a saved token opens the home screen straight away on the next start', async () => {
    store.set(TOKEN_KEY, 'saved');
    mockedGetMe.mockResolvedValue({ kind: 'ok', user: user({ role: 'vendor', status: 'Approved' }) });
    const app = await renderApp('/');

    expect(await screen.findByTestId('home-vendor')).toBeOnTheScreen();
    expect(app.getPathname()).toBe('/home');
    expect(mockedGetMe).toHaveBeenCalledWith('saved');
  });

  test('IF-COM-03 a saved token the server refuses is deleted and Welcome is shown', async () => {
    store.set(TOKEN_KEY, 'ended');
    mockedGetMe.mockResolvedValue({ kind: 'unauthorized' });
    await renderApp('/');

    expect(await screen.findByText('Welcome to NoWaste')).toBeOnTheScreen();
    await waitFor(() => {
      expect(store.size).toBe(0);
    });
  });

  test('FR-ACC-04 without a session the home screen sends the user to Welcome', async () => {
    const app = await renderApp('/home');

    expect(await screen.findByText('Welcome to NoWaste')).toBeOnTheScreen();
    expect(app.getPathname()).toBe('/');
  });
});

describe('E-ACC-05 E-ACC-06 account status after login', () => {
  test.each([
    ['Pending', 'Your application is Pending. An administrator is reviewing it.'],
    ['Rejected', 'Your application was Rejected.'],
  ] as const)(
    'E-ACC-05 a %s vendor sees the application status and no food functions',
    async (status, text) => {
      mockedLogin.mockResolvedValue({ kind: 'ok', token: 't', user: user({ role: 'vendor', status }) });
      await openLogin();

      await logInWith('shop@example.com');

      expect(await screen.findByTestId('home-application-status')).toBeOnTheScreen();
      expect(screen.getByText(text)).toBeOnTheScreen();
      expect(
        screen.getByText('You cannot post or receive food until your application is approved.'),
      ).toBeOnTheScreen();
      expect(screen.queryByTestId('home-vendor')).toBeNull();
    },
  );

  test('E-ACC-05 a Pending partner sees the application status', async () => {
    mockedLogin.mockResolvedValue({
      kind: 'ok',
      token: 't',
      user: user({ role: 'composting', status: 'Pending' }),
    });
    await openLogin();

    await logInWith('org@example.com');

    expect(await screen.findByTestId('home-application-status')).toBeOnTheScreen();
    expect(screen.queryByTestId('home-partner')).toBeNull();
  });

  test('E-ACC-06 a Suspended account sees that it is suspended and nothing else', async () => {
    mockedLogin.mockResolvedValue({
      kind: 'ok',
      token: 't',
      user: user({ role: 'vendor', status: 'Suspended' }),
    });
    await openLogin();

    await logInWith('shop@example.com');

    expect(await screen.findByTestId('home-suspended')).toBeOnTheScreen();
    expect(screen.queryByTestId('home-vendor')).toBeNull();
    expect(screen.getByRole('button', { name: 'Log out' })).toBeOnTheScreen();
  });

  test('E-ACC-06 a saved token of a now Suspended account shows the suspended screen', async () => {
    store.set(TOKEN_KEY, 'saved');
    mockedGetMe.mockResolvedValue({ kind: 'suspended' });
    await renderApp('/');

    expect(await screen.findByTestId('home-suspended')).toBeOnTheScreen();
  });
});

describe('NFR-06 the Log in screen in Arabic', () => {
  test('NFR-06 the Log in screen and its header are right-to-left in Arabic', async () => {
    await AsyncStorage.setItem('nowaste.language', 'ar');
    await renderApp('/login');

    expect(await screen.findByLabelText('البريد الإلكتروني أو رقم المحمول')).toBeOnTheScreen();
    expect(screen.getByTestId('login-screen')).toHaveStyle({ direction: 'rtl' });
    expect(headerDirections()).toContain('rtl');
  });

  test('NFR-07a the Log in fields and the Log out button have screen reader labels', async () => {
    mockedLogin.mockResolvedValue({ kind: 'ok', token: 't', user: user() });
    await openLogin();
    expect(screen.getByLabelText('Password')).toBeOnTheScreen();

    await logInWith('mona@example.com');
    await screen.findByTestId('home-consumer');

    expect(screen.getByRole('button', { name: 'Log out' })).toHaveProp(
      'accessibilityHint',
      'Ends your session on this phone',
    );
  });
});
