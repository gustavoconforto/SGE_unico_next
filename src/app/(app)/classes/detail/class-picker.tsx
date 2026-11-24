"use client";

import { Label, Select } from "flowbite-react";
import { useRouter } from "next/navigation";

type Options = [number, string][];

/** Year then class; changing the year clears the class (Django's ClassOptionsView). */
export function ClassPicker(props: {
  years: Options;
  classes: Options;
  yearId: number | null;
  classId: number | null;
}) {
  const router = useRouter();
  const go = (params: Record<string, string>) =>
    router.replace(`/classes/detail?${new URLSearchParams(params)}`, { scroll: false });
  return (
    <>
      <div>
        <Label htmlFor="school_year" className="text-xs">
          Ano letivo
        </Label>
        <Select
          id="school_year"
          sizing="sm"
          className="min-w-32"
          value={props.yearId ?? ""}
          onChange={(e) => go(e.target.value ? { school_year: e.target.value } : {})}
        >
          <option value="">Selecione</option>
          {props.years.map(([id, label]) => (
            <option key={id} value={id}>
              {label}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor="school_class" className="text-xs">
          Turma
        </Label>
        <Select
          id="school_class"
          sizing="sm"
          className="min-w-48"
          value={props.classId ?? ""}
          disabled={!props.yearId}
          onChange={(e) =>
            go({ school_year: String(props.yearId), ...(e.target.value && { school_class: e.target.value }) })
          }
        >
          <option value="">Selecione</option>
          {props.classes.map(([id, label]) => (
            <option key={id} value={id}>
              {label}
            </option>
          ))}
        </Select>
      </div>
    </>
  );
}
