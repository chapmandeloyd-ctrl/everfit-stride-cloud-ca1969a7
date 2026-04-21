import { useMemo, useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  describeTimezone,
  getAllIanaTimezones,
  getBrowserTimezone,
} from '@/lib/healthReminderTimezone';

interface Props {
  value: string;
  onChange: (next: string) => void;
}

/**
 * Searchable combobox listing every IANA timezone the runtime knows about.
 * Device timezone + currently-selected timezone are pinned at the top.
 */
export function TimezoneCombobox({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);

  const browserTz = useMemo(() => getBrowserTimezone(), []);
  const all = useMemo(() => getAllIanaTimezones(), []);

  // Build pinned + sorted full list, deduped
  const options = useMemo(() => {
    const seen = new Set<string>();
    const pinned: string[] = [];
    if (browserTz) {
      pinned.push(browserTz);
      seen.add(browserTz);
    }
    if (value && !seen.has(value)) {
      pinned.push(value);
      seen.add(value);
    }
    const rest = all.filter((tz) => !seen.has(tz)).sort((a, b) => a.localeCompare(b));
    return [...pinned, ...rest];
  }, [all, browserTz, value]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          <span className="truncate">{value ? describeTimezone(value) : 'Select timezone…'}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command
          filter={(itemValue, search) =>
            itemValue.toLowerCase().includes(search.toLowerCase()) ? 1 : 0
          }
        >
          <CommandInput placeholder="Search timezones (e.g. Tokyo, GMT, Auckland)…" />
          <CommandList className="max-h-72">
            <CommandEmpty>No matching timezone.</CommandEmpty>
            <CommandGroup>
              {options.map((tz) => {
                const isPinned = tz === browserTz;
                return (
                  <CommandItem
                    key={tz}
                    value={tz}
                    onSelect={() => {
                      onChange(tz);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        value === tz ? 'opacity-100' : 'opacity-0',
                      )}
                    />
                    <span className="flex-1 truncate">{describeTimezone(tz)}</span>
                    {isPinned && (
                      <span className="ml-2 text-[10px] uppercase tracking-wide text-muted-foreground">
                        device
                      </span>
                    )}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}