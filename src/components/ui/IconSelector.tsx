import React from 'react';
import { useTranslation } from 'react-i18next';
import { DialogSafeSelect as Select, DialogSafeSelectContent as SelectContent, DialogSafeSelectItem as SelectItem, DialogSafeSelectTrigger as SelectTrigger, DialogSafeSelectValue as SelectValue } from '@/ui/dialog-safe-select';
import { LUCIDE_ICONS, renderLucideIcon } from '@/utils/iconUtils';

interface IconSelectorProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export const IconSelector: React.FC<IconSelectorProps> = ({ 
  value, 
  onChange, 
  placeholder,
  className 
}) => {
  const { t } = useTranslation('common');
  const defaultPlaceholder = placeholder || t('icon_selector.select_icon', 'Select icon');
  const selectedIcon = LUCIDE_ICONS.find(icon => icon.value === value);

  const handleIconSelect = (iconValue: string) => {
    // Handle the special "clear" value
    if (iconValue === "__clear__") {
      onChange('');
    } else {
      onChange(iconValue);
    }
  };

  return (
    <Select 
      value={value || ''} 
      onValueChange={handleIconSelect}
    >
      <SelectTrigger className={`h-8 w-full ${className || ''}`}>
        <SelectValue placeholder={defaultPlaceholder}>
          {selectedIcon ? (
            <div className="flex items-center">
              {renderLucideIcon(selectedIcon.value, "w-4 h-4 mr-2")}
              {selectedIcon.label}
            </div>
          ) : (
            defaultPlaceholder
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__clear__">
          <div className="flex items-center text-neutral-500">
            {t('icon_selector.none', 'None')}
          </div>
        </SelectItem>
        {LUCIDE_ICONS.map((iconOption) => (
          <SelectItem key={iconOption.value} value={iconOption.value}>
            <div className="flex items-center">
              {renderLucideIcon(iconOption.value, "w-4 h-4 mr-2")}
              {iconOption.label}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
