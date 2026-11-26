// Types and pure helpers the enrollment forms need in the browser (data.ts imports the database).
export type EnrollmentTypeOption = {
  id: number;
  label: string;
  totalPrice: string;
  schoolYear: number;
  schoolYearId: number;
  programId: number;
  level: string;
};
export type ClassOption = {
  id: number;
  label: string;
  schoolYearId: number;
  programId: number;
  gradeLevel: number | null;
  name: string;
  year: number;
};

/** The classes a contract allows (EnrollmentForm.school_classes_for): same year, program and, if set, grade. */
export const classesFor = (classes: ClassOption[], type: EnrollmentTypeOption | undefined) =>
  type
    ? classes.filter(
        (c) =>
          c.schoolYearId === type.schoolYearId &&
          c.programId === type.programId &&
          (!type.level || c.gradeLevel === Number(type.level)),
      )
    : [];
