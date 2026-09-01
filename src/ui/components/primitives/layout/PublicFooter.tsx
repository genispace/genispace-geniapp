import { Link } from 'react-router-dom';
import { Github, MessageSquare, ArrowRight, CheckCircle2, ExternalLink } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { NavigationConfig } from './PublicHeader';
import { isDesktop, openExternal } from '../../../platform';

export interface PublicFooterProps {

  navigationConfig: NavigationConfig;
}

type ReleaseEdition = 'cn' | 'global' | 'standalone';

function getReleaseEdition(): ReleaseEdition {
  const runtimeEdition = (window as { __APP_CONFIG__?: { RELEASE_EDITION?: string } }).__APP_CONFIG__?.RELEASE_EDITION;
  if (runtimeEdition === 'cn' || runtimeEdition === 'global' || runtimeEdition === 'standalone') {
    return runtimeEdition;
  }
  return 'standalone';
}

function isChinaEdition(): boolean {
  return getReleaseEdition() === 'cn';
}

function isStandaloneEdition(): boolean {
  return getReleaseEdition() === 'standalone';
}

export function PublicFooter({ navigationConfig }: PublicFooterProps) {
  const { t } = useTranslation('common');
  const showIcpRecord = isChinaEdition();
  const isStandalone = isStandaloneEdition();

  const standaloneNavigation = {
    resources: [
      { name: t('footer.navigation.docs', "Documentation"), href: 'https://docs.genispace.cn', external: true },
      { name: t('footer.navigation.api', "API Reference"), href: 'https://docs.genispace.cn/api/overview', external: true },
      { name: t('footer.navigation.licenseQuery', "License Query"), href: 'https://www.genispace.com/license-query', external: true },
      { name: t('footer.navigation.contact', "Contact"), href: 'https://www.genispace.com/contact', external: true },
    ],
    social: [
      { name: t('footer.navigation.wechat', "WeChat"), href: 'https://www.genispace.com/contact', external: true, icon: <MessageSquare className="w-5 h-5" /> },
      { name: t('footer.navigation.github', "GitHub"), href: 'https://github.com/genispace', external: true, icon: <Github className="w-5 h-5" /> },
    ],
  };

  const saasNavigation = {
    quick: [
      { name: t('footer.navigation.freeTrial', "Free Trial"), href: '/sign-up', highlight: true, baseUrl: navigationConfig.appUrl },
      { name: t('footer.navigation.demo', "Request Demo"), href: '/contact', highlight: true, baseUrl: navigationConfig.webUrl },
      { name: t('footer.navigation.features', "Features"), href: '/features', baseUrl: navigationConfig.webUrl },
    ],
    product: [
      { name: t('footer.navigation.features', "Features"), href: '/features', baseUrl: navigationConfig.webUrl },
      { name: t('footer.navigation.applications', "App Store"), href: '/store', baseUrl: navigationConfig.appUrl },
      { name: t('footer.navigation.explore', "Explore"), href: '/explore', baseUrl: navigationConfig.appUrl },
    ],
    resources: [
      { name: t('footer.navigation.docs', "Documentation"), href: 'https://docs.genispace.com', external: true },
      { name: t('footer.navigation.api', "API Reference"), href: 'https://docs.genispace.com/api/overview', external: true },
      { name: t('footer.navigation.licenseQuery', "License Query"), href: '/license-query', baseUrl: navigationConfig.appUrl },
      { name: t('footer.navigation.contact', "Contact"), href: '/contact', baseUrl: navigationConfig.webUrl },
    ],
    partner: [
      { name: t('footer.navigation.partnerApply', "Become a Partner"), href: '/', baseUrl: navigationConfig.partnerUrl },
      { name: t('footer.navigation.partnerProfile', "Partner Profile"), href: '/profile', baseUrl: navigationConfig.partnerUrl },
    ],
    social: [
      { name: t('footer.navigation.wechat', "WeChat"), href: '/contact', baseUrl: navigationConfig.webUrl, icon: <MessageSquare className="w-5 h-5" /> },
      { name: t('footer.navigation.github', "GitHub"), href: 'https://github.com/genispace', icon: <Github className="w-5 h-5" /> },
    ],
  };

  const valueProps = [
    { 
      text: t('footer.value.deployment', "Private Deployment"),
      icon: <CheckCircle2 className="w-4 h-4" />
    },
    { 
      text: t('footer.value.integration', "Quick Integration"),
      icon: <CheckCircle2 className="w-4 h-4" />
    },
    { 
      text: t('footer.value.ecosystem', "Open Ecosystem"),
      icon: <CheckCircle2 className="w-4 h-4" />
    },
  ];

  if (isStandalone) {
    return (
      <footer className="relative border-t bg-white dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="flex items-center gap-4">
              <Link to="/" className="inline-block group">
                <span className="text-lg font-bold font-display transition-all text-neutral-900 dark:text-neutral-50">
                  GeniSpace
                </span>
              </Link>
              <span className="text-sm text-neutral-500 dark:text-neutral-400">
                {t('footer.description', "Enterprise-Grade Artificial Intelligence Platform")}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-4 md:gap-6">
              {standaloneNavigation.resources.map((item) => (
                <a
                  key={item.name}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => {
                    if (isDesktop()) {
                      e.preventDefault();
                      openExternal(item.href);
                    }
                  }}
                  className="text-sm inline-flex items-center gap-1 transition-all text-neutral-700 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-50"
                >
                  <span>{item.name}</span>
                  <ExternalLink className="w-3 h-3 opacity-50" />
                </a>
              ))}
            </div>

            <div className="flex gap-2">
              {standaloneNavigation.social.map((item) => (
                <a
                  key={item.name}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => {
                    if (isDesktop()) {
                      e.preventDefault();
                      openExternal(item.href);
                    }
                  }}
                  className="p-1.5 rounded-lg transition-all bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-50 hover:bg-neutral-200 dark:hover:bg-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600 hover:-translate-y-0.5"
                  title={item.name}
                >
                  {item.icon}
                </a>
              ))}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-neutral-200 dark:border-neutral-800">
            <div className="text-center text-sm text-neutral-600 dark:text-neutral-500">
              © {new Date().getFullYear()} {t('footer.copyright', "GeniSpace AI Platform. All rights reserved.")}
            </div>
          </div>
        </div>
      </footer>
    );
  }

  return (
    <footer 
      className="relative border-t bg-white dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800"
    >
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-2 md:grid-cols-12 gap-8">
          <div className="col-span-2 md:col-span-4 space-y-3">
            <Link to="/" className="inline-block group">
              <span 
                className="text-lg font-bold font-display transition-all text-neutral-900 dark:text-neutral-50"
              >
                GeniSpace
              </span>
            </Link>
            <p 
              className="text-sm leading-relaxed text-neutral-700 dark:text-neutral-400"
            >
              {t('footer.description', "Enterprise-Grade Artificial Intelligence Platform")}
            </p>

            <div 
              className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-neutral-600 dark:text-neutral-400"
            >
              {valueProps.map((prop, index) => (
                <div key={index} className="flex items-center gap-1.5">
                  <span className="text-neutral-800 dark:text-neutral-300">{prop.icon}</span>
                  <span>{prop.text}</span>
                </div>
              ))}
            </div>

            <div className="flex gap-2 pt-1">
              {saasNavigation.social.map((item) => {
                const fullUrl = 'baseUrl' in item && item.baseUrl ? `${item.baseUrl}${item.href}` : item.href;
                const isExternal = !('baseUrl' in item) || !item.baseUrl;

                return (
                  <a
                    key={item.name}
                    href={fullUrl}
                    onClick={(e) => {
                      if (isDesktop()) {
                        e.preventDefault();
                        openExternal(fullUrl);
                      } else if ('baseUrl' in item && item.baseUrl) {
                        e.preventDefault();
                        window.location.href = fullUrl;
                      }
                    }}
                    className="p-1.5 rounded-lg transition-all bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-50 hover:bg-neutral-200 dark:hover:bg-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600 hover:-translate-y-0.5"
                    target={isExternal && !isDesktop() ? "_blank" : undefined}
                    rel={isExternal && !isDesktop() ? "noopener noreferrer" : undefined}
                    title={item.name}
                  >
                    {item.icon}
                  </a>
                );
              })}
            </div>
          </div>

          <div className="md:col-span-2">
            <h3 
              className="text-xs font-semibold mb-3 uppercase tracking-wider text-neutral-900 dark:text-neutral-50"
            >
              {t('footer.navigation.quickStart', "Quick Start")}
            </h3>
            <ul className="space-y-2">
              {saasNavigation.quick.map((item) => {
                const fullUrl = item.baseUrl ? `${item.baseUrl}${item.href}` : item.href;
                const isExternal = ('external' in item && item.external) || !!item.baseUrl;

                return (
                  <li key={item.name}>
                    {isExternal ? (
                      <a
                        href={fullUrl}
                        onClick={(e) => {
                          if (isDesktop()) {
                            e.preventDefault();
                            openExternal(fullUrl);
                          } else if (item.baseUrl) {
                            e.preventDefault();
                            window.location.href = fullUrl;
                          }
                        }}
                        className={`text-sm inline-flex items-center group transition-all ${
                          item.highlight 
                            ? 'font-medium text-neutral-900 dark:text-neutral-50 hover:text-neutral-900 dark:hover:text-neutral-50' 
                            : 'text-neutral-700 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-50'
                        }`}
                      >
                        <span className="group-hover:translate-x-1 transition-transform">
                          {item.name}
                        </span>
                        {item.highlight && (
                          <ArrowRight 
                            className="w-3 h-3 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" 
                          />
                        )}
                      </a>
                    ) : (
                      <Link
                        to={item.href}
                        className={`text-sm inline-flex items-center group transition-all ${
                          item.highlight 
                            ? 'font-medium text-neutral-900 dark:text-neutral-50 hover:text-neutral-900 dark:hover:text-neutral-50' 
                            : 'text-neutral-700 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-50'
                        }`}
                      >
                        <span className="group-hover:translate-x-1 transition-transform">
                          {item.name}
                        </span>
                        {item.highlight && (
                          <ArrowRight 
                            className="w-3 h-3 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" 
                          />
                        )}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="md:col-span-2">
            <h3 
              className="text-xs font-semibold mb-3 uppercase tracking-wider text-neutral-900 dark:text-neutral-50"
            >
              {t('footer.navigation.product', "Product & Services")}
            </h3>
            <ul className="space-y-2">
              {saasNavigation.product.map((item) => {
                const fullUrl = item.baseUrl ? `${item.baseUrl}${item.href}` : item.href;
                const isExternal = ('external' in item && item.external) || !!item.baseUrl;

                return (
                  <li key={item.name}>
                    {isExternal ? (
                      <a
                        href={fullUrl}
                        onClick={(e) => {
                          if (isDesktop()) {
                            e.preventDefault();
                            openExternal(fullUrl);
                          } else if (item.baseUrl) {
                            e.preventDefault();
                            window.location.href = fullUrl;
                          }
                        }}
                        className="text-sm inline-flex items-center group transition-all text-neutral-700 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-50"
                      >
                        <span className="group-hover:translate-x-1 transition-transform">
                          {item.name}
                        </span>
                      </a>
                    ) : (
                      <Link
                        to={item.href}
                        className="text-sm inline-flex items-center group transition-all text-neutral-700 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-50"
                      >
                        <span className="group-hover:translate-x-1 transition-transform">
                          {item.name}
                        </span>
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="md:col-span-2">
            <h3 
              className="text-xs font-semibold mb-3 uppercase tracking-wider text-neutral-900 dark:text-neutral-50"
            >
              {t('footer.navigation.resources', "Resources")}
            </h3>
            <ul className="space-y-2">
              {saasNavigation.resources.map((item) => {
                const fullUrl = item.baseUrl ? `${item.baseUrl}${item.href}` : item.href;
                const isExternal = ('external' in item && item.external) || !!item.baseUrl;
                const isExternalLink = 'external' in item && item.external;

                return (
                  <li key={item.name}>
                    {isExternal ? (
                      <a
                        href={fullUrl}
                        onClick={(e) => {
                          if (isDesktop()) {
                            e.preventDefault();
                            openExternal(fullUrl);
                          } else if (item.baseUrl) {
                            e.preventDefault();
                            window.location.href = fullUrl;
                          }
                        }}
                        className="text-sm inline-flex items-center group transition-all text-neutral-700 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-50"
                        target={isExternalLink && !isDesktop() ? "_blank" : undefined}
                        rel={isExternalLink && !isDesktop() ? "noopener noreferrer" : undefined}
                      >
                        <span className="group-hover:translate-x-1 transition-transform">
                          {item.name}
                        </span>
                      </a>
                    ) : (
                      <Link
                        to={item.href}
                        className="text-sm inline-flex items-center group transition-all text-neutral-700 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-50"
                      >
                        <span className="group-hover:translate-x-1 transition-transform">
                          {item.name}
                        </span>
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="md:col-span-2">
            <h3 
              className="text-xs font-semibold mb-3 uppercase tracking-wider text-neutral-900 dark:text-neutral-50"
            >
              {t('footer.navigation.partners', "Partners")}
            </h3>
            <ul className="space-y-2">
              {saasNavigation.partner.map((item) => {
                const fullUrl = item.baseUrl ? `${item.baseUrl}${item.href}` : item.href;
                const isExternal = ('external' in item && item.external) || !!item.baseUrl;
                const isExternalLink = 'external' in item && item.external;

                return (
                  <li key={item.name}>
                    {isExternal ? (
                      <a
                        href={fullUrl}
                        onClick={(e) => {
                          if (isDesktop()) {
                            e.preventDefault();
                            openExternal(fullUrl);
                          } else if (item.baseUrl) {
                            e.preventDefault();
                            window.location.href = fullUrl;
                          }
                        }}
                        className="text-sm inline-flex items-center group transition-all text-neutral-700 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-50"
                        target={isExternalLink && !isDesktop() ? "_blank" : undefined}
                        rel={isExternalLink && !isDesktop() ? "noopener noreferrer" : undefined}
                      >
                        <span className="group-hover:translate-x-1 transition-transform">
                          {item.name}
                        </span>
                      </a>
                    ) : (
                      <Link
                        to={item.href}
                        className="text-sm inline-flex items-center group transition-all text-neutral-700 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-50"
                      >
                        <span className="group-hover:translate-x-1 transition-transform">
                          {item.name}
                        </span>
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        <div 
          className="mt-10 pt-6 border-t border-neutral-200 dark:border-neutral-800"
        >
          <div className="flex flex-wrap gap-4 justify-center text-sm mb-3">
            <Link 
              to="/privacy" 
              className="transition-all text-neutral-700 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-50"
            >
              {t('footer.navigation.privacyPolicy', "Privacy Policy")}
            </Link>
            <span className="text-neutral-400 dark:text-neutral-600">·</span>
            <Link 
              to="/terms" 
              className="transition-all text-neutral-700 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-50"
            >
              {t('footer.navigation.termsOfService', "Terms of Service")}
            </Link>
          </div>
          <div 
            className="text-center text-sm text-neutral-600 dark:text-neutral-500"
          >
            © {new Date().getFullYear()} {t('footer.copyright', "GeniSpace AI Platform. All rights reserved.")}
            {showIcpRecord && (
              <>
                {' · '}
                <a 
                  href="https://beian.miit.gov.cn/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  onClick={(e) => {
                    if (isDesktop()) {
                      e.preventDefault();
                      openExternal('https://beian.miit.gov.cn/');
                    }
                  }}
                  className="ml-1 transition-all text-neutral-600 dark:text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-300"
                >
                  {t('footer.icp_filing', 'ICP No. 2025187782')}
                </a>
              </>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}
