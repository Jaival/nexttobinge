"use client";

import { useTransition } from "react";
import { GlobeIcon } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { setCountry } from "@/app/actions/country";

interface CountrySelectProps {
  value: string;
  /** Names are resolved on the server so they can't differ from the client's ICU data. */
  countries: { code: string; name: string }[];
}

export function CountrySelect({ value, countries }: CountrySelectProps) {
  const [pending, startTransition] = useTransition();

  return (
    <Select
      value={value}
      disabled={pending}
      onValueChange={(code) => startTransition(() => setCountry(code))}
    >
      <SelectTrigger size="sm" className="w-[11rem] text-xs" aria-label="Country">
        <GlobeIcon />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {countries.map(({ code, name }) => (
          <SelectItem key={code} value={code} className="text-xs">
            {name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
