import * as React from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';
import { cn } from '@genispace/shared-utils';
import {
  COUNTRY_CODES,
  searchCountries,
  type CountryCode,
} from '@genispace/shared-utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../../ui/popover';
import { ScrollArea } from '../../ui/scroll-area';
import { useTranslation } from 'react-i18next';

export interface CountryCodeSelectProps {

  value?: string;

  onChange?: (country: CountryCode) => void;

  disabled?: boolean;

  className?: string;

  placeholder?: string;

  language?: 'en' | 'zh';

  /** When set, only these ISO country codes are listed (e.g. CN/HK/MO/TW). */
  allowedCodes?: string[];

  /** Show search input. Defaults to false when `allowedCodes` is set, otherwise true. */
  searchable?: boolean;
}

export function CountryCodeSelect({
  value,
  onChange,
  disabled = false,
  className,
  placeholder,
  language,
  allowedCodes,
  searchable,
}: CountryCodeSelectProps) {
  const { t, i18n } = useTranslation('auth');
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const inputRef = React.useRef<HTMLInputElement>(null);

  const currentLang: 'en' | 'zh' = language ?? (i18n.language?.startsWith('zh') ? 'zh' : 'en');
  const showSearch = searchable ?? !allowedCodes?.length;

  const allowedSet = React.useMemo(() => {
    if (!allowedCodes?.length) return null;
    return new Set(allowedCodes.map((code) => code.toUpperCase()));
  }, [allowedCodes]);

  const filteredCountries = React.useMemo(() => {
    let list = showSearch
      ? searchCountries(searchQuery, currentLang)
      : [...COUNTRY_CODES];
    if (allowedSet) {
      list = list.filter((country) => allowedSet.has(country.code));
    }
    return [...list].sort((a, b) => {
      const numA = parseInt(a.dialCode, 10) || 0;
      const numB = parseInt(b.dialCode, 10) || 0;
      return numA !== numB ? numA - numB : a.code.localeCompare(b.code);
    });
  }, [searchQuery, currentLang, allowedSet, showSearch]);

  const selectedCountry = React.useMemo(() => {
    if (!value) return null;
    const country = COUNTRY_CODES.find(c => c.code === value);
    if (!country) return null;
    if (allowedSet && !allowedSet.has(country.code)) return null;
    return country;
  }, [value, allowedSet]);

  React.useEffect(() => {
    if (open && showSearch && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
    if (!open) {
      setSearchQuery('');
    }
  }, [open, showSearch]);

  const handleSelect = (country: CountryCode) => {
    onChange?.(country);
    setOpen(false);
  };

  const displayName = (country: CountryCode) => {
    return currentLang === 'zh' ? country.nameCn : country.name;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            'flex h-10 items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
            className
          )}
        >
          {selectedCountry ? (
            <span className="flex items-center gap-2">
              <span className="text-base">{selectedCountry.flag}</span>
              <span>+{selectedCountry.dialCode}</span>
            </span>
          ) : (
            <span className="text-muted-foreground">
              {placeholder || t('signUp.phoneNumber.countryCode', 'Country / region')}
            </span>
          )}
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-[240px] p-0" 
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        {showSearch ? (
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <input
              ref={inputRef}
              type="text"
              placeholder={t('signUp.phoneNumber.searchCountry', 'Search countries or regions')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex h-10 w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
        ) : null}

        <ScrollArea className={showSearch ? 'h-[300px]' : 'max-h-[240px]'}>
          <div className="p-1">
            {filteredCountries.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                {t('signUp.phoneNumber.noCountryFound', 'No matching country')}
              </div>
            ) : (
              filteredCountries.map((country) => (
                <button
                  key={country.code}
                  type="button"
                  onClick={() => handleSelect(country)}
                  className={cn(
                    'relative flex w-full cursor-pointer select-none items-center rounded-sm py-2 px-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground',
                    value === country.code && 'bg-accent text-accent-foreground'
                  )}
                >
                  <span className="mr-2 text-base">{country.flag}</span>
                  <span className="flex-1 text-left">{displayName(country)}</span>
                  <span className="text-muted-foreground">+{country.dialCode}</span>
                  {value === country.code && (
                    <Check className="ml-2 h-4 w-4" />
                  )}
                </button>
              ))
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

export default CountryCodeSelect;
