"use client";

import { GlobeIcon } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { COUNTRY_COOKIE, COUNTRY_COOKIE_MAX_AGE } from "@/lib/country";

interface CountrySelectProps {
  value: string;
  /** Names are resolved on the server so they can't differ from the client's ICU data. */
  countries: { code: string; name: string }[];
  onChange: (code: string) => void;
}

export function CountrySelect({ value, countries, onChange }: CountrySelectProps) {
  return (
    <Select
      value={value}
      onValueChange={(code) => {
        document.cookie = `${COUNTRY_COOKIE}=${code}; path=/; max-age=${COUNTRY_COOKIE_MAX_AGE}; samesite=lax`;
        onChange(code);
      }}
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
