import type { Metadata } from "next";
import { DiscountTypeForm } from "../discount-form";

export const metadata: Metadata = { title: "Novo desconto" };

export default function NewDiscountTypePage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Novo desconto</h1>
      <DiscountTypeForm />
    </div>
  );
}
