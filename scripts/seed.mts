// Test data for development (`npm run db:reset`). School year 2026 is under way: new students in every series,
// grades, payments, the last two weeks of lectures and their roll calls (the latest day left to take). 2027 is
// enrolled in November 2026: the 1st and 2nd series move up a series, the 3rd graduates, a new 1st series arrives.
// One login per role; Mathematics and Portuguese have two teachers. Deterministic: the same run on the same day
// gives the same rows.
// Users go through Better Auth's own API (it hashes the passwords); money goes through the app's rules
// (createEnrollmentAccount, refreshInstallmentStatus), so balances match what the screens would produce.
import { eq } from "drizzle-orm";
import { auth } from "../src/lib/auth";
import { db } from "../src/db";
import * as t from "../src/db/schema/app";
import { user } from "../src/db/schema/auth";
import { addDays } from "../src/lib/dates";
import {
  CARD_BRANDS,
  LEVELS,
  accountInstallments,
  contractValues,
  initialStatus,
  label,
  money,
  today,
  toDb,
} from "../src/lib/finance";
import { createEnrollmentAccount, refreshInstallmentStatus, syncDocuments } from "../src/lib/finance-db";
import { isoWeekday } from "../src/lib/dates";
import { lessonDays } from "../src/lib/pathways";
import type { RoleName } from "../src/lib/permissions";
import { nextRegistration } from "../src/lib/students";

export const SEED_PASSWORD = process.env.SEED_PASSWORD ?? "senha1234";
const USERS: { username: string; name: string; role: RoleName[] }[] = [
  { username: "admin", name: "Administrador", role: ["admin"] },
  { username: "secretaria", name: "Secretaria Escolar", role: ["user", "secretaria"] },
  { username: "financeiro", name: "Financeiro", role: ["user", "financeiro"] },
  { username: "coordenacao", name: "Coordenação Pedagógica", role: ["user", "coordenacao"] },
  { username: "professor", name: "Professor", role: ["user", "professor"] },
];
const YEARS = [2026, 2027] as const;
/** Days off in each school year, with the calendar's note. */
const HOLIDAYS: Record<(typeof YEARS)[number], [string, string][]> = {
  2026: [
    ["2026-02-16", "Carnaval"],
    ["2026-02-17", "Carnaval"],
    ["2026-04-03", "Sexta-feira Santa"],
    ["2026-04-21", "Tiradentes"],
    ["2026-05-01", "Dia do Trabalho"],
    ["2026-06-04", "Corpus Christi"],
    ["2026-09-07", "Independência"],
    ["2026-10-12", "Nossa Senhora Aparecida"],
    ["2026-11-02", "Finados"],
    ["2026-11-20", "Consciência Negra"],
  ],
  2027: [
    ["2027-02-08", "Carnaval"],
    ["2027-02-09", "Carnaval"],
    ["2027-03-26", "Sexta-feira Santa"],
    ["2027-04-21", "Tiradentes"],
    ["2027-05-27", "Corpus Christi"],
    ["2027-09-07", "Independência"],
    ["2027-10-12", "Nossa Senhora Aparecida"],
    ["2027-11-02", "Finados"],
    ["2027-11-15", "Proclamação da República"],
  ],
};

const FIRST = [
  "Ana",
  "Bruno",
  "Carla",
  "Daniel",
  "Eduarda",
  "Felipe",
  "Gabriela",
  "Henrique",
  "Isabela",
  "João",
  "Larissa",
  "Mateus",
  "Natália",
  "Otávio",
  "Paula",
  "Rafael",
  "Sofia",
  "Tiago",
  "Valentina",
  "Lucas",
];
const LAST = [
  "Silva",
  "Souza",
  "Oliveira",
  "Santos",
  "Pereira",
  "Lima",
  "Carvalho",
  "Ferreira",
  "Almeida",
  "Ribeiro",
  "Gomes",
  "Martins",
];
const SUBJECTS: [string, string][] = [
  ["Matemática", "6"],
  ["Português", "5"],
  ["Física", "4.5"],
  ["Química", "4.5"],
  ["Biologia", "5"],
  ["História", "2"],
  ["Geografia", "2.5"],
  ["Inglês", "1"],
  ["Filosofia", "1"],
  ["Sociologia", "1"],
];
const CLASS_NAMES = { 1: ["Aplicação", "Brio"], 2: ["Inspiração", "Lealdade"], 3: ["Talento", "Vitória"] } as const;
const PRICES = { "1": "52800.00", "2": "54000.00", "3": "57600.00" } as const;
const STUDENTS_PER_CLASS = 6;

// mulberry32: a tiny seeded PRNG, so every reset produces the same data
let state = 20260201;
function rand() {
  state = (state + 0x6d2b79f5) | 0;
  let x = Math.imul(state ^ (state >>> 15), 1 | state);
  x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
  return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
}
const pick = <T,>(list: readonly T[]) => list[Math.floor(rand() * list.length)];
/** The payer's card or cheque, as the payment form asks for them; derived from `i`, so the random sequence stays put. */
function methodDetails(method: string, i: number, payer: { name: string; cpf: string } | null) {
  if (method === "CRE" || method === "DEB")
    return {
      cardBrand: CARD_BRANDS[i % 5][0],
      cardReceipt: String(100000 + i * 37),
      cardInstallments: method === "CRE" ? 1 + (i % 3) : 1,
    };
  if (method === "CHQ" && payer)
    return {
      checkNumber: String(850000 + i),
      checkBank: ["001", "104", "237", "341"][i % 4],
      checkBranch: String(1000 + (i % 900)),
      checkAccount: `${20000 + i}-${i % 10}`,
      checkHolderName: payer.name,
      checkHolderCpf: payer.cpf,
    };
  return {};
}
const half = (max: number) => (Math.round(rand() * max * 2) / 2).toFixed(2);

/** A CPF with valid check digits, distinct per `n`. */
function cpf(n: number) {
  const base = String(100000000 + n * 7919)
    .slice(-9)
    .split("")
    .map(Number);
  for (const len of [9, 10]) {
    const sum = base.slice(0, len).reduce((s, d, i) => s + d * (len + 1 - i), 0);
    base.push(((sum * 10) % 11) % 10);
  }
  return base.join("");
}
let people = 0;
function person(name: string, sex: "M" | "F", birthYear: number) {
  const n = ++people;
  return {
    name,
    sex,
    cpf: cpf(n),
    rg: String(3000000 + n),
    issuingAuthority: "SSP/DF",
    birthDate: `${birthYear}-${String(1 + (n % 12)).padStart(2, "0")}-${String(1 + (n % 28)).padStart(2, "0")}`,
    nationality: "Brasileira",
    placeOfBirth: "Brasília",
    phone: "",
    mobile: `619${String(80000000 + n).slice(-8)}`,
    email: `${name
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .replace(/\s+/g, ".")}@example.com`,
    address: `Quadra ${n % 30} Conjunto ${n % 9} Casa ${n}`,
    neighborhood: "Asa Sul",
    city: "Brasília",
    state: "DF",
    zipCode: "70000000",
  };
}

export async function seed() {
  const on = today();

  for (const u of USERS)
    await auth.api.createUser({
      body: {
        email: `${u.username}@example.com`,
        password: SEED_PASSWORD,
        name: u.name,
        role: u.role,
        data: { username: u.username, displayUsername: u.username },
      },
    });

  // --- reference data -------------------------------------------------------------
  const [program] = await db.insert(t.programsProgram).values({ name: "Ensino Médio" }).returning();
  const years = await db
    .insert(t.enrollmentsSchoolyear)
    .values(
      YEARS.map((y) => ({
        begins: `${y}-02-02`,
        ends: `${y}-12-11`,
        schoolDays: 200,
        totalHours: 1000,
        bi1Begins: `${y}-02-02`,
        bi1Ends: `${y}-04-17`,
        bi2Begins: `${y}-04-27`,
        bi2Ends: `${y}-07-03`,
        bi3Begins: `${y}-07-27`,
        bi3Ends: `${y}-10-02`,
        bi4Begins: `${y}-10-13`,
        bi4Ends: `${y}-12-11`,
      })),
    )
    .returning();
  const current = years[0];
  await db
    .insert(t.enrollmentsCalendarday)
    .values(
      years.flatMap((y, i) =>
        HOLIDAYS[YEARS[i]].map(([day, note]) => ({ schoolYearId: y.id, day, isSchoolDay: false, note })),
      ),
    );
  const types = await db
    .insert(t.enrollmentsEnrollmenttype)
    .values(
      years.flatMap((y, i) =>
        (["1", "2", "3"] as const).map((level) => ({
          level,
          programId: program.id,
          schoolYearId: y.id,
          startDate: y.begins,
          endDate: y.ends,
          punctualityDiscount: "0.00",
          totalPrice: i ? toDb(money(PRICES[level]).times("1.06")) : PRICES[level],
          description: `Contrato anual da ${label(LEVELS, level)} do Ensino Médio para ${y.begins.slice(0, 4)}.`,
        })),
      ),
    )
    .returning();
  await db
    .insert(t.enrollmentsNeededdocumenttype)
    .values(
      [
        "CERTIDÃO DE NASCIMENTO",
        "COMPROVANTE DE RESIDÊNCIA",
        "CPF DO ALUNO",
        "CPF DO RESPONSÁVEL",
        "HISTÓRICO ESCOLAR ENSINO FUNDAMENTAL",
      ].map((description) => ({ description })),
    );
  const discounts = await db
    .insert(t.enrollmentsDiscounttype)
    .values(
      [
        ["ALUNO ANTIGO", "20.00"],
        ["IRMÃOS", "10.00"],
        ["FILHO DE FUNCIONÁRIO", "50.00"],
      ].map(([description, percentage]) => ({ description, percentage })),
    )
    .returning();
  await db.insert(t.gradesExamtype).values([
    { code: "PS", name: "Prova de sala", kind: "R", maxScore: "3.00", order: 1 },
    { code: "PB", name: "Prova bimestral", kind: "R", maxScore: "6.00", order: 2 },
    { code: "C", name: "Conceito", kind: "R", maxScore: "1.00", order: 3 },
    { code: "EX", name: "Nota extra", kind: "B", maxScore: "5.00", order: 4 },
    { code: "A", name: "Ajuste", kind: "A", maxScore: "10.00", order: 5 },
  ]);
  const exams = Object.fromEntries((await db.select().from(t.gradesExamtype)).map((e) => [e.code, e]));
  const incidentTypes = await db
    .insert(t.incidentsIncidenttype)
    .values(
      [
        ["Conversa excessiva", "0.10"],
        ["Uso de celular em sala", "0.20"],
        ["Cola em avaliação", "0.50"],
      ].map(([type, penalty]) => ({ type, penalty })),
    )
    .returning();
  const [teacherRole, coordinationRole, secretaryRole, financeRole] = await db
    .insert(t.employeesEmployeeroletype)
    .values([{ role: "Professor" }, { role: "Coordenação" }, { role: "Secretaria" }, { role: "Financeiro" }])
    .returning();
  for (const [username, name, sex, roleId] of [
    ["secretaria", "Secretaria Escolar", "F", secretaryRole.id],
    ["coordenacao", "Coordenação Pedagógica", "M", coordinationRole.id],
    ["financeiro", "Setor Financeiro", "F", financeRole.id],
  ] as const) {
    const [emp] = await db
      .insert(t.employeesEmployee)
      .values({ ...person(name, sex, 1985), roleId, canAccessSuga: false, passwordSuga: "" })
      .returning();
    await db.update(user).set({ employeeId: emp.id }).where(eq(user.username, username));
  }
  await db.insert(t.accountsAccounttype).values([
    { name: "Mensalidade", direction: "R" },
    { name: "Material didático", direction: "R" },
    { name: "Energia elétrica", direction: "P" },
    { name: "Manutenção", direction: "P" },
  ]);
  const categories = Object.fromEntries((await db.select().from(t.accountsAccounttype)).map((c) => [c.name, c.id]));

  // --- teachers, departments, subjects --------------------------------------------
  const subjects: { id: number; name: string; teacherId: number; levelSubjectIds: number[] }[] = [];
  for (const [i, [name, weekly]] of SUBJECTS.entries()) {
    const teacher = person(`${FIRST[i]} ${LAST[(i + 5) % LAST.length]}`, i % 2 ? "M" : "F", 1980 + i);
    const [emp] = await db
      .insert(t.employeesEmployee)
      .values({ ...teacher, roleId: teacherRole.id, canAccessSuga: false, passwordSuga: "" })
      .returning();
    const [dep] = await db
      .insert(t.departmentsDepartment)
      .values({ name: `Cadeira de ${name}` })
      .returning();
    await db.insert(t.departmentsDepartmentTeachers).values({ departmentId: dep.id, employeeId: emp.id });
    const [subject] = await db.insert(t.gradesSubject).values({ name, departmentId: dep.id }).returning();
    const levelSubjects = await db
      .insert(t.gradesGradelevelsubject)
      .values([1, 2, 3].map((gradeLevel) => ({ gradeLevel, subjectId: subject.id, weeklyClasses: weekly })))
      .returning();
    await db
      .insert(t.gradesGradelevelsubjectTeachers)
      .values(levelSubjects.map((ls) => ({ gradelevelsubjectId: ls.id, employeeId: emp.id })));
    if (i < 2) {
      const [second] = await db
        .insert(t.employeesEmployee)
        .values({
          ...person(`${FIRST[10 + i]} ${LAST[(i + 8) % LAST.length]}`, i ? "F" : "M", 1975 + i),
          roleId: teacherRole.id,
          canAccessSuga: false,
          passwordSuga: "",
        })
        .returning();
      await db.insert(t.departmentsDepartmentTeachers).values({ departmentId: dep.id, employeeId: second.id });
      await db
        .insert(t.gradesGradelevelsubjectTeachers)
        .values(levelSubjects.map((ls) => ({ gradelevelsubjectId: ls.id, employeeId: second.id })));
    }
    subjects.push({ id: subject.id, name, teacherId: emp.id, levelSubjectIds: levelSubjects.map((ls) => ls.id) });
  }
  await db.update(user).set({ employeeId: subjects[0].teacherId }).where(eq(user.username, "professor"));

  // --- classes, students, guardians, enrollments (with their contract accounts) -----
  type Pupil = { id: number; name: string; selfFinancial: boolean };
  const enrollments: { id: number; level: number; classId: number; yearId: number }[] = [];
  const pupils = new Map<string, Pupil[]>();
  let registration: string | undefined;
  async function newPupil(level: number, s: number, schoolYear: number): Promise<Pupil> {
    const last = `${pick(LAST)} ${pick(LAST)}`;
    const sex = rand() < 0.5 ? "F" : "M";
    registration = nextRegistration(registration, schoolYear);
    const selfFinancial = level === 3 && s === 0; // an adult student who pays for themselves
    const [student] = await db
      .insert(t.studentsStudent)
      .values({
        ...person(`${pick(FIRST)} ${last}`, sex, schoolYear - 15 - level),
        socialName: "",
        useSocialName: false,
        registration,
        photo: "",
        isSelfFinancial: selfFinancial,
        bloodType: pick(["A+", "O+", "B+", "AB+", "O-"]),
        observations: "",
        schoolFrom: "CEF 01 de Brasília",
      })
      .returning();
    if (!selfFinancial) {
      const [g] = await db
        .insert(t.studentsGuardian)
        .values({ ...person(`${pick(FIRST)} ${last}`, "F", schoolYear - 42), maritalStatus: "C" })
        .returning();
      await db.insert(t.studentsGuardianassociation).values({
        guardianId: g.id,
        studentId: student.id,
        relationship: "MAE",
        isFinancial: true,
        isPrimaryContact: true,
        livingWith: true,
        pickUp: true,
      });
    }
    return { id: student.id, name: student.name, selfFinancial };
  }
  for (const [y, schoolYear] of YEARS.entries()) {
    const yearRow = years[y];
    for (const level of [1, 2, 3] as const) {
      const type = types.find((x) => x.schoolYearId === yearRow.id && x.level === String(level))!;
      for (const [c, className] of CLASS_NAMES[level].entries()) {
        const [klass] = await db
          .insert(t.classesClass)
          .values({
            name: className,
            gradeLevel: level,
            shift: c ? "T" : "M",
            capacity: 40,
            programId: program.id,
            yearId: yearRow.id,
          })
          .returning();
        const moving = y && level > 1 ? (pupils.get(`${schoolYear - 1}-${level - 1}-${c}`) ?? []) : null;
        const roster: Pupil[] = [];
        for (let s = 0; s < (moving?.length ?? STUDENTS_PER_CLASS); s++) {
          const pupil = moving?.[s] ?? (await newPupil(level, s, schoolYear));
          roster.push(pupil);
          const firstPercent = s === 1 ? discounts[0].percentage : "0.00";
          const remainingPercent = s === 1 ? discounts[0].percentage : s === 2 ? discounts[1].percentage : "0.00";
          const enrolledAt = y
            ? `${YEARS[0]}-11-${String(3 + s).padStart(2, "0")}`
            : `${schoolYear}-01-${String(10 + s).padStart(2, "0")}`;
          const id = await db.transaction(async (tx) => {
            const [e] = await tx
              .insert(t.enrollmentsEnrollment)
              .values({
                studentId: pupil.id,
                enrollmentTypeId: type.id,
                schoolClassId: klass.id,
                status: "A",
                dueDay: 10,
                enrolledAt,
                grossValue: type.totalPrice,
                firstDiscountPercent: firstPercent,
                remainingDiscountPercent: remainingPercent,
              })
              .returning();
            if (s === 1)
              await tx.insert(t.enrollmentsEnrollmentdiscount).values(
                ["F", "R"].map((group) => ({
                  enrollmentId: e.id,
                  group,
                  discountTypeId: discounts[0].id,
                  percentage: firstPercent,
                  observation: "",
                })),
              );
            if (s === 2)
              await tx.insert(t.enrollmentsEnrollmentdiscount).values({
                enrollmentId: e.id,
                group: "R",
                discountTypeId: discounts[1].id,
                percentage: remainingPercent,
                observation: "",
              });
            await createEnrollmentAccount(
              tx,
              {
                id: e.id,
                studentId: pupil.id,
                enrolledAt,
                dueDay: 10,
                schoolYear,
                selfFinancial: pupil.selfFinancial,
                description: `${pupil.name} - Ensino Médio - ${label(LEVELS, String(level))} - ${schoolYear}`,
              },
              contractValues(type.totalPrice, firstPercent, remainingPercent),
            );
            await syncDocuments(tx, e.id);
            return e.id;
          });
          enrollments.push({ id, level, classId: klass.id, yearId: yearRow.id });
        }
        pupils.set(`${schoolYear}-${level}-${c}`, roster);
      }
    }
  }
  const underWay = enrollments.filter((e) => e.yearId === current.id);

  // --- payments: everything due is paid, except a few debtors (overdue) and one partial payment ---
  const due = await db
    .select({
      id: t.accountsInstallment.id,
      amount: t.accountsInstallment.amount,
      dueDate: t.accountsInstallment.dueDate,
      enrollmentId: t.accountsAccount.enrollmentId,
      payer: { name: t.studentsGuardian.name, cpf: t.studentsGuardian.cpf },
    })
    .from(t.accountsInstallment)
    .innerJoin(t.accountsAccount, eq(t.accountsInstallment.accountId, t.accountsAccount.id))
    .leftJoin(t.studentsGuardian, eq(t.accountsAccount.guardianId, t.studentsGuardian.id))
    .orderBy(t.accountsInstallment.dueDate);
  const debtors = new Set(enrollments.filter((_, i) => i % 7 === 3).map((e) => e.id));
  for (const [i, inst] of due.entries()) {
    if (inst.dueDate >= on) continue;
    const debtor = debtors.has(inst.enrollmentId!) && inst.dueDate >= addDays(on, -70);
    if (debtor) continue;
    const amount = i % 23 === 0 ? money(inst.amount).div(2).toFixed(2) : inst.amount;
    const drawn = pick(["PIX", "BOL", "CRE", "DIN"]);
    const method = drawn === "CRE" && i % 3 === 0 ? "DEB" : drawn === "DIN" && i % 4 === 0 ? "CHQ" : drawn;
    await db.transaction(async (tx) => {
      await tx.insert(t.accountsPayment).values({
        installmentId: inst.id,
        paidAt: addDays(inst.dueDate, -(i % 4)),
        amount,
        penalty: "0.00",
        interest: "0.00",
        monetaryAdjust: "0.00",
        discount: "0.00",
        method,
        notes: "",
        ...methodDetails(method, i, inst.payer),
      });
      await refreshInstallmentStatus(tx, inst.id);
    });
  }

  // --- payables ----------------------------------------------------------------------
  const suppliers = await db
    .insert(t.accountsSupplier)
    .values([
      {
        name: "Companhia Energética de Brasília",
        document: "00070698000111",
        phone: "6131900000",
        email: "",
        notes: "",
      },
      {
        name: "Reparos Rápidos Ltda",
        document: "12345678000195",
        phone: "61999990000",
        email: "contato@example.com",
        notes: "",
      },
    ])
    .returning();
  for (const [s, gross, count, category] of [
    [0, "2400.00", 6, "Energia elétrica"],
    [1, "1800.00", 3, "Manutenção"],
  ] as const) {
    const [acc] = await db
      .insert(t.accountsAccount)
      .values({
        direction: "P",
        description: `${category} ${YEARS[0]}`,
        categoryId: categories[category],
        supplierId: suppliers[s].id,
        issueDate: `${YEARS[0]}-07-01`,
        grossValue: gross,
        discountValue: "0.00",
        notes: "",
      })
      .returning();
    const rows = await db
      .insert(t.accountsInstallment)
      .values(
        accountInstallments(money(gross), count, `${YEARS[0]}-08-05`).map((i) => ({
          accountId: acc.id,
          number: i.number,
          dueDate: i.dueDate,
          amount: toDb(i.amount),
          status: initialStatus(i.amount),
        })),
      )
      .returning();
    for (const r of rows.filter((r) => r.dueDate < on))
      await db.transaction(async (tx) => {
        await tx.insert(t.accountsPayment).values({
          installmentId: r.id,
          paidAt: r.dueDate,
          amount: r.amount,
          penalty: "0.00",
          interest: "0.00",
          monetaryAdjust: "0.00",
          discount: "0.00",
          method: "TED",
          notes: "",
        });
        await refreshInstallmentStatus(tx, r.id);
      });
  }

  // --- grades for the finished bimesters; incidents, delays and Q&A in the current one ---
  const bimesters = ([1, 2, 3, 4] as const).filter((b) => current[`bi${b}Ends`]! < on);
  const grades = underWay.flatMap((e) =>
    bimesters.flatMap((bimester) =>
      subjects.flatMap((s) => [
        { enrollmentId: e.id, subjectId: s.id, examTypeId: exams.PS.id, bimester, score: half(3) },
        { enrollmentId: e.id, subjectId: s.id, examTypeId: exams.PB.id, bimester, score: half(6) },
      ]),
    ),
  );
  for (let i = 0; i < grades.length; i += 500) await db.insert(t.gradesGrade).values(grades.slice(i, i + 500));
  const recent = (back: number) => addDays(on, -1 - Math.floor(rand() * back));
  await db
    .insert(t.incidentsIncident)
    .values(
      underWay
        .filter((_, i) => i % 4 === 0)
        .map((e) => ({ enrollmentId: e.id, incidentTypeId: pick(incidentTypes).id, incidentDate: recent(20) })),
    );
  await db
    .insert(t.incidentsStudentdelay)
    .values(
      underWay
        .filter((_, i) => i % 3 === 0)
        .map((e) => ({ enrollmentId: e.id, delayType: pick(["A", "A", "U"]), incidentDate: recent(20) })),
    );
  await db
    .insert(t.incidentsBathroompermission)
    .values(
      underWay
        .filter((_, i) => i % 2 === 0)
        .map((e) => ({ enrollmentId: e.id, classPeriod: 1 + Math.floor(rand() * 6), incidentDate: recent(10) })),
    );
  await db
    .insert(t.qAndAQanda)
    .values(
      underWay
        .filter((_, i) => i % 5 === 0)
        .map((e) => ({ enrollmentId: e.id, subjectId: pick(subjects).id, qAndADate: recent(15) })),
    );

  // --- timetable (Mon–Fri, periods 1–6) for both years; the last two weeks of lectures and roll calls ---
  const classes = [...new Set(enrollments.map((e) => e.classId))];
  const slots = classes.flatMap((schoolClassId, c) =>
    [1, 2, 3, 4, 5].flatMap((weekday) =>
      [1, 2, 3, 4, 5, 6].map((period) => {
        const s = subjects[(weekday * 6 + period + c) % subjects.length];
        const level = enrollments.find((e) => e.classId === schoolClassId)!.level;
        return { schoolClassId, weekday, period, subjectId: s.levelSubjectIds[level - 1], teacherId: s.teacherId };
      }),
    ),
  );
  await db.insert(t.lessonsTimetableslot).values(slots);
  const daysOff = new Set(HOLIDAYS[YEARS[0]].map(([day]) => day));
  const days = lessonDays([1, 2, 3, 4, 5], addDays(on, -14), addDays(on, -1)).filter(
    (d) => d >= current.begins && d <= current.ends && !daysOff.has(d),
  );
  const underWayClasses = new Set(underWay.map((e) => e.classId));
  const lectures = days.flatMap((date) =>
    slots
      .filter((s) => underWayClasses.has(s.schoolClassId) && s.weekday === isoWeekday(date))
      .map(({ weekday: _, ...s }) => ({
        ...s,
        date,
        topic: `${subjects.find((x) => x.levelSubjectIds.includes(s.subjectId))!.name}: revisão`,
      })),
  );
  if (lectures.length) await db.insert(t.lessonsLecture).values(lectures);
  const attendance: (typeof t.lessonsAttendance.$inferInsert)[] = [];
  const notes: (typeof t.lessonsAttendancenote.$inferInsert)[] = [];
  for (const date of days.slice(0, -1))
    for (const e of underWay) {
      const day = rand();
      const status = day < 0.04 ? "F" : day < 0.07 ? "J" : null;
      if (day >= 0.04 && day < 0.07) notes.push({ enrollmentId: e.id, date, note: "Atestado médico" });
      const lessons = lectures.filter((l) => l.date === date && l.schoolClassId === e.classId);
      const leftAt = !status && rand() < 0.05 ? 4 : null;
      if (leftAt) notes.push({ enrollmentId: e.id, date, note: "Saiu mais cedo com o responsável" });
      for (const l of lessons)
        attendance.push({
          enrollmentId: e.id,
          date,
          period: l.period,
          subjectId: l.subjectId,
          status: status ?? (leftAt && l.period >= leftAt ? "F" : rand() < 0.02 ? "F" : "P"),
        });
    }
  for (let i = 0; i < attendance.length; i += 500)
    await db.insert(t.lessonsAttendance).values(attendance.slice(i, i + 500));
  if (notes.length) await db.insert(t.lessonsAttendancenote).values(notes);

  // --- pathways: two offerings with members, weekly sessions, attendance and bimester grades ---
  const pathways = await db
    .insert(t.pathwaysPathway)
    .values([
      {
        name: "Robótica",
        description: "Montagem e programação de robôs.",
        extraPoints: "1.00",
        workloadType: "P",
        workloadHours: "0.00",
      },
      {
        name: "Iniciação científica",
        description: "Projetos de pesquisa orientados.",
        extraPoints: "1.50",
        workloadType: "F",
        workloadHours: "60.00",
      },
    ])
    .returning();
  for (const [p, pathway] of pathways.entries()) {
    const weekday = p ? 4 : 2;
    const [offering] = await db
      .insert(t.pathwaysPathwayoffering)
      .values({
        name: "Turma A",
        pathwayId: pathway.id,
        schoolYearId: current.id,
        capacity: 30,
        schedule: "17h às 18h40",
        weekdays: [weekday],
      })
      .returning();
    await db
      .insert(t.pathwaysPathwayofferingTeachers)
      .values({ pathwayofferingId: offering.id, employeeId: subjects[p + 2].teacherId });
    const members = await db
      .insert(t.pathwaysPathwayenrollment)
      .values(
        underWay
          .filter((_, i) => i % 4 === p)
          .map((e) => ({ enrollmentId: e.id, offeringId: offering.id, joinedAt: current.begins })),
      )
      .returning();
    const sessions = await db
      .insert(t.pathwaysPathwaysession)
      .values(
        lessonDays([weekday], current.begins, addDays(on, -1)).map((date, n) => ({
          offeringId: offering.id,
          date,
          topic: `Encontro ${n + 1}`,
        })),
      )
      .returning();
    const attendance = sessions.flatMap((s) =>
      members.map((m) => ({
        sessionId: s.id,
        pathwayEnrollmentId: m.id,
        status: rand() < 0.85 ? "P" : pick(["F", "J"]),
      })),
    );
    for (let i = 0; i < attendance.length; i += 500)
      await db.insert(t.pathwaysPathwayattendance).values(attendance.slice(i, i + 500));
    if (bimesters.length)
      await db.insert(t.pathwaysPathwaygrade).values(
        members.flatMap((m) =>
          bimesters.map((bimester) => ({
            pathwayEnrollmentId: m.id,
            bimester,
            score: half(Number(pathway.extraPoints)),
          })),
        ),
      );
  }

  console.log(
    `Seeded ${enrollments.length} enrollments in ${classes.length} classes over ${YEARS.join(" and ")}, ${subjects.length} subjects, ${grades.length} grades, ${attendance.length} roll call marks.`,
  );
  console.log(`Log in as ${USERS.map((u) => u.username).join(" or ")}, password "${SEED_PASSWORD}".`);
}
