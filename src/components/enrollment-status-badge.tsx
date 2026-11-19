import { Badge } from "flowbite-react";
import { ENDED_EARLY, ENROLLMENT_STATUSES, label } from "@/lib/finance";

/** Active is green, ended early (transferred, dropped, cancelled) red, completed neutral gray. */
export function EnrollmentStatusBadge({ status }: { status: string }) {
  const color = status === "A" ? "success" : ENDED_EARLY.includes(status) ? "failure" : "gray";
  return (
    <Badge color={color} className="w-fit">
      {label(ENROLLMENT_STATUSES, status)}
    </Badge>
  );
}
