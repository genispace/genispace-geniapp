import React from 'react';
import { useTranslation } from 'react-i18next';
import { Tooltip, TooltipContent, TooltipTrigger } from './tooltip';
import { Z_INDEX_CLASSES } from '../../styles/z-index-layers';

interface SidebarRailProps {
  collapsed: boolean;
  onToggle: () => void;
  show?: boolean;
}

export const SidebarRail: React.FC<SidebarRailProps> = ({ collapsed, onToggle, show }) => {
  const { t } = useTranslation('common');
  const railLabel = collapsed
    ? t('sidebar.rail.expand', 'Click to expand sidebar')
    : t('sidebar.rail.collapse', 'Click to collapse sidebar');

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={`absolute -right-2 inset-y-0 ${Z_INDEX_CLASSES.STICKY_HEADER} w-4 flex items-center justify-center transition-opacity duration-300
            ${show ? 'opacity-100' : 'opacity-0'} hover:opacity-100 group`}
          onClick={onToggle}
          role="button"
          tabIndex={-1}
          aria-label={railLabel}
          title={railLabel}
          style={{ cursor: collapsed ? 'e-resize' : 'w-resize' }}
        >
          <div className="absolute inset-y-0 left-1/2 w-[2px] group-hover:bg-neutral-300 dark:group-hover:bg-neutral-600 transition-colors duration-300"></div>
        </div>
      </TooltipTrigger>
      <TooltipContent side="right" className="select-none">
        {railLabel}
      </TooltipContent>
    </Tooltip>
  );
}; 