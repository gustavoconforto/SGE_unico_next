// Test data for development (`npm run db:reset`). Deterministic: the same run gives the same rows.
// Users go through Better Auth's own API (it hashes the passwords); money goes through the app's rules
// (createEnrollmentAccount, refreshInstallmentStatus), so balances match what the screens would produce.
import { eq } from "drizzle-orm";
import { auth } from "../src/lib/auth";
import { db } from "../src/db";
import * as t from "../src/db/schema/app";
import { addDays } from "../src/lib/dates";
import { LEVELS, accountInstallments, contractValues, initialStatus, label, money, today, toDb } from "../src/lib/finance";
import { createEnrollmentAccount, refreshInstallmentStatus, syncDocuments } from "../src/lib/finance-db";
import { lessonDays } from "../src/lib/pathways";
import { nextRegistration } from "../src/lib/students";

export const SEED_PASSWORD = process.env.SEED_PASSWORD ?? "senha1234";
const USERS = [
  { username: "admin", name: "Administrador", role: "admin" },
  { username: "secretaria", name: "Secretaria Escolar", role: "user" },
];

const FIRST = ["Ana", "Bruno", "Carla", "Daniel", "Eduarda", "Felipe", "Gabriela", "Henrique", "Isabela", "João", "Larissa", "Mateus", "Natália", "Otávio", "Paula", "Rafael", "Sofia", "Tiago", "Valentina", "Lucas"];
const LAST = ["Silva", "Souza", "Oliveira", "Santos", "Pereira", "Lima", "Carvalho", "Ferreira", "Almeida", "Ribeiro", "Gomes", "Martins"];
const SUBJECTS: [string, string][] = [["Matemática", "6"], ["Português", "5"], ["Física", "4.5"], ["Química", "4.5"], ["Biologia", "5"], ["História", "2"], ["Geografia", "2.5"], ["Inglês", "1"], ["Filosofia", "1"], ["Sociologia", "1"]];
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
const half = (max: number) => (Math.round(rand() * max * 2) / 2).toFixed(2);

/** A CPF with valid check digits, distinct per `n`. */
function cpf(n: number) {
  const base = String(100000000 + n * 7919).slice(-9).split("").map(Number);
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
    name, sex, cpf: cpf(n), rg: String(3000000 + n), issuingAuthority: "SSP/DF",
    birthDate: `${birthYear}-${String(1 + (n % 12)).padStart(2, "0")}-${String(1 + (n % 28)).padStart(2, "0")}`,
    nationality: "Brasileira", placeOfBirth: "Brasília", phone: "", mobile: `619${String(80000000 + n).slice(-8)}`,
    email: `${name.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/\s+/g, ".")}@example.com`,
    address: `Quadra ${n % 30} Conjunto ${n % 9} Casa ${n}`, neighborhood: "Asa Sul", city: "Brasília", state: "DF", zipCode: "70000000",
  };
}

export async function seed() {
  const on = today();
  const year = Number(on.slice(0, 4));

  for (const u of USERS)
    await auth.api.createUser({
      body: { email: `${u.username}@example.com`, password: SEED_PASSWORD, name: u.name, role: u.role as "admin" | "user", data: { username: u.username, displayUsername: u.username } },
    });

  // --- reference data -------------------------------------------------------------
  const [program] = await db.insert(t.programsProgram).values({ name: "Ensino Médio" }).returning();
  const years = await db
    .insert(t.enrollmentsSchoolyear)
    .values([year, year + 1].map((y) => ({
      begins: `${y}-02-02`, ends: `${y}-12-11`, schoolDays: 200, totalHours: 1000,
      bi1Begins: `${y}-02-02`, bi1Ends: `${y}-04-17`, bi2Begins: `${y}-04-27`, bi2Ends: `${y}-07-03`,
      bi3Begins: `${y}-07-27`, bi3Ends: `${y}-10-02`, bi4Begins: `${y}-10-13`, bi4Ends: `${y}-12-11`,
    })))
    .returning();
  const current = years[0];
  const types = await db
    .insert(t.enrollmentsEnrollmenttype)
    .values(years.flatMap((y, i) => (["1", "2", "3"] as const).map((level) => ({
      level, programId: program.id, schoolYearId: y.id, startDate: y.begins, endDate: y.ends, punctualityDiscount: "0.00",
      totalPrice: i ? toDb(money(PRICES[level]).times("1.06")) : PRICES[level],
      description: `Contrato anual da ${label(LEVELS, level)} do Ensino Médio para ${y.begins.slice(0, 4)}.`,
    }))))
    .returning();
  await db.insert(t.enrollmentsNeededdocumenttype).values(["CERTIDÃO DE NASCIMENTO", "COMPROVANTE DE RESIDÊNCIA", "CPF DO ALUNO", "CPF DO RESPONSÁVEL", "HISTÓRICO ESCOLAR ENSINO FUNDAMENTAL"].map((description) => ({ description })));
  const discounts = await db.insert(t.enrollmentsDiscounttype).values([["ALUNO ANTIGO", "20.00"], ["IRMÃOS", "10.00"], ["FILHO DE FUNCIONÁRIO", "50.00"]].map(([description, percentage]) => ({ description, percentage }))).returning();
  await db.insert(t.gradesExamtype).values([
    { code: "PS", name: "Prova de sala", kind: "R", maxScore: "3.00", order: 1 },
    { code: "PB", name: "Prova bimestral", kind: "R", maxScore: "6.00", order: 2 },
    { code: "C", name: "Conceito", kind: "R", maxScore: "1.00", order: 3 },
    { code: "EX", name: "Nota extra", kind: "B", maxScore: "5.00", order: 4 },
    { code: "A", name: "Ajuste", kind: "C", maxScore: "10.00", order: 5 },
  ]);
  const exams = Object.fromEntries((await db.select().from(t.gradesExamtype)).map((e) => [e.code, e]));
  const incidentTypes = await db.insert(t.incidentsIncidenttype).values([["Conversa excessiva", "0.10"], ["Uso de celular em sala", "0.20"], ["Cola em avaliação", "0.50"]].map(([type, penalty]) => ({ type, penalty }))).returning();
  const [teacherRole] = await db.insert(t.employeesEmployeeroletype).values([{ role: "Professor" }, { role: "Coordenação" }, { role: "Secretaria" }]).returning();
  await db.insert(t.accountsAccounttype).values([{ name: "Mensalidade", direction: "R" }, { name: "Material didático", direction: "R" }, { name: "Energia elétrica", direction: "P" }, { name: "Manutenção", direction: "P" }]);
  const categories = Object.fromEntries((await db.select().from(t.accountsAccounttype)).map((c) => [c.name, c.id]));

  // --- teachers, departments, subjects --------------------------------------------
  const subjects: { id: number; name: string; teacherId: number; levelSubjectIds: number[] }[] = [];
  for (const [i, [name, weekly]] of SUBJECTS.entries()) {
    const teacher = person(`${FIRST[i]} ${LAST[(i + 5) % LAST.length]}`, i % 2 ? "M" : "F", 1980 + i);
    const [emp] = await db.insert(t.employeesEmployee).values({ ...teacher, roleId: teacherRole.id, canAccessSuga: false, passwordSuga: "" }).returning();
    const [dep] = await db.insert(t.departmentsDepartment).values({ name: `Cadeira de ${name}` }).returning();
    await db.insert(t.departmentsDepartmentTeachers).values({ departmentId: dep.id, employeeId: emp.id });
    const [subject] = await db.insert(t.gradesSubject).values({ name, departmentId: dep.id }).returning();
    const levelSubjects = await db.insert(t.gradesGradelevelsubject).values([1, 2, 3].map((gradeLevel) => ({ gradeLevel, subjectId: subject.id, weeklyClasses: weekly }))).returning();
    await db.insert(t.gradesGradelevelsubjectTeachers).values(levelSubjects.map((ls) => ({ gradelevelsubjectId: ls.id, employeeId: emp.id })));
    subjects.push({ id: subject.id, name, teacherId: emp.id, levelSubjectIds: levelSubjects.map((ls) => ls.id) });
  }

  // --- classes, students, guardians, enrollments (with their contract accounts) -----
  const enrollments: { id: number; level: number; classId: number }[] = [];
  let registration: string | undefined;
  for (const level of [1, 2, 3] as const) {
    const type = types.find((x) => x.schoolYearId === current.id && x.level === String(level))!;
    for (const [c, className] of CLASS_NAMES[level].entries()) {
      const [klass] = await db.insert(t.classesClass).values({ name: className, gradeLevel: level, shift: c ? "T" : "M", capacity: 40, programId: program.id, yearId: current.id }).returning();
      for (let s = 0; s < STUDENTS_PER_CLASS; s++) {
        const last = `${pick(LAST)} ${pick(LAST)}`;
        const sex = rand() < 0.5 ? "F" : "M";
        registration = nextRegistration(registration, year);
        const selfFinancial = level === 3 && s === 0; // an adult student who pays for themselves
        const [student] = await db.insert(t.studentsStudent).values({
          ...person(`${pick(FIRST)} ${last}`, sex, year - 15 - level), socialName: "", useSocialName: false, registration, photo: "",
          isSelfFinancial: selfFinancial, bloodType: pick(["A+", "O+", "B+", "AB+", "O-"]), observations: "", schoolFrom: "CEF 01 de Brasília",
        }).returning();
        if (!selfFinancial) {
          const [g] = await db.insert(t.studentsGuardian).values({ ...person(`${pick(FIRST)} ${last}`, "F", year - 42), maritalStatus: "C" }).returning();
          await db.insert(t.studentsGuardianassociation).values({ guardianId: g.id, studentId: student.id, relationship: "MAE", isFinancial: true, isPrimaryContact: true, livingWith: true, pickUp: true });
        }

        const firstPercent = s === 1 ? discounts[0].percentage : "0.00";
        const remainingPercent = s === 1 ? discounts[0].percentage : s === 2 ? discounts[1].percentage : "0.00";
        const enrolledAt = `${year}-01-${String(10 + s).padStart(2, "0")}`;
        const id = await db.transaction(async (tx) => {
          const [e] = await tx.insert(t.enrollmentsEnrollment).values({
            studentId: student.id, enrollmentTypeId: type.id, schoolClassId: klass.id, status: "A", dueDay: 10, enrolledAt,
            grossValue: type.totalPrice, firstDiscountPercent: firstPercent, remainingDiscountPercent: remainingPercent,
          }).returning();
          if (s === 1) await tx.insert(t.enrollmentsEnrollmentdiscount).values(["F", "R"].map((group) => ({ enrollmentId: e.id, group, discountTypeId: discounts[0].id, percentage: firstPercent, observation: "" })));
          if (s === 2) await tx.insert(t.enrollmentsEnrollmentdiscount).values({ enrollmentId: e.id, group: "R", discountTypeId: discounts[1].id, percentage: remainingPercent, observation: "" });
          await createEnrollmentAccount(
            tx,
            { id: e.id, studentId: student.id, enrolledAt, dueDay: 10, schoolYear: year, selfFinancial, description: `${student.name} - Ensino Médio - ${label(LEVELS, String(level))} - ${year}` },
            contractValues(type.totalPrice, firstPercent, remainingPercent),
          );
          await syncDocuments(tx, e.id);
          return e.id;
        });
        enrollments.push({ id, level, classId: klass.id });
      }
    }
  }

  // --- payments: everything due is paid, except a few debtors (overdue) and one partial payment ---
  const due = await db
    .select({ id: t.accountsInstallment.id, amount: t.accountsInstallment.amount, dueDate: t.accountsInstallment.dueDate, enrollmentId: t.accountsAccount.enrollmentId })
    .from(t.accountsInstallment)
    .innerJoin(t.accountsAccount, eq(t.accountsInstallment.accountId, t.accountsAccount.id))
    .orderBy(t.accountsInstallment.dueDate);
  const debtors = new Set(enrollments.filter((_, i) => i % 7 === 3).map((e) => e.id));
  for (const [i, inst] of due.entries()) {
    if (inst.dueDate >= on) continue;
    const debtor = debtors.has(inst.enrollmentId!) && inst.dueDate >= addDays(on, -70);
    if (debtor) continue;
    const amount = i % 23 === 0 ? money(inst.amount).div(2).toFixed(2) : inst.amount;
    await db.transaction(async (tx) => {
      await tx.insert(t.accountsPayment).values({ installmentId: inst.id, paidAt: addDays(inst.dueDate, -(i % 4)), amount, penalty: "0.00", interest: "0.00", monetaryAdjust: "0.00", discount: "0.00", method: pick(["PIX", "BOL", "CRE", "DIN"]), notes: "" });
      await refreshInstallmentStatus(tx, inst.id);
    });
  }

  // --- payables ----------------------------------------------------------------------
  const suppliers = await db.insert(t.accountsSupplier).values([
    { name: "Companhia Energética de Brasília", document: "00070698000111", phone: "6131900000", email: "", notes: "" },
    { name: "Reparos Rápidos Ltda", document: "12345678000195", phone: "61999990000", email: "contato@example.com", notes: "" },
  ]).returning();
  for (const [s, gross, count, category] of [[0, "2400.00", 6, "Energia elétrica"], [1, "1800.00", 3, "Manutenção"]] as const) {
    const [acc] = await db.insert(t.accountsAccount).values({ direction: "P", description: `${category} ${year}`, categoryId: categories[category], supplierId: suppliers[s].id, issueDate: `${year}-07-01`, grossValue: gross, discountValue: "0.00", notes: "" }).returning();
    const rows = await db.insert(t.accountsInstallment).values(accountInstallments(money(gross), count, `${year}-08-05`).map((i) => ({ accountId: acc.id, number: i.number, dueDate: i.dueDate, amount: toDb(i.amount), status: initialStatus(i.amount) }))).returning();
    for (const r of rows.filter((r) => r.dueDate < on))
      await db.transaction(async (tx) => {
        await tx.insert(t.accountsPayment).values({ installmentId: r.id, paidAt: r.dueDate, amount: r.amount, penalty: "0.00", interest: "0.00", monetaryAdjust: "0.00", discount: "0.00", method: "TED", notes: "" });
        await refreshInstallmentStatus(tx, r.id);
      });
  }

  // --- grades for the finished bimesters; incidents, delays and Q&A in the current one ---
  const bimesters = ([1, 2, 3, 4] as const).filter((b) => current[`bi${b}Ends`]! < on);
  const grades = enrollments.flatMap((e) => bimesters.flatMap((bimester) => subjects.flatMap((s) => [
    { enrollmentId: e.id, subjectId: s.id, examTypeId: exams.PS.id, bimester, score: half(3) },
    { enrollmentId: e.id, subjectId: s.id, examTypeId: exams.PB.id, bimester, score: half(6) },
  ])));
  for (let i = 0; i < grades.length; i += 500) await db.insert(t.gradesGrade).values(grades.slice(i, i + 500));
  const recent = (back: number) => addDays(on, -1 - Math.floor(rand() * back));
  await db.insert(t.incidentsIncident).values(enrollments.filter((_, i) => i % 4 === 0).map((e) => ({ enrollmentId: e.id, incidentTypeId: pick(incidentTypes).id, incidentDate: recent(20) })));
  await db.insert(t.incidentsStudentdelay).values(enrollments.filter((_, i) => i % 3 === 0).map((e) => ({ enrollmentId: e.id, delayType: pick(["A", "A", "U"]), incidentDate: recent(20) })));
  await db.insert(t.incidentsBathroompermission).values(enrollments.filter((_, i) => i % 2 === 0).map((e) => ({ enrollmentId: e.id, classPeriod: 1 + Math.floor(rand() * 6), incidentDate: recent(10) })));
  await db.insert(t.qAndAQanda).values(enrollments.filter((_, i) => i % 5 === 0).map((e) => ({ enrollmentId: e.id, subjectId: pick(subjects).id, qAndADate: recent(15) })));

  // --- timetable (Mon–Fri, periods 1–6) and the last two weeks of lectures ----------------
  const classes = [...new Set(enrollments.map((e) => e.classId))];
  const slots = classes.flatMap((schoolClassId, c) => [1, 2, 3, 4, 5].flatMap((weekday) => [1, 2, 3, 4, 5, 6].map((period) => {
    const s = subjects[(weekday * 6 + period + c) % subjects.length];
    return { schoolClassId, weekday, period, subjectId: s.id, teacherId: s.teacherId };
  })));
  await db.insert(t.lessonsTimetableslot).values(slots);
  const days = lessonDays([1, 2, 3, 4, 5], addDays(on, -14), addDays(on, -1)).filter((d) => d >= current.begins);
  const lectures = days.flatMap((date) => slots.filter((s) => s.weekday === (new Date(`${date}T00:00:00Z`).getUTCDay() || 7)).map((s) => ({ ...s, weekday: undefined, date, topic: `${subjects.find((x) => x.id === s.subjectId)!.name}: revisão` })));
  if (lectures.length) await db.insert(t.lessonsLecture).values(lectures.map(({ weekday: _, ...l }) => l));

  // --- pathways: two offerings with members, weekly sessions, attendance and bimester grades ---
  const pathways = await db.insert(t.pathwaysPathway).values([
    { name: "Robótica", description: "Montagem e programação de robôs.", extraPoints: "1.00", workloadType: "P", workloadHours: "0.00" },
    { name: "Iniciação científica", description: "Projetos de pesquisa orientados.", extraPoints: "1.50", workloadType: "F", workloadHours: "60.00" },
  ]).returning();
  for (const [p, pathway] of pathways.entries()) {
    const weekday = p ? 4 : 2;
    const [offering] = await db.insert(t.pathwaysPathwayoffering).values({ name: "Turma A", pathwayId: pathway.id, schoolYearId: current.id, capacity: 30, schedule: "17h às 18h40", weekdays: [weekday] }).returning();
    await db.insert(t.pathwaysPathwayofferingTeachers).values({ pathwayofferingId: offering.id, employeeId: subjects[p + 2].teacherId });
    const members = await db.insert(t.pathwaysPathwayenrollment).values(enrollments.filter((_, i) => i % 4 === p).map((e) => ({ enrollmentId: e.id, offeringId: offering.id, joinedAt: current.begins }))).returning();
    const sessions = await db.insert(t.pathwaysPathwaysession).values(lessonDays([weekday], current.begins, addDays(on, -1)).map((date, n) => ({ offeringId: offering.id, date, topic: `Encontro ${n + 1}` }))).returning();
    const attendance = sessions.flatMap((s) => members.map((m) => ({ sessionId: s.id, pathwayEnrollmentId: m.id, status: rand() < 0.85 ? "P" : pick(["F", "J"]) })));
    for (let i = 0; i < attendance.length; i += 500) await db.insert(t.pathwaysPathwayattendance).values(attendance.slice(i, i + 500));
    if (bimesters.length) await db.insert(t.pathwaysPathwaygrade).values(members.flatMap((m) => bimesters.map((bimester) => ({ pathwayEnrollmentId: m.id, bimester, score: half(Number(pathway.extraPoints)) }))));
  }

  console.log(`Seeded ${enrollments.length} students in ${classes.length} classes, ${subjects.length} subjects, ${grades.length} grades.`);
  console.log(`Log in as ${USERS.map((u) => u.username).join(" or ")}, password "${SEED_PASSWORD}".`);
}
