import { Fieldset, SelectField, TextField } from "@/components/form-fields";
import { CARD_BRANDS, MAX_CARD_INSTALLMENTS } from "@/lib/finance";

const INSTALLMENTS = Array.from(
  { length: MAX_CARD_INSTALLMENTS },
  (_, i) => [String(i + 1), i ? `${i + 1}x` : "À vista (1x)"] as const,
);

/**
 * The payer's card (not in Django): debit is charged at once, so only credit asks for installments. Parsed by
 * `cardSchema` in actions.ts. `optional`: a card payment saved before this screen asked for them may stay blank.
 */
export function CardFields({ method, optional }: { method: "CRE" | "DEB"; optional?: boolean }) {
  return (
    <Fieldset legend="Dados do cartão">
      <SelectField name="cardBrand" label="Bandeira" options={CARD_BRANDS} optional={optional} />
      <TextField
        name="cardReceipt"
        label="Nº do comprovante"
        maxLength={20}
        optional={optional}
        autoComplete="off"
        help="NSU ou código de autorização impresso no comprovante da maquininha"
      />
      {method === "CRE" && (
        <SelectField name="cardInstallments" label="Parcelas" options={INSTALLMENTS} optional={optional} />
      )}
    </Fieldset>
  );
}
