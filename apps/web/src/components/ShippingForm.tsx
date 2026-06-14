import CurrencyInput from './CurrencyInput';
import type { InvoiceShipping } from '../services/shipping';

interface ShippingFormProps {
  value: InvoiceShipping;
  onChange: (shipping: InvoiceShipping) => void;
}

export default function ShippingForm({ value, onChange }: ShippingFormProps) {
  const updateCost = (shippingCost: number) => {
    onChange({
      ...value,
      courier: shippingCost > 0 ? 'JNE' : '',
      service: shippingCost > 0 ? 'Ongkir Manual' : '',
      description: shippingCost > 0 ? 'Biaya pengiriman diisi admin' : undefined,
      shippingCost,
      etd: undefined,
    });
  };

  return (
    <section>
      <CurrencyInput
        label="Biaya Ongkir"
        value={value.shippingCost}
        onChange={updateCost}
      />
    </section>
  );
}
