import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

vi.mock('@/lib/api/apiClient', () => ({
  default: { get: vi.fn(), put: vi.fn(), post: vi.fn() },
}));

import apiClient from '@/lib/api/apiClient';
import { GeniAppComponentProvider } from '../../runtime/GeniAppComponentProvider';
import PublishPreviewEntryRenderer from './PublishPreviewEntryRenderer';

const mockGet = apiClient.get as Mock;

const WB_UUID = '88888888-9999-4000-8111-222222222222';

function renderEntry(initialEntry: string, routePath: string) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <GeniAppComponentProvider locale="en">
        <Routes>
          <Route path={routePath} element={<PublishPreviewEntryRenderer />} />
        </Routes>
      </GeniAppComponentProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  mockGet.mockReset();
});

describe('PublishPreviewEntryRenderer', () => {
  it('renders nothing and issues no request in the GeniApp export context (identifier route param)', async () => {
    const { container } = renderEntry('/preview-app/preview', '/:workbenchId/:pageId');

    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(container.firstChild).toBeNull();
    expect(mockGet).not.toHaveBeenCalled();
  });

  it('renders nothing when there is no workbench route param at all', async () => {
    const { container } = renderEntry('/', '*');

    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(container.firstChild).toBeNull();
    expect(mockGet).not.toHaveBeenCalled();
  });

  it('loads the workbench publish status and offers preview entry in the workbench context', async () => {
    mockGet.mockImplementation((url: string) => {
      if (url === `/workbenches/${WB_UUID}`) {
        return Promise.resolve({
          data: { hasUnpublishedChanges: true, permissions: { canView: true, canEdit: true } },
        });
      }
      return Promise.reject(new Error(`unexpected ${url}`));
    });

    renderEntry(`/workbench/${WB_UUID}`, '/workbench/:workbenchId');

    expect(await screen.findByRole('button', { name: 'Enter Preview' })).toBeInTheDocument();
    expect(screen.getByText('Unpublished changes')).toBeInTheDocument();
    expect(mockGet).toHaveBeenCalledWith(
      `/workbenches/${WB_UUID}`,
      undefined,
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });
});
