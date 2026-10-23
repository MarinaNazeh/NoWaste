import { render, screen } from '@testing-library/react-native';
import '@/i18n';
import HomeScreen from '../app/index';
import { isServerHealthy } from '@/api/client';

jest.mock('@/api/client', () => ({
  isServerHealthy: jest.fn(),
}));

const mockedIsServerHealthy = jest.mocked(isServerHealthy);

describe('Home screen', () => {
  test('HEALTH-02 home screen shows Server: connected when /health is ok', async () => {
    mockedIsServerHealthy.mockResolvedValue(true);

    await render(<HomeScreen />);

    expect(await screen.findByText('Server: connected')).toBeOnTheScreen();
  });

  test('HEALTH-04 home screen shows Server: not reachable when /health fails', async () => {
    mockedIsServerHealthy.mockResolvedValue(false);

    await render(<HomeScreen />);

    expect(await screen.findByText('Server: not reachable')).toBeOnTheScreen();
  });
});
