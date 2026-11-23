import { requirePermission } from "@/lib/authorization";
import { asc } from "drizzle-orm";
import { Button, Checkbox, Table, TableBody, TableCell, TableHead, TableHeadCell, TableRow } from "flowbite-react";
import type { Metadata } from "next";
import { db } from "@/db";
import { gradesSubject as subject } from "@/db/schema/app";
import { allLocks } from "@/lib/grade-lock";
import { GRADE_PERIODS } from "@/lib/grades";
import { saveGradeLocks } from "./actions";

export const metadata: Metadata = { title: "Bloqueio de notas" };

export default async function GradeLocksPage() {
  await requirePermission("grades", "manage");
  const [subjects, locks] = await Promise.all([db.select({ id: subject.id, name: subject.name }).from(subject).orderBy(asc(subject.name)), allLocks()]);
  return (
    <form action={saveGradeLocks} className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Bloqueio de notas</h1>
      <p className="text-sm text-gray-500">
        Marque a matéria e o bimestre em que os professores não podem mais lançar ou alterar notas. A secretaria continua podendo editar. Conceito, nota extra e ajuste são sempre só da secretaria.
      </p>
      <div className="overflow-x-auto">
        <Table striped>
          <TableHead>
            <TableRow>
              <TableHeadCell>Matéria</TableHeadCell>
              {GRADE_PERIODS.map(([b, name]) => (
                <TableHeadCell key={b} className="text-center whitespace-nowrap">
                  {name}
                </TableHeadCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {subjects.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium text-gray-900">{s.name}</TableCell>
                {GRADE_PERIODS.map(([b, name]) => (
                  <TableCell key={b} className="text-center">
                    {locks.has(`${s.id}:${b}`) && <input type="hidden" name="shown" value={`${s.id}:${b}`} />}
                    <Checkbox name="lock" value={`${s.id}:${b}`} defaultChecked={locks.has(`${s.id}:${b}`)} aria-label={`Bloquear ${s.name} - ${name}`} />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div>
        <Button type="submit">Salvar bloqueios</Button>
      </div>
    </form>
  );
}
