import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { GeniAppComponentProvider } from './GeniAppComponentProvider';
import { MultiPageRenderer } from './MultiPageRenderer';
import PageRenderer from './PageRenderer';

const page = {
  components: [
    {
      id: 'localized-title',
      type: 'Typography',
      props: { type: 'h2', content: 'Operations overview' },
    },
    {
      id: 'styled-content',
      type: 'CustomContent',
      props: { html: '<strong data-testid="custom-copy">Exact component runtime</strong>' },
      customStyles: { rootStyles: { borderRadius: '18px' } },
    },
  ],
  metadata: {
    locales: {
      zh: {
        pages: {
          overview: {
            components: {
              'localized-title': { props: { content: '运营概览' } },
            },
          },
        },
      },
    },
  },
};

describe('GeniAppComponentProvider', () => {
  it('renders the same component tree with localized Workbench config', async () => {
    render(
      <MemoryRouter>
        <GeniAppComponentProvider
          applicationId="acceptance-app"
          locale="zh"
          localeMetadata={page.metadata}
        >
          <MultiPageRenderer
            activeTabId="overview"
            tabs={[{
              id: 'overview',
              pageId: 'overview',
              title: 'Overview',
              pageConfig: page,
              isActive: true,
            }]}
            appConfig={{}}
          />
        </GeniAppComponentProvider>
      </MemoryRouter>,
    );

    expect(await screen.findByText('运营概览')).toBeInTheDocument();
    expect(screen.getByText('Exact component runtime')).toBeInTheDocument();
  });

  it('applies the configured Workbench appearance contract', async () => {
    const { unmount } = render(
      <MemoryRouter>
        <GeniAppComponentProvider applicationId="theme-app" themeId="inkOnyx">
          <div>theme probe</div>
        </GeniAppComponentProvider>
      </MemoryRouter>,
    );

    await waitFor(() => expect(document.documentElement).toHaveAttribute('data-theme', 'inkOnyx'));
    expect(document.getElementById('inkOnyx-theme-css')).not.toBeNull();
    unmount();
    expect(document.documentElement).not.toHaveAttribute('data-theme');
  });

  it('uses application-owned component modules inside the exact page layout', async () => {
    render(
      <MemoryRouter>
        <GeniAppComponentProvider applicationId="source-app" locale="en">
          <PageRenderer
            components={page.components}
            appConfig={{}}
            pageId="overview"
            renderComponent={(component, index, context) => (
              <div key={`${context.keyPrefix}${component.id}-${index}`}>
                source:{component.id}:{context.pageId}
              </div>
            )}
          />
        </GeniAppComponentProvider>
      </MemoryRouter>,
    );

    expect(screen.getByText('source:localized-title:overview')).toBeInTheDocument();
    expect(screen.getByText('source:styled-content:overview')).toBeInTheDocument();
    expect(screen.queryByText('Operations overview')).not.toBeInTheDocument();
  });
});
