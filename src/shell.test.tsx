import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { Link, MemoryRouter, useLocation } from 'react-router-dom';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { GENISPACE_SHELL_SESSION_API_KEY } from './hooks';
import { GeniAppShellBridge } from './shell';

beforeAll(async () => {
  await i18n.use(initReactI18next).init({
    resources: { en: { translation: {} }, zh: { translation: {} } },
    lng: 'en',
    fallbackLng: 'en',
  });
});

function LocationProbe() {
  const location = useLocation();
  return <><output data-testid="location">{`${location.pathname}${location.search}${location.hash}`}</output><Link to="/details/42">Details</Link></>;
}

describe('GeniAppShellBridge', () => {
  it('rejects a self-declared untrusted origin', () => {
    const postMessage = vi.spyOn(window.parent, 'postMessage').mockImplementation(() => undefined);
    const onContext = vi.fn();
    render(
      <MemoryRouter>
        <GeniAppShellBridge identifier="orders" allowedShellOrigins={['https://shell.example.com']} onContext={onContext} />
      </MemoryRouter>,
    );

    fireEvent(window, new MessageEvent('message', {
      origin: 'https://evil.example.com',
      data: {
        type: 'GENISPACE_SHELL_INIT',
        v: 1,
        payload: { identifier: 'orders', pinnedVersion: '1.0.0', shellOrigin: 'https://evil.example.com' },
      },
    }));

    expect(onContext).not.toHaveBeenCalled();
    expect(postMessage).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'GENISPACE_IFRAME_READY' }), expect.anything());
  });

  it('applies trusted context and synchronizes routes in both directions', async () => {
    const postMessage = vi.spyOn(window.parent, 'postMessage').mockImplementation(() => undefined);
    const onApplicationId = vi.fn();
    render(
      <MemoryRouter initialEntries={['/overview']}>
        <GeniAppShellBridge
          identifier="orders"
          allowedShellOrigins={['https://shell.example.com']}
          onApplicationId={onApplicationId}
        />
        <LocationProbe />
      </MemoryRouter>,
    );

    fireEvent(window, new MessageEvent('message', {
      origin: 'https://shell.example.com',
      data: {
        type: 'GENISPACE_SHELL_INIT',
        v: 1,
        payload: {
          identifier: 'orders',
          applicationId: 'app-42',
          pinnedVersion: '1.0.0',
          shellOrigin: 'https://shell.example.com',
          apiPublicBaseUrl: 'https://api.example.com',
          accessToken: 'access-token',
          locale: 'zh',
          theme: 'dark',
        },
      },
    }));

    expect(onApplicationId).toHaveBeenCalledWith('app-42');
    expect(sessionStorage.getItem(GENISPACE_SHELL_SESSION_API_KEY)).toBe('https://api.example.com');
    expect(localStorage.getItem('token')).toBe('access-token');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'GENISPACE_IFRAME_READY', identifier: 'orders' }),
      'https://shell.example.com',
    );

    fireEvent(window, new MessageEvent('message', {
      origin: 'https://shell.example.com',
      data: { type: 'GENISPACE_SHELL_ROUTE', v: 1, innerPath: 'orders?state=open#queue' },
    }));
    expect(await screen.findByTestId('location')).toHaveTextContent('/orders?state=open#queue');

    fireEvent.click(screen.getByRole('link', { name: 'Details' }));
    await waitFor(() => expect(postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'GENISPACE_IFRAME_NAVIGATE', innerPath: 'details/42', replace: false }),
      'https://shell.example.com',
    ));
  });
});
