import { type Column, type SQL, getTableName, sql } from "drizzle-orm";

/**
 * A column as "table"."column", always. Drizzle writes a bare "column" when the outer query reads a single
 * table, and inside a correlated subquery a bare name binds to the subquery's own table: use ref() for
 * every outer column referenced from a raw subquery or an EXISTS.
 */
export function ref(column: Column): SQL {
  return sql`${sql.identifier(getTableName(column.table))}.${sql.identifier(column.name)}`;
}
