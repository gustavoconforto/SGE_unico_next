"use client";

import { Alert, Button, Checkbox, HelperText, Label, Select, Table, TableBody, TableCell, TableHead, TableHeadCell, TableRow } from "flowbite-react";
import { useRouter } from "next/navigation";
import { useActionState } from "react";
import { saveStudentPathways } from "../actions";

type Row = { id: number; pathway: string; name: string; schedule: string; capacity: number | null; taken: number; current: boolean; full: boolean };

export function StudentPicker({ enrollments, value }: { enrollments: [number, string][]; value: number | null }) {
  const router = useRouter();
  return (
    <div className="max-w-xl">
      <Label htmlFor="enrollment">Matrícula</Label>
      <Select id="enrollment" value={value ?? ""} onChange={(e) => router.replace(e.target.value ? `?enrollment=${e.target.value}` : "?", { scroll: false })}>
        <option value="">Selecione um aluno</option>
        {enrollments.map(([id, l]) => (
          <option key={id} value={id}>
            {l}
          </option>
        ))}
      </Select>
    </div>
  );
}

/** The year's offerings, ticked when the student is in them; full ones are disabled unless already in. */
export function StudentPathwaysForm({ enrollmentId, rows }: { enrollmentId: number; rows: Row[] }) {
  const [state, action, pending] = useActionState(saveStudentPathways.bind(null, enrollmentId), {});
  if (!rows.length) return <p className="text-gray-600">Nenhuma turma de itinerário no ano escolar desta matrícula.</p>;
  return (
    <form action={action} className="flex flex-col gap-3">
      {state.formError && <Alert color="failure">{state.formError}</Alert>}
      <Table striped>
        <TableHead>
          <TableRow>
            <TableHeadCell className="w-12">Inscrito</TableHeadCell>
            <TableHeadCell>Itinerário</TableHeadCell>
            <TableHeadCell>Turma</TableHeadCell>
            <TableHeadCell>Horário</TableHeadCell>
            <TableHeadCell className="text-right whitespace-nowrap">Vagas</TableHeadCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((r) => {
            const error = state.errors?.[`offering_${r.id}`]?.[0];
            return (
              <TableRow key={r.id}>
                <TableCell>
                  <Checkbox name={`offering_${r.id}`} defaultChecked={r.current} disabled={r.full && !r.current} aria-label={r.pathway} />
                </TableCell>
                <TableCell className="font-medium text-gray-900">
                  {r.pathway}
                  {error && <HelperText color="failure">{error}</HelperText>}
                </TableCell>
                <TableCell>{r.name || "—"}</TableCell>
                <TableCell>{r.schedule || "—"}</TableCell>
                <TableCell className="text-right">{r.capacity === null ? `${r.taken} inscritos` : `${r.taken} / ${r.capacity}`}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      <div>
        <Button type="submit" disabled={pending}>
          Salvar
        </Button>
      </div>
    </form>
  );
}
