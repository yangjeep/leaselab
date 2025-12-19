import { useState } from "react";
import { Input, Label, Button } from "@leaselab/ui-components";

interface ColorPickerProps {
  label: string;
  name: string;
  defaultValue?: string | null;
  helperText?: string;
}

export function ColorPicker({ label, name, defaultValue, helperText }: ColorPickerProps) {
  const [value, setValue] = useState(defaultValue ?? "");

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor={name}>{label}</Label>
        {value && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-auto px-2 py-1 text-xs"
            onClick={() => setValue("")}
          >
            Clear
          </Button>
        )}
      </div>
      <div className="flex items-center gap-3">
        <div
          className="h-12 w-12 rounded-md border"
          style={{ backgroundColor: value ? `hsl(${value})` : 'transparent' }}
        />
        <Input
          id={name}
          name={name}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="210 40% 56%"
        />
      </div>
      {helperText ? (
        <p className="text-xs text-muted-foreground">{helperText}</p>
      ) : null}
    </div>
  );
}
