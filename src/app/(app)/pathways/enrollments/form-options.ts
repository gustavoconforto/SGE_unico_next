import { activeEnrollmentOptions } from "../../enrollments/data";
import { offeringOptions } from "../data";

/** With the offering known (prefilled or edited), only the enrollments of its school year. */
export async function memberFormOptions(offeringId: number | null, keepEnrollment?: number | null) {
  const offerings = await offeringOptions();
  const o = offerings.find((x) => x.id === offeringId);
  const enrollments = await activeEnrollmentOptions(keepEnrollment, o ? o.schoolYearId : undefined);
  return { offerings: offerings.map((x) => [x.id, x.label] as [number, string]), enrollments };
}
