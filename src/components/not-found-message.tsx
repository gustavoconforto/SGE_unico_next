import { LinkButton } from "./link-button";

/** The 404 copy, inside the app (a deleted record's old link) and outside it (a mistyped URL). */
export function NotFoundMessage() {
  return (
    <div className="flex max-w-lg flex-col items-start gap-3">
      <h1 className="text-2xl font-semibold">Página não encontrada</h1>
      <p className="text-gray-700">O endereço pode estar digitado errado, ou o registro foi excluído. Volte ao início e procure pelo menu ou pela busca de alunos.</p>
      <LinkButton href="/">Voltar ao início</LinkButton>
    </div>
  );
}
