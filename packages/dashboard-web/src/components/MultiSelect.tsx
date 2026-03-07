import {
  Button,
  Checkbox,
  DialogTrigger,
  ListBox,
  ListBoxItem,
  Popover,
  type Selection,
} from "react-aria-components";
import { cn } from "../libs/utils/cn.util";

export function MultiSelect({
  label,
  options,
  selected,
  onChange,
  className,
}: {
  label: string;
  options: string[];
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
  className?: string;
}) {
  const display =
    selected.size === 0 ?
      `All ${label.toLowerCase()}s`
    : [...selected].join(", ");

  function handleSelectionChange(keys: Selection) {
    if (keys === "all") {
      onChange(new Set(options));
    } else {
      onChange(new Set([...keys] as string[]));
    }
  }

  return (
    <DialogTrigger>
      <Button
        className={cn(
          "cursor-pointer truncate border border-input bg-background px-2 py-1 text-left text-sm text-foreground",
          className
        )}
      >
        {display}
      </Button>
      <Popover
        placement="bottom start"
        className="border border-foreground bg-background shadow-sm"
      >
        <ListBox
          aria-label={label}
          selectionMode="multiple"
          selectedKeys={selected}
          onSelectionChange={handleSelectionChange}
          className="max-h-60 overflow-y-auto outline-none"
        >
          {options.map((opt) => (
            <ListBoxItem
              key={opt}
              id={opt}
              className="flex cursor-pointer items-center gap-1.5 px-2 py-1 text-sm outline-none data-focused:bg-accent"
            >
              {({ isSelected }) => (
                <>
                  <Checkbox
                    slot={null}
                    isSelected={isSelected}
                    className="flex items-center"
                  >
                    <div className="flex h-4 w-4 items-center justify-center border border-input bg-background text-xs">
                      {isSelected && "\u2713"}
                    </div>
                  </Checkbox>
                  {opt}
                </>
              )}
            </ListBoxItem>
          ))}
        </ListBox>
      </Popover>
    </DialogTrigger>
  );
}
