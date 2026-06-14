import { useMemo, useState } from 'react';
import { Input } from '@pokemon-finance/ui';
import CleanSelect, { type CleanSelectOption } from './CleanSelect';
import { CITIES_BY_PROVINCE, DISTRICTS_BY_CITY, PROVINCES } from '../lib/indonesiaLocations';

const OTHER_VALUE = '__other__';

interface SearchableLocationFieldProps {
  label: string;
  value: string;
  values: readonly string[];
  placeholder: string;
  manualPlaceholder: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}

function SearchableLocationField({
  label,
  value,
  values,
  placeholder,
  manualPlaceholder,
  disabled = false,
  onChange,
}: SearchableLocationFieldProps) {
  const hasKnownValue = values.includes(value);
  const [manualRequested, setManualRequested] = useState(false);
  const manualMode = manualRequested || Boolean(value && !hasKnownValue);

  const options = useMemo<CleanSelectOption[]>(
    () => [
      ...values.map((item) => ({ value: item, label: item })),
      { value: OTHER_VALUE, label: `${label} lainnya`, description: 'Ketik lokasi secara manual' },
    ],
    [label, values],
  );

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      <CleanSelect
        value={manualMode ? OTHER_VALUE : value}
        onChange={(nextValue) => {
          const isManual = nextValue === OTHER_VALUE;
          setManualRequested(isManual);
          onChange(isManual ? '' : nextValue);
        }}
        options={options}
        placeholder={placeholder}
        searchPlaceholder={`Cari ${label.toLowerCase()}...`}
        searchable
        disabled={disabled}
      />
      {manualMode && !disabled && (
        <Input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={manualPlaceholder}
        />
      )}
    </div>
  );
}

export interface AddressPickerValue {
  province: string;
  city: string;
  district: string;
}

interface AddressPickerProps {
  value: AddressPickerValue;
  onChange: (value: AddressPickerValue) => void;
}

export default function AddressPicker({ value, onChange }: AddressPickerProps) {
  const cities = CITIES_BY_PROVINCE[value.province] ?? [];
  const districts = DISTRICTS_BY_CITY[value.city] ?? [];

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <SearchableLocationField
        key="province"
        label="Provinsi"
        value={value.province}
        values={PROVINCES}
        placeholder="Pilih provinsi"
        manualPlaceholder="Nama provinsi"
        onChange={(province) => onChange({ province, city: '', district: '' })}
      />
      <SearchableLocationField
        key={`city-${value.province}`}
        label="Kota / Kabupaten"
        value={value.city}
        values={cities}
        placeholder={value.province ? 'Pilih kota / kabupaten' : 'Pilih provinsi dahulu'}
        manualPlaceholder="Nama kota atau kabupaten"
        disabled={!value.province}
        onChange={(city) => onChange({ ...value, city, district: '' })}
      />
      <div className="md:col-span-2">
        <SearchableLocationField
          key={`district-${value.city}`}
          label="Kecamatan"
          value={value.district}
          values={districts}
          placeholder={value.city ? 'Pilih kecamatan' : 'Pilih kota dahulu'}
          manualPlaceholder="Nama kecamatan"
          disabled={!value.city}
          onChange={(district) => onChange({ ...value, district })}
        />
      </div>
    </div>
  );
}
