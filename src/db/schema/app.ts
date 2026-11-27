import { pgTable, uniqueIndex, index, foreignKey, unique, bigint, varchar, boolean, timestamp, date, text, check, smallint, integer, numeric, jsonb } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const studentsGuardianassociation = pgTable("students_guardianassociation", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
	relationship: varchar({ length: 3 }).notNull(),
	isFinancial: boolean("is_financial").notNull(),
	isPrimaryContact: boolean("is_primary_contact").notNull(),
	livingWith: boolean("living_with").notNull(),
	pickUp: boolean("pick_up").notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	guardianId: bigint("guardian_id", { mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	studentId: bigint("student_id", { mode: "number" }).notNull(),
}, (table) => [
	uniqueIndex("one_financial_guardian_per_student").using("btree", table.studentId.asc().nullsLast().op("int8_ops")).where(sql`is_financial`),
	index("students_guardianassociation_guardian_id_0d22255e").using("btree", table.guardianId.asc().nullsLast().op("int8_ops")),
	index("students_guardianassociation_student_id_0b827ce0").using("btree", table.studentId.asc().nullsLast().op("int8_ops")),
	foreignKey({
			columns: [table.guardianId],
			foreignColumns: [studentsGuardian.id],
			name: "students_guardianass_guardian_id_0d22255e_fk_students_"
		}),
	foreignKey({
			columns: [table.studentId],
			foreignColumns: [studentsStudent.id],
			name: "students_guardianass_student_id_0b827ce0_fk_students_"
		}),
	unique("unique_student_guardian").on(table.studentId, table.guardianId),
]);

export const studentsGuardian = pgTable("students_guardian", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).notNull().$defaultFn(() => new Date().toISOString()),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).notNull().$defaultFn(() => new Date().toISOString()).$onUpdate(() => new Date().toISOString()),
	name: varchar({ length: 200 }).notNull(),
	sex: varchar({ length: 1 }).notNull(),
	cpf: varchar({ length: 11 }).notNull(),
	rg: varchar({ length: 20 }).notNull(),
	issuingAuthority: varchar("issuing_authority", { length: 20 }).notNull(),
	birthDate: date("birth_date"),
	nationality: varchar({ length: 50 }).notNull(),
	placeOfBirth: varchar("place_of_birth", { length: 50 }).notNull(),
	phone: varchar({ length: 20 }).notNull(),
	mobile: varchar({ length: 20 }).notNull(),
	email: varchar({ length: 254 }).notNull(),
	address: varchar({ length: 200 }).notNull(),
	neighborhood: varchar({ length: 100 }).notNull(),
	city: varchar({ length: 100 }).notNull(),
	state: varchar({ length: 2 }).notNull(),
	zipCode: varchar("zip_code", { length: 8 }).notNull(),
	maritalStatus: varchar("marital_status", { length: 1 }).notNull(),
}, (table) => [
	index("students_guardian_cpf_d5daa269_like").using("btree", table.cpf.asc().nullsLast().op("varchar_pattern_ops")),
	index("students_guardian_rg_ffe6a194_like").using("btree", table.rg.asc().nullsLast().op("varchar_pattern_ops")),
	uniqueIndex("students_guardian_unique_cpf").using("btree", table.cpf.asc().nullsLast().op("text_ops")).where(sql`(NOT ((cpf)::text = ''::text))`),
	unique("students_guardian_cpf_key").on(table.cpf),
	unique("students_guardian_rg_key").on(table.rg),
]);

export const studentsStudent = pgTable("students_student", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).notNull().$defaultFn(() => new Date().toISOString()),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).notNull().$defaultFn(() => new Date().toISOString()).$onUpdate(() => new Date().toISOString()),
	name: varchar({ length: 200 }).notNull(),
	sex: varchar({ length: 1 }).notNull(),
	cpf: varchar({ length: 11 }).notNull(),
	rg: varchar({ length: 20 }).notNull(),
	issuingAuthority: varchar("issuing_authority", { length: 20 }).notNull(),
	birthDate: date("birth_date"),
	nationality: varchar({ length: 50 }).notNull(),
	placeOfBirth: varchar("place_of_birth", { length: 50 }).notNull(),
	phone: varchar({ length: 20 }).notNull(),
	mobile: varchar({ length: 20 }).notNull(),
	email: varchar({ length: 254 }).notNull(),
	address: varchar({ length: 200 }).notNull(),
	neighborhood: varchar({ length: 100 }).notNull(),
	city: varchar({ length: 100 }).notNull(),
	state: varchar({ length: 2 }).notNull(),
	zipCode: varchar("zip_code", { length: 8 }).notNull(),
	socialName: varchar("social_name", { length: 200 }).notNull(),
	useSocialName: boolean("use_social_name").notNull(),
	registration: varchar({ length: 20 }).notNull(),
	photo: varchar({ length: 100 }).notNull(),
	isSelfFinancial: boolean("is_self_financial").notNull(),
	bloodType: varchar("blood_type", { length: 3 }).notNull(),
	observations: text().notNull(),
	schoolFrom: varchar("school_from", { length: 200 }).notNull(),
}, (table) => [
	index("students_student_cpf_55107b60_like").using("btree", table.cpf.asc().nullsLast().op("varchar_pattern_ops")),
	index("students_student_registration_90efabf6_like").using("btree", table.registration.asc().nullsLast().op("varchar_pattern_ops")),
	index("students_student_rg_2c9f8c0e_like").using("btree", table.rg.asc().nullsLast().op("varchar_pattern_ops")),
	uniqueIndex("students_student_unique_cpf").using("btree", table.cpf.asc().nullsLast().op("text_ops")).where(sql`(NOT ((cpf)::text = ''::text))`),
	unique("students_student_cpf_key").on(table.cpf),
	unique("students_student_registration_key").on(table.registration),
	unique("students_student_rg_key").on(table.rg),
]);

export const programsProgram = pgTable("programs_program", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
	name: varchar({ length: 50 }).notNull(),
}, (table) => [
	index("programs_program_name_8c0cbee8_like").using("btree", table.name.asc().nullsLast().op("varchar_pattern_ops")),
	unique("programs_program_name_key").on(table.name),
]);

export const classesClass = pgTable("classes_class", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
	gradeLevel: smallint("grade_level"),
	name: varchar({ length: 30 }).notNull(),
	shift: varchar({ length: 1 }).notNull(),
	capacity: smallint(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	programId: bigint("program_id", { mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	yearId: bigint("year_id", { mode: "number" }).notNull(),
}, (table) => [
	index("classes_class_program_id_a3c6b69e").using("btree", table.programId.asc().nullsLast().op("int8_ops")),
	index("classes_class_year_id_dd7af773").using("btree", table.yearId.asc().nullsLast().op("int8_ops")),
	foreignKey({
			columns: [table.programId],
			foreignColumns: [programsProgram.id],
			name: "classes_class_program_id_a3c6b69e_fk_programs_program_id"
		}),
	foreignKey({
			columns: [table.yearId],
			foreignColumns: [enrollmentsSchoolyear.id],
			name: "classes_class_year_id_dd7af773_fk_enrollments_schoolyear_id"
		}),
	unique("unique_class_per_year_program").on(table.yearId, table.programId, table.name),
	check("classes_class_capacity_check", sql`capacity >= 0`),
	check("classes_class_grade_level_check", sql`grade_level >= 0`),
]);

export const enrollmentsSchoolyear = pgTable("enrollments_schoolyear", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
	begins: date().notNull(),
	ends: date().notNull(),
	bi1Begins: date("bi_1_begins"),
	bi1Ends: date("bi_1_ends"),
	bi2Begins: date("bi_2_begins"),
	bi2Ends: date("bi_2_ends"),
	bi3Begins: date("bi_3_begins"),
	bi3Ends: date("bi_3_ends"),
	bi4Begins: date("bi_4_begins"),
	bi4Ends: date("bi_4_ends"),
	schoolDays: smallint("school_days"),
	totalHours: integer("total_hours"),
}, (table) => [
	check("enrollments_schoolyear_school_days_check", sql`school_days >= 0`),
	check("enrollments_schoolyear_total_hours_check", sql`total_hours >= 0`),
	check("school_year_school_days_positive", sql`(school_days IS NULL) OR (school_days >= 1)`),
	check("school_year_total_hours_positive", sql`(total_hours IS NULL) OR (total_hours >= 1)`),
]);

// Not in Django: one school year's day on the calendar (src/app/(app)/calendar/); a day without a row uses the default (calendar.ts).
export const enrollmentsCalendarday = pgTable("enrollments_calendarday", {
	id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).notNull().$defaultFn(() => new Date().toISOString()),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).notNull().$defaultFn(() => new Date().toISOString()).$onUpdate(() => new Date().toISOString()),
	schoolYearId: bigint("school_year_id", { mode: "number" }).notNull(),
	day: date().notNull(),
	isSchoolDay: boolean("is_school_day").notNull(),
	note: text().notNull().default(""),
}, (table) => [
	foreignKey({
			columns: [table.schoolYearId],
			foreignColumns: [enrollmentsSchoolyear.id],
			name: "enrollments_calendarday_school_year_id_fk_enrollments_schoolyear_id"
		}).onDelete("cascade"),
	unique("unique_calendar_day").on(table.schoolYearId, table.day),
]);

export const enrollmentsEnrollmenttype = pgTable("enrollments_enrollmenttype", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
	level: varchar({ length: 1 }).notNull(),
	startDate: date("start_date").notNull(),
	endDate: date("end_date").notNull(),
	totalPrice: numeric("total_price", { precision: 10, scale:  2 }).notNull(),
	punctualityDiscount: numeric("punctuality_discount", { precision: 10, scale:  2 }).notNull(),
	description: text().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	programId: bigint("program_id", { mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	schoolYearId: bigint("school_year_id", { mode: "number" }).notNull(),
}, (table) => [
	index("enrollments_enrollmenttype_program_id_812ba543").using("btree", table.programId.asc().nullsLast().op("int8_ops")),
	index("enrollments_enrollmenttype_school_year_id_76a55f47").using("btree", table.schoolYearId.asc().nullsLast().op("int8_ops")),
	foreignKey({
			columns: [table.programId],
			foreignColumns: [programsProgram.id],
			name: "enrollments_enrollme_program_id_812ba543_fk_programs_"
		}),
	foreignKey({
			columns: [table.schoolYearId],
			foreignColumns: [enrollmentsSchoolyear.id],
			name: "enrollments_enrollme_school_year_id_76a55f47_fk_enrollmen"
		}),
]);

export const enrollmentsEnrollment = pgTable("enrollments_enrollment", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).notNull().$defaultFn(() => new Date().toISOString()),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).notNull().$defaultFn(() => new Date().toISOString()).$onUpdate(() => new Date().toISOString()),
	status: varchar({ length: 1 }).notNull(),
	enrolledAt: date("enrolled_at").notNull(),
	grossValue: numeric("gross_value", { precision: 10, scale:  2 }),
	firstDiscountPercent: numeric("first_discount_percent", { precision: 5, scale:  2 }),
	remainingDiscountPercent: numeric("remaining_discount_percent", { precision: 5, scale:  2 }),
	dueDay: smallint("due_day").notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	schoolClassId: bigint("school_class_id", { mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	studentId: bigint("student_id", { mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	enrollmentTypeId: bigint("enrollment_type_id", { mode: "number" }).notNull(),
}, (table) => [
	index("enrollments_enrollment_enrollment_type_id_9f8ccad8").using("btree", table.enrollmentTypeId.asc().nullsLast().op("int8_ops")),
	index("enrollments_enrollment_school_class_id_f14344be").using("btree", table.schoolClassId.asc().nullsLast().op("int8_ops")),
	index("enrollments_enrollment_student_id_92696b89").using("btree", table.studentId.asc().nullsLast().op("int8_ops")),
	foreignKey({
			columns: [table.enrollmentTypeId],
			foreignColumns: [enrollmentsEnrollmenttype.id],
			name: "enrollments_enrollme_enrollment_type_id_9f8ccad8_fk_enrollmen"
		}),
	foreignKey({
			columns: [table.schoolClassId],
			foreignColumns: [classesClass.id],
			name: "enrollments_enrollme_school_class_id_f14344be_fk_classes_c"
		}),
	foreignKey({
			columns: [table.studentId],
			foreignColumns: [studentsStudent.id],
			name: "enrollments_enrollme_student_id_92696b89_fk_students_"
		}),
	unique("enrollments_enrollment_student_id_enrollment_ty_01562786_uniq").on(table.studentId, table.enrollmentTypeId),
	check("enrollments_enrollment_due_day_check", sql`due_day >= 0`),
]);

export const enrollmentsEnrollmentneededdocument = pgTable("enrollments_enrollmentneededdocument", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).notNull().$defaultFn(() => new Date().toISOString()),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).notNull().$defaultFn(() => new Date().toISOString()).$onUpdate(() => new Date().toISOString()),
	isDelivered: boolean("is_delivered").notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	enrollmentId: bigint("enrollment_id", { mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	typeId: bigint("type_id", { mode: "number" }).notNull(),
}, (table) => [
	index("enrollments_enrollmentneededdocument_enrollment_id_655c223a").using("btree", table.enrollmentId.asc().nullsLast().op("int8_ops")),
	index("enrollments_enrollmentneededdocument_type_id_3bdb0b5b").using("btree", table.typeId.asc().nullsLast().op("int8_ops")),
	// Two page loads syncing the checklist at once must not add the same document twice
	unique("unique_document_per_enrollment").on(table.enrollmentId, table.typeId),
	foreignKey({
			columns: [table.enrollmentId],
			foreignColumns: [enrollmentsEnrollment.id],
			name: "enrollments_enrollme_enrollment_id_655c223a_fk_enrollmen"
		}),
	foreignKey({
			columns: [table.typeId],
			foreignColumns: [enrollmentsNeededdocumenttype.id],
			name: "enrollments_enrollme_type_id_3bdb0b5b_fk_enrollmen"
		}),
]);

export const enrollmentsNeededdocumenttype = pgTable("enrollments_neededdocumenttype", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
	description: varchar({ length: 50 }).notNull(),
});

export const enrollmentsDiscounttype = pgTable("enrollments_discounttype", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
	description: varchar({ length: 200 }).notNull(),
	percentage: numeric({ precision: 5, scale:  2 }).notNull(),
});

export const enrollmentsEnrollmentdiscount = pgTable("enrollments_enrollmentdiscount", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).notNull().$defaultFn(() => new Date().toISOString()),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).notNull().$defaultFn(() => new Date().toISOString()).$onUpdate(() => new Date().toISOString()),
	group: varchar({ length: 1 }).notNull(),
	percentage: numeric({ precision: 5, scale:  2 }).notNull(),
	observation: varchar({ length: 200 }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	discountTypeId: bigint("discount_type_id", { mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	enrollmentId: bigint("enrollment_id", { mode: "number" }).notNull(),
}, (table) => [
	index("enrollments_enrollmentdiscount_discount_type_id_fe6e5123").using("btree", table.discountTypeId.asc().nullsLast().op("int8_ops")),
	index("enrollments_enrollmentdiscount_enrollment_id_79b8a023").using("btree", table.enrollmentId.asc().nullsLast().op("int8_ops")),
	foreignKey({
			columns: [table.discountTypeId],
			foreignColumns: [enrollmentsDiscounttype.id],
			name: "enrollments_enrollme_discount_type_id_fe6e5123_fk_enrollmen"
		}),
	foreignKey({
			columns: [table.enrollmentId],
			foreignColumns: [enrollmentsEnrollment.id],
			name: "enrollments_enrollme_enrollment_id_79b8a023_fk_enrollmen"
		}),
	unique("unique_enrollment_discount_type").on(table.enrollmentId, table.group, table.discountTypeId),
	check("custom_enrollment_discount_has_observation", sql`(discount_type_id IS NOT NULL) OR (NOT ((observation)::text = ''::text))`),
	check("enrollment_discount_group_valid", sql`("group")::text = ANY ((ARRAY['F'::character varying, 'R'::character varying])::text[])`),
	check("enrollment_discount_percentage_range", sql`(percentage >= (0)::numeric) AND (percentage <= (100)::numeric)`),
]);

export const accountsAccounttype = pgTable("accounts_accounttype", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
	name: varchar({ length: 100 }).notNull(),
	direction: varchar({ length: 1 }).notNull(),
}, (table) => [
	index("accounts_accounttype_name_ce137a74_like").using("btree", table.name.asc().nullsLast().op("varchar_pattern_ops")),
	unique("accounts_accounttype_name_key").on(table.name),
]);

export const accountsSupplier = pgTable("accounts_supplier", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).notNull().$defaultFn(() => new Date().toISOString()),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).notNull().$defaultFn(() => new Date().toISOString()).$onUpdate(() => new Date().toISOString()),
	name: varchar({ length: 200 }).notNull(),
	document: varchar({ length: 14 }).notNull(),
	phone: varchar({ length: 20 }).notNull(),
	email: varchar({ length: 254 }).notNull(),
	notes: text().notNull(),
}, (table) => [
	uniqueIndex("unique_supplier_document").using("btree", table.document.asc().nullsLast().op("text_ops")).where(sql`(NOT ((document)::text = ''::text))`),
]);

export const accountsInstallment = pgTable("accounts_installment", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
	number: smallint().notNull(),
	dueDate: date("due_date").notNull(),
	amount: numeric({ precision: 10, scale:  2 }).notNull(),
	status: varchar({ length: 1 }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	accountId: bigint("account_id", { mode: "number" }).notNull(),
}, (table) => [
	index("accounts_installment_account_id_787fd9a3").using("btree", table.accountId.asc().nullsLast().op("int8_ops")),
	foreignKey({
			columns: [table.accountId],
			foreignColumns: [accountsAccount.id],
			name: "accounts_installment_account_id_787fd9a3_fk_accounts_account_id"
		}),
	unique("unique_installment_number_per_account").on(table.accountId, table.number),
	check("accounts_installment_number_check", sql`number >= 0`),
	check("installment_amount_not_negative", sql`amount >= (0)::numeric`),
]);

export const accountsPayment = pgTable("accounts_payment", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).notNull().$defaultFn(() => new Date().toISOString()),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).notNull().$defaultFn(() => new Date().toISOString()).$onUpdate(() => new Date().toISOString()),
	paidAt: date("paid_at").notNull(),
	amount: numeric({ precision: 10, scale:  2 }).notNull(),
	penalty: numeric({ precision: 10, scale:  2 }).notNull(),
	interest: numeric({ precision: 10, scale:  2 }).notNull(),
	monetaryAdjust: numeric("monetary_adjust", { precision: 10, scale:  2 }).notNull(),
	discount: numeric({ precision: 10, scale:  2 }).notNull(),
	method: varchar({ length: 3 }).notNull(),
	notes: varchar({ length: 200 }).notNull(),
	// Cheque details (not in Django): filled only when method is CHQ, blank otherwise
	checkNumber: varchar("check_number", { length: 20 }).notNull().default(""),
	checkBank: varchar("check_bank", { length: 3 }).notNull().default(""),
	checkBranch: varchar("check_branch", { length: 10 }).notNull().default(""),
	checkAccount: varchar("check_account", { length: 20 }).notNull().default(""),
	checkDate: date("check_date"),
	checkHolderName: varchar("check_holder_name", { length: 200 }).notNull().default(""),
	checkHolderCpf: varchar("check_holder_cpf", { length: 11 }).notNull().default(""),
	// Card details (not in Django): filled only when method is CRE or DEB, blank otherwise; debit is always 1x
	cardBrand: varchar("card_brand", { length: 3 }).notNull().default(""),
	cardReceipt: varchar("card_receipt", { length: 20 }).notNull().default(""),
	cardInstallments: smallint("card_installments"),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	installmentId: bigint("installment_id", { mode: "number" }).notNull(),
}, (table) => [
	index("accounts_payment_installment_id_65aef88f").using("btree", table.installmentId.asc().nullsLast().op("int8_ops")),
	foreignKey({
			columns: [table.installmentId],
			foreignColumns: [accountsInstallment.id],
			name: "accounts_payment_installment_id_65aef88f_fk_accounts_"
		}),
	check("payment_amount_positive", sql`amount > (0)::numeric`),
	check("payment_charges_not_negative", sql`(interest >= (0)::numeric) AND (monetary_adjust >= (0)::numeric) AND (penalty >= (0)::numeric)`),
	check("payment_discount_not_negative", sql`discount >= (0)::numeric`),
]);

export const accountsAccount = pgTable("accounts_account", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).notNull().$defaultFn(() => new Date().toISOString()),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).notNull().$defaultFn(() => new Date().toISOString()).$onUpdate(() => new Date().toISOString()),
	direction: varchar({ length: 1 }).notNull(),
	description: varchar({ length: 200 }).notNull(),
	issueDate: date("issue_date").notNull(),
	grossValue: numeric("gross_value", { precision: 10, scale:  2 }).notNull(),
	discountValue: numeric("discount_value", { precision: 10, scale:  2 }).notNull(),
	notes: text().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	enrollmentId: bigint("enrollment_id", { mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	guardianId: bigint("guardian_id", { mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	studentId: bigint("student_id", { mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	categoryId: bigint("category_id", { mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	supplierId: bigint("supplier_id", { mode: "number" }),
}, (table) => [
	index("accounts_account_category_id_e512e750").using("btree", table.categoryId.asc().nullsLast().op("int8_ops")),
	index("accounts_account_guardian_id_5d5cf56d").using("btree", table.guardianId.asc().nullsLast().op("int8_ops")),
	index("accounts_account_student_id_0e0701b9").using("btree", table.studentId.asc().nullsLast().op("int8_ops")),
	index("accounts_account_supplier_id_e8c10e29").using("btree", table.supplierId.asc().nullsLast().op("int8_ops")),
	foreignKey({
			columns: [table.categoryId],
			foreignColumns: [accountsAccounttype.id],
			name: "accounts_account_category_id_e512e750_fk_accounts_"
		}),
	foreignKey({
			columns: [table.enrollmentId],
			foreignColumns: [enrollmentsEnrollment.id],
			name: "accounts_account_enrollment_id_4bd56edb_fk_enrollmen"
		}),
	foreignKey({
			columns: [table.guardianId],
			foreignColumns: [studentsGuardian.id],
			name: "accounts_account_guardian_id_5d5cf56d_fk_students_guardian_id"
		}),
	foreignKey({
			columns: [table.studentId],
			foreignColumns: [studentsStudent.id],
			name: "accounts_account_student_id_0e0701b9_fk_students_student_id"
		}),
	foreignKey({
			columns: [table.supplierId],
			foreignColumns: [accountsSupplier.id],
			name: "accounts_account_supplier_id_e8c10e29_fk_accounts_supplier_id"
		}),
	unique("accounts_account_enrollment_id_key").on(table.enrollmentId),
	check("account_counterpart_matches_direction", sql`(((direction)::text = 'R'::text) AND (supplier_id IS NULL)) OR (((direction)::text = 'P'::text) AND (enrollment_id IS NULL) AND (guardian_id IS NULL) AND (student_id IS NULL))`),
	check("account_discount_within_gross_value", sql`(discount_value >= (0)::numeric) AND (discount_value <= gross_value)`),
	check("account_gross_value_not_negative", sql`gross_value >= (0)::numeric`),
]);

export const billingBanksettings = pgTable("billing_banksettings", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).notNull().$defaultFn(() => new Date().toISOString()),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).notNull().$defaultFn(() => new Date().toISOString()).$onUpdate(() => new Date().toISOString()),
	companyCode: varchar("company_code", { length: 20 }).notNull(),
	companyName: varchar("company_name", { length: 100 }).notNull(),
	carteira: varchar({ length: 3 }).notNull(),
	agency: varchar({ length: 5 }).notNull(),
	account: varchar({ length: 7 }).notNull(),
	accountDigit: varchar("account_digit", { length: 1 }).notNull(),
	finePercent: numeric("fine_percent", { precision: 4, scale:  2 }).notNull(),
	monthlyInterestPercent: numeric("monthly_interest_percent", { precision: 4, scale:  2 }).notNull(),
	lastRemittanceNumber: integer("last_remittance_number").notNull(),
}, (table) => [
	check("bank_settings_rates_not_negative", sql`(fine_percent >= (0)::numeric) AND (monthly_interest_percent >= (0)::numeric)`),
	check("billing_banksettings_last_remittance_number_check", sql`last_remittance_number >= 0`),
]);

export const billingBankslip = pgTable("billing_bankslip", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).notNull().$defaultFn(() => new Date().toISOString()),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).notNull().$defaultFn(() => new Date().toISOString()).$onUpdate(() => new Date().toISOString()),
	nossoNumero: varchar("nosso_numero", { length: 11 }).notNull(),
	nossoNumeroDv: varchar("nosso_numero_dv", { length: 1 }).notNull(),
	dueDate: date("due_date").notNull(),
	amount: numeric({ precision: 10, scale:  2 }).notNull(),
	discount: numeric({ precision: 10, scale:  2 }).notNull(),
	status: varchar({ length: 1 }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	installmentId: bigint("installment_id", { mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	remittanceId: bigint("remittance_id", { mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	writeOffRemittanceId: bigint("write_off_remittance_id", { mode: "number" }),
}, (table) => [
	index("billing_bankslip_installment_id_40c14632").using("btree", table.installmentId.asc().nullsLast().op("int8_ops")),
	index("billing_bankslip_nosso_numero_6f466529_like").using("btree", table.nossoNumero.asc().nullsLast().op("varchar_pattern_ops")),
	index("billing_bankslip_remittance_id_00a8e1a3").using("btree", table.remittanceId.asc().nullsLast().op("int8_ops")),
	index("billing_bankslip_write_off_remittance_id_aa93f9a8").using("btree", table.writeOffRemittanceId.asc().nullsLast().op("int8_ops")),
	uniqueIndex("unique_live_slip_per_installment").using("btree", table.installmentId.asc().nullsLast().op("int8_ops")).where(sql`((status)::text = ANY ((ARRAY['G'::character varying, 'R'::character varying, 'S'::character varying])::text[]))`),
	foreignKey({
			columns: [table.installmentId],
			foreignColumns: [accountsInstallment.id],
			name: "billing_bankslip_installment_id_40c14632_fk_accounts_"
		}),
	foreignKey({
			columns: [table.remittanceId],
			foreignColumns: [billingRemittance.id],
			name: "billing_bankslip_remittance_id_00a8e1a3_fk_billing_r"
		}),
	foreignKey({
			columns: [table.writeOffRemittanceId],
			foreignColumns: [billingRemittance.id],
			name: "billing_bankslip_write_off_remittance_aa93f9a8_fk_billing_r"
		}),
	unique("billing_bankslip_nosso_numero_key").on(table.nossoNumero),
	check("bank_slip_amount_positive", sql`amount > (0)::numeric`),
	check("bank_slip_discount_below_amount", sql`(discount >= (0)::numeric) AND (discount < amount)`),
]);

export const billingReturnevent = pgTable("billing_returnevent", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
	sequence: integer().notNull(),
	fingerprint: varchar({ length: 64 }).notNull(),
	nossoNumero: varchar("nosso_numero", { length: 20 }).notNull(),
	occurrenceCode: varchar("occurrence_code", { length: 2 }).notNull(),
	occurrenceDate: date("occurrence_date"),
	dueDate: date("due_date"),
	titleAmount: numeric("title_amount", { precision: 10, scale:  2 }).notNull(),
	amountPaid: numeric("amount_paid", { precision: 10, scale:  2 }).notNull(),
	interest: numeric({ precision: 10, scale:  2 }).notNull(),
	discount: numeric({ precision: 10, scale:  2 }).notNull(),
	creditDate: date("credit_date"),
	reasonCodes: varchar("reason_codes", { length: 20 }).notNull(),
	status: varchar({ length: 1 }).notNull(),
	message: varchar({ length: 300 }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	bankSlipId: bigint("bank_slip_id", { mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	paymentId: bigint("payment_id", { mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	returnFileId: bigint("return_file_id", { mode: "number" }).notNull(),
}, (table) => [
	index("billing_returnevent_bank_slip_id_a2b29501").using("btree", table.bankSlipId.asc().nullsLast().op("int8_ops")),
	index("billing_returnevent_fingerprint_1581e508_like").using("btree", table.fingerprint.asc().nullsLast().op("varchar_pattern_ops")),
	index("billing_returnevent_return_file_id_b1d23b44").using("btree", table.returnFileId.asc().nullsLast().op("int8_ops")),
	foreignKey({
			columns: [table.bankSlipId],
			foreignColumns: [billingBankslip.id],
			name: "billing_returnevent_bank_slip_id_a2b29501_fk_billing_b"
		}),
	foreignKey({
			columns: [table.paymentId],
			foreignColumns: [accountsPayment.id],
			name: "billing_returnevent_payment_id_55825c59_fk_accounts_payment_id"
		}),
	foreignKey({
			columns: [table.returnFileId],
			foreignColumns: [billingReturnfile.id],
			name: "billing_returnevent_return_file_id_b1d23b44_fk_billing_r"
		}),
	unique("billing_returnevent_fingerprint_key").on(table.fingerprint),
	unique("billing_returnevent_payment_id_key").on(table.paymentId),
	check("billing_returnevent_sequence_check", sql`sequence >= 0`),
]);

export const billingReturnfile = pgTable("billing_returnfile", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).notNull().$defaultFn(() => new Date().toISOString()),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).notNull().$defaultFn(() => new Date().toISOString()).$onUpdate(() => new Date().toISOString()),
	name: varchar({ length: 255 }).notNull(),
	sha256: varchar({ length: 64 }).notNull(),
	fileDate: date("file_date"),
	content: text().notNull(),
}, (table) => [
	index("billing_returnfile_sha256_a4b1aee0_like").using("btree", table.sha256.asc().nullsLast().op("varchar_pattern_ops")),
	unique("billing_returnfile_sha256_key").on(table.sha256),
]);

export const billingRemittance = pgTable("billing_remittance", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).notNull().$defaultFn(() => new Date().toISOString()),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).notNull().$defaultFn(() => new Date().toISOString()).$onUpdate(() => new Date().toISOString()),
	number: integer().notNull(),
	generatedAt: date("generated_at").notNull(),
	content: text().notNull(),
	downloadedAt: timestamp("downloaded_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	unique("billing_remittance_number_key").on(table.number),
	check("billing_remittance_number_check", sql`number >= 0`),
]);

export const employeesEmployeeroletype = pgTable("employees_employeeroletype", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
	role: varchar({ length: 20 }).notNull(),
});

export const employeesEmployee = pgTable("employees_employee", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).notNull().$defaultFn(() => new Date().toISOString()),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).notNull().$defaultFn(() => new Date().toISOString()).$onUpdate(() => new Date().toISOString()),
	name: varchar({ length: 200 }).notNull(),
	sex: varchar({ length: 1 }).notNull(),
	cpf: varchar({ length: 11 }).notNull(),
	rg: varchar({ length: 20 }).notNull(),
	issuingAuthority: varchar("issuing_authority", { length: 20 }).notNull(),
	birthDate: date("birth_date"),
	nationality: varchar({ length: 50 }).notNull(),
	placeOfBirth: varchar("place_of_birth", { length: 50 }).notNull(),
	phone: varchar({ length: 20 }).notNull(),
	mobile: varchar({ length: 20 }).notNull(),
	email: varchar({ length: 254 }).notNull(),
	address: varchar({ length: 200 }).notNull(),
	neighborhood: varchar({ length: 100 }).notNull(),
	city: varchar({ length: 100 }).notNull(),
	state: varchar({ length: 2 }).notNull(),
	zipCode: varchar("zip_code", { length: 8 }).notNull(),
	canAccessSuga: boolean("can_access_suga").notNull(),
	passwordSuga: varchar("password_suga", { length: 128 }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	roleId: bigint("role_id", { mode: "number" }).notNull(),
}, (table) => [
	index("employees_employee_cpf_40bbec1a_like").using("btree", table.cpf.asc().nullsLast().op("varchar_pattern_ops")),
	index("employees_employee_rg_b649d0df_like").using("btree", table.rg.asc().nullsLast().op("varchar_pattern_ops")),
	index("employees_employee_role_id_921230d3").using("btree", table.roleId.asc().nullsLast().op("int8_ops")),
	uniqueIndex("employees_employee_unique_cpf").using("btree", table.cpf.asc().nullsLast().op("text_ops")).where(sql`(NOT ((cpf)::text = ''::text))`),
	foreignKey({
			columns: [table.roleId],
			foreignColumns: [employeesEmployeeroletype.id],
			name: "employees_employee_role_id_921230d3_fk_employees"
		}),
	unique("employees_employee_cpf_key").on(table.cpf),
	unique("employees_employee_rg_key").on(table.rg),
]);

export const departmentsDepartment = pgTable("departments_department", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
	name: varchar({ length: 50 }).notNull(),
}, (table) => [
	index("departments_department_name_f57acac7_like").using("btree", table.name.asc().nullsLast().op("varchar_pattern_ops")),
	unique("departments_department_name_key").on(table.name),
]);

export const departmentsDepartmentTeachers = pgTable("departments_department_teachers", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	departmentId: bigint("department_id", { mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	employeeId: bigint("employee_id", { mode: "number" }).notNull(),
}, (table) => [
	index("departments_department_teachers_department_id_47a55db8").using("btree", table.departmentId.asc().nullsLast().op("int8_ops")),
	index("departments_department_teachers_employee_id_298151e5").using("btree", table.employeeId.asc().nullsLast().op("int8_ops")),
	foreignKey({
			columns: [table.departmentId],
			foreignColumns: [departmentsDepartment.id],
			name: "departments_departme_department_id_47a55db8_fk_departmen"
		}),
	foreignKey({
			columns: [table.employeeId],
			foreignColumns: [employeesEmployee.id],
			name: "departments_departme_employee_id_298151e5_fk_employees"
		}),
	unique("departments_department_t_department_id_employee_i_2f4fce44_uniq").on(table.departmentId, table.employeeId),
]);

export const gradesSubject = pgTable("grades_subject", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
	name: varchar({ length: 50 }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	departmentId: bigint("department_id", { mode: "number" }),
}, (table) => [
	index("grades_subject_department_id_1c34fc18").using("btree", table.departmentId.asc().nullsLast().op("int8_ops")),
	index("grades_subject_name_fe159e0a_like").using("btree", table.name.asc().nullsLast().op("varchar_pattern_ops")),
	foreignKey({
			columns: [table.departmentId],
			foreignColumns: [departmentsDepartment.id],
			name: "grades_subject_department_id_1c34fc18_fk_departmen"
		}),
	unique("grades_subject_name_key").on(table.name),
]);

export const gradesGradelevelsubject = pgTable("grades_gradelevelsubject", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
	gradeLevel: smallint("grade_level").notNull(),
	weeklyClasses: numeric("weekly_classes", { precision: 4, scale:  2 }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	subjectId: bigint("subject_id", { mode: "number" }).notNull(),
}, (table) => [
	index("grades_gradelevelsubject_subject_id_3c4e99ed").using("btree", table.subjectId.asc().nullsLast().op("int8_ops")),
	foreignKey({
			columns: [table.subjectId],
			foreignColumns: [gradesSubject.id],
			name: "grades_gradelevelsub_subject_id_3c4e99ed_fk_grades_su"
		}),
	unique("unique_subject_per_grade_level").on(table.gradeLevel, table.subjectId),
	check("grade_level_subject_level_range", sql`(grade_level >= 1) AND (grade_level <= 3)`),
	check("grade_level_subject_weekly_classes_not_negative", sql`weekly_classes >= (0)::numeric`),
	check("grades_gradelevelsubject_grade_level_check", sql`grade_level >= 0`),
]);

export const gradesGradelevelsubjectTeachers = pgTable("grades_gradelevelsubject_teachers", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	gradelevelsubjectId: bigint("gradelevelsubject_id", { mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	employeeId: bigint("employee_id", { mode: "number" }).notNull(),
}, (table) => [
	index("grades_gradelevelsubject_teachers_employee_id_23f427f0").using("btree", table.employeeId.asc().nullsLast().op("int8_ops")),
	index("grades_gradelevelsubject_teachers_gradelevelsubject_id_f74c19c1").using("btree", table.gradelevelsubjectId.asc().nullsLast().op("int8_ops")),
	foreignKey({
			columns: [table.employeeId],
			foreignColumns: [employeesEmployee.id],
			name: "grades_gradelevelsub_employee_id_23f427f0_fk_employees"
		}),
	foreignKey({
			columns: [table.gradelevelsubjectId],
			foreignColumns: [gradesGradelevelsubject.id],
			name: "grades_gradelevelsub_gradelevelsubject_id_f74c19c1_fk_grades_gr"
		}),
	unique("grades_gradelevelsubject_gradelevelsubject_id_emp_162f360b_uniq").on(table.gradelevelsubjectId, table.employeeId),
]);

export const gradesGrade = pgTable("grades_grade", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).notNull().$defaultFn(() => new Date().toISOString()),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).notNull().$defaultFn(() => new Date().toISOString()).$onUpdate(() => new Date().toISOString()),
	bimester: smallint().notNull(),
	score: numeric({ precision: 4, scale:  2 }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	enrollmentId: bigint("enrollment_id", { mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	examTypeId: bigint("exam_type_id", { mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	subjectId: bigint("subject_id", { mode: "number" }).notNull(),
}, (table) => [
	index("grades_grade_enrollment_id_c07d4174").using("btree", table.enrollmentId.asc().nullsLast().op("int8_ops")),
	index("grades_grade_exam_type_id_90408ce5").using("btree", table.examTypeId.asc().nullsLast().op("int8_ops")),
	index("grades_grade_subject_id_8f827a0e").using("btree", table.subjectId.asc().nullsLast().op("int8_ops")),
	foreignKey({
			columns: [table.enrollmentId],
			foreignColumns: [enrollmentsEnrollment.id],
			name: "grades_grade_enrollment_id_c07d4174_fk_enrollmen"
		}),
	foreignKey({
			columns: [table.examTypeId],
			foreignColumns: [gradesExamtype.id],
			name: "grades_grade_exam_type_id_90408ce5_fk_grades_examtype_id"
		}),
	foreignKey({
			columns: [table.subjectId],
			foreignColumns: [gradesSubject.id],
			name: "grades_grade_subject_id_8f827a0e_fk_grades_subject_id"
		}),
	unique("unique_grade_per_exam").on(table.enrollmentId, table.subjectId, table.examTypeId, table.bimester),
	check("grade_bimester_range", sql`(bimester >= 1) AND (bimester <= 5)`),
	check("grade_score_not_negative", sql`score >= (0)::numeric`),
	check("grades_grade_bimester_check", sql`bimester >= 0`),
]);

export const gradesExamtype = pgTable("grades_examtype", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
	name: varchar({ length: 50 }).notNull(),
	code: varchar({ length: 5 }).notNull(),
	kind: varchar({ length: 1 }).notNull(),
	maxScore: numeric("max_score", { precision: 4, scale:  2 }).notNull(),
	order: smallint().notNull(),
}, (table) => [
	index("grades_examtype_code_dabae028_like").using("btree", table.code.asc().nullsLast().op("varchar_pattern_ops")),
	index("grades_examtype_name_779ce2be_like").using("btree", table.name.asc().nullsLast().op("varchar_pattern_ops")),
	unique("grades_examtype_code_key").on(table.code),
	unique("grades_examtype_name_key").on(table.name),
	check("exam_type_max_score_positive", sql`max_score > (0)::numeric`),
	check("grades_examtype_order_check", sql`"order" >= 0`),
]);

// Not in Django: a row closes a subject's bimester (5 = final recovery) to teachers; staff can still edit (grade-lock.ts).
export const gradesGradelock = pgTable("grades_gradelock", {
	id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).notNull().$defaultFn(() => new Date().toISOString()),
	subjectId: bigint("subject_id", { mode: "number" }).notNull(),
	bimester: smallint().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.subjectId],
			foreignColumns: [gradesSubject.id],
			name: "grades_gradelock_subject_id_fk_grades_subject_id"
		}).onDelete("cascade"),
	unique("unique_grade_lock").on(table.subjectId, table.bimester),
	check("grade_lock_bimester_range", sql`(bimester >= 1) AND (bimester <= 5)`),
]);

export const incidentsBathroompermission = pgTable("incidents_bathroompermission", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).notNull().$defaultFn(() => new Date().toISOString()),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).notNull().$defaultFn(() => new Date().toISOString()).$onUpdate(() => new Date().toISOString()),
	classPeriod: smallint("class_period").notNull(),
	incidentDate: date("incident_date").notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	enrollmentId: bigint("enrollment_id", { mode: "number" }).notNull(),
}, (table) => [
	index("incidents_bathroompermission_enrollment_id_f71bc49d").using("btree", table.enrollmentId.asc().nullsLast().op("int8_ops")),
	foreignKey({
			columns: [table.enrollmentId],
			foreignColumns: [enrollmentsEnrollment.id],
			name: "incidents_bathroompe_enrollment_id_f71bc49d_fk_enrollmen"
		}),
]);

export const incidentsIncident = pgTable("incidents_incident", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).notNull().$defaultFn(() => new Date().toISOString()),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).notNull().$defaultFn(() => new Date().toISOString()).$onUpdate(() => new Date().toISOString()),
	incidentDate: date("incident_date").notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	enrollmentId: bigint("enrollment_id", { mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	incidentTypeId: bigint("incident_type_id", { mode: "number" }).notNull(),
}, (table) => [
	index("incidents_incident_enrollment_id_0a261b3c").using("btree", table.enrollmentId.asc().nullsLast().op("int8_ops")),
	index("incidents_incident_incident_type_id_6cfb12e6").using("btree", table.incidentTypeId.asc().nullsLast().op("int8_ops")),
	foreignKey({
			columns: [table.enrollmentId],
			foreignColumns: [enrollmentsEnrollment.id],
			name: "incidents_incident_enrollment_id_0a261b3c_fk_enrollmen"
		}),
	foreignKey({
			columns: [table.incidentTypeId],
			foreignColumns: [incidentsIncidenttype.id],
			name: "incidents_incident_incident_type_id_6cfb12e6_fk_incidents"
		}),
]);

export const incidentsIncidenttype = pgTable("incidents_incidenttype", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
	type: varchar({ length: 100 }).notNull(),
	penalty: numeric({ precision: 4, scale:  1 }).notNull(),
}, (table) => [
	index("incidents_incidenttype_type_e0ef3816_like").using("btree", table.type.asc().nullsLast().op("varchar_pattern_ops")),
	unique("incidents_incidenttype_type_key").on(table.type),
	check("incident_type_penalty_non_negative", sql`penalty >= (0)::numeric`),
]);

export const incidentsStudentdelay = pgTable("incidents_studentdelay", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).notNull().$defaultFn(() => new Date().toISOString()),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).notNull().$defaultFn(() => new Date().toISOString()).$onUpdate(() => new Date().toISOString()),
	delayType: varchar("delay_type", { length: 1 }).notNull(),
	incidentDate: date("incident_date").notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	enrollmentId: bigint("enrollment_id", { mode: "number" }).notNull(),
}, (table) => [
	index("incidents_studentdelay_enrollment_id_570e2051").using("btree", table.enrollmentId.asc().nullsLast().op("int8_ops")),
	foreignKey({
			columns: [table.enrollmentId],
			foreignColumns: [enrollmentsEnrollment.id],
			name: "incidents_studentdel_enrollment_id_570e2051_fk_enrollmen"
		}),
]);

// Not in Django: a student's presence at one lesson (period) of a day (src/app/(app)/lessons/attendance/).
export const lessonsAttendance = pgTable("lessons_attendance", {
	id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).notNull().$defaultFn(() => new Date().toISOString()),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).notNull().$defaultFn(() => new Date().toISOString()).$onUpdate(() => new Date().toISOString()),
	enrollmentId: bigint("enrollment_id", { mode: "number" }).notNull(),
	date: date().notNull(),
	period: smallint().notNull(),
	subjectId: bigint("subject_id", { mode: "number" }).notNull(),
	status: varchar({ length: 1 }).notNull(),
}, (table) => [
	index("lessons_attendance_date").using("btree", table.date.asc().nullsLast()),
	index("lessons_attendance_subject_id").using("btree", table.subjectId.asc().nullsLast()),
	foreignKey({
			columns: [table.enrollmentId],
			foreignColumns: [enrollmentsEnrollment.id],
			name: "lessons_attendance_enrollment_id_fk_enrollments_enrollment_id"
		}),
	foreignKey({
			columns: [table.subjectId],
			foreignColumns: [gradesGradelevelsubject.id],
			name: "lessons_attendance_subject_id_fk_grades_gradelevelsubject_id"
		}),
	unique("unique_attendance").on(table.enrollmentId, table.date, table.period),
	check("attendance_period_range", sql`(period >= 1) AND (period <= 12)`),
	check("attendance_status", sql`status IN ('P', 'F', 'J')`),
]);

// Not in Django: a note on a student's day of lessons (src/app/(app)/lessons/attendance/).
export const lessonsAttendancenote = pgTable("lessons_attendancenote", {
	id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).notNull().$defaultFn(() => new Date().toISOString()),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).notNull().$defaultFn(() => new Date().toISOString()).$onUpdate(() => new Date().toISOString()),
	enrollmentId: bigint("enrollment_id", { mode: "number" }).notNull(),
	date: date().notNull(),
	note: text().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.enrollmentId],
			foreignColumns: [enrollmentsEnrollment.id],
			name: "lessons_attendancenote_enrollment_id_fk_enrollments_enrollment_id"
		}),
	unique("unique_attendance_note").on(table.enrollmentId, table.date),
]);

export const lessonsLecture = pgTable("lessons_lecture", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).notNull().$defaultFn(() => new Date().toISOString()),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).notNull().$defaultFn(() => new Date().toISOString()).$onUpdate(() => new Date().toISOString()),
	date: date().notNull(),
	period: smallint().notNull(),
	topic: varchar({ length: 200 }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	schoolClassId: bigint("school_class_id", { mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	subjectId: bigint("subject_id", { mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	teacherId: bigint("teacher_id", { mode: "number" }).notNull(),
}, (table) => [
	index("lessons_lecture_school_class_id_f4e93d8d").using("btree", table.schoolClassId.asc().nullsLast().op("int8_ops")),
	index("lessons_lecture_subject_id_6b146e33").using("btree", table.subjectId.asc().nullsLast().op("int8_ops")),
	index("lessons_lecture_teacher_id_c5787e7e").using("btree", table.teacherId.asc().nullsLast().op("int8_ops")),
	foreignKey({
			columns: [table.schoolClassId],
			foreignColumns: [classesClass.id],
			name: "lessons_lecture_school_class_id_f4e93d8d_fk_classes_class_id"
		}),
	foreignKey({
			columns: [table.subjectId],
			foreignColumns: [gradesGradelevelsubject.id],
			name: "lessons_lecture_subject_id_6b146e33_fk_grades_gr"
		}),
	foreignKey({
			columns: [table.teacherId],
			foreignColumns: [employeesEmployee.id],
			name: "lessons_lecture_teacher_id_c5787e7e_fk_employees_employee_id"
		}),
	unique("unique_lecture").on(table.schoolClassId, table.date, table.period),
	check("lecture_period_range", sql`(period >= 1) AND (period <= 12)`),
	check("lessons_lecture_period_check", sql`period >= 0`),
]);

export const lessonsTimetableslot = pgTable("lessons_timetableslot", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
	weekday: smallint().notNull(),
	period: smallint().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	schoolClassId: bigint("school_class_id", { mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	subjectId: bigint("subject_id", { mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	teacherId: bigint("teacher_id", { mode: "number" }).notNull(),
}, (table) => [
	index("lessons_timetableslot_school_class_id_671b1c49").using("btree", table.schoolClassId.asc().nullsLast().op("int8_ops")),
	index("lessons_timetableslot_subject_id_e8471d3d").using("btree", table.subjectId.asc().nullsLast().op("int8_ops")),
	index("lessons_timetableslot_teacher_id_7d044e2a").using("btree", table.teacherId.asc().nullsLast().op("int8_ops")),
	foreignKey({
			columns: [table.schoolClassId],
			foreignColumns: [classesClass.id],
			name: "lessons_timetableslo_school_class_id_671b1c49_fk_classes_c"
		}),
	foreignKey({
			columns: [table.subjectId],
			foreignColumns: [gradesGradelevelsubject.id],
			name: "lessons_timetableslo_subject_id_e8471d3d_fk_grades_gr"
		}),
	foreignKey({
			columns: [table.teacherId],
			foreignColumns: [employeesEmployee.id],
			name: "lessons_timetableslo_teacher_id_7d044e2a_fk_employees"
		}),
	unique("unique_timetable_slot").on(table.schoolClassId, table.weekday, table.period),
	check("lessons_timetableslot_period_check", sql`period >= 0`),
	check("lessons_timetableslot_weekday_check", sql`weekday >= 0`),
	check("timetable_slot_period_range", sql`(period >= 1) AND (period <= 12)`),
	check("timetable_slot_saturday_period_range", sql`(NOT (weekday = 6)) OR (period <= 7)`),
	check("timetable_slot_weekday_range", sql`(weekday >= 1) AND (weekday <= 6)`),
]);

export const qAndAQanda = pgTable("q_and_a_qanda", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).notNull().$defaultFn(() => new Date().toISOString()),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).notNull().$defaultFn(() => new Date().toISOString()).$onUpdate(() => new Date().toISOString()),
	qAndADate: date("q_and_a_date").notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	enrollmentId: bigint("enrollment_id", { mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	subjectId: bigint("subject_id", { mode: "number" }).notNull(),
}, (table) => [
	index("q_and_a_qanda_enrollment_id_e3898c9e").using("btree", table.enrollmentId.asc().nullsLast().op("int8_ops")),
	index("q_and_a_qanda_subject_id_55b28d2f").using("btree", table.subjectId.asc().nullsLast().op("int8_ops")),
	foreignKey({
			columns: [table.enrollmentId],
			foreignColumns: [enrollmentsEnrollment.id],
			name: "q_and_a_qanda_enrollment_id_e3898c9e_fk_enrollmen"
		}),
	foreignKey({
			columns: [table.subjectId],
			foreignColumns: [gradesSubject.id],
			name: "q_and_a_qanda_subject_id_55b28d2f_fk_grades_subject_id"
		}),
]);

export const pathwaysPathwayoffering = pgTable("pathways_pathwayoffering", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).notNull().$defaultFn(() => new Date().toISOString()),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).notNull().$defaultFn(() => new Date().toISOString()).$onUpdate(() => new Date().toISOString()),
	name: varchar({ length: 30 }).notNull(),
	capacity: smallint(),
	schedule: varchar({ length: 100 }).notNull(),
	weekdays: jsonb().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	pathwayId: bigint("pathway_id", { mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	schoolYearId: bigint("school_year_id", { mode: "number" }).notNull(),
}, (table) => [
	index("pathways_pathwayoffering_pathway_id_d7960761").using("btree", table.pathwayId.asc().nullsLast().op("int8_ops")),
	index("pathways_pathwayoffering_school_year_id_2372d3b5").using("btree", table.schoolYearId.asc().nullsLast().op("int8_ops")),
	foreignKey({
			columns: [table.pathwayId],
			foreignColumns: [pathwaysPathway.id],
			name: "pathways_pathwayoffe_pathway_id_d7960761_fk_pathways_"
		}),
	foreignKey({
			columns: [table.schoolYearId],
			foreignColumns: [enrollmentsSchoolyear.id],
			name: "pathways_pathwayoffe_school_year_id_2372d3b5_fk_enrollmen"
		}),
	unique("unique_pathway_offering_per_year").on(table.pathwayId, table.schoolYearId, table.name),
	check("pathways_pathwayoffering_capacity_check", sql`capacity >= 0`),
]);

export const pathwaysPathwayofferingTeachers = pgTable("pathways_pathwayoffering_teachers", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	pathwayofferingId: bigint("pathwayoffering_id", { mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	employeeId: bigint("employee_id", { mode: "number" }).notNull(),
}, (table) => [
	index("pathways_pathwayoffering_teachers_employee_id_f11f973c").using("btree", table.employeeId.asc().nullsLast().op("int8_ops")),
	index("pathways_pathwayoffering_teachers_pathwayoffering_id_b5a33522").using("btree", table.pathwayofferingId.asc().nullsLast().op("int8_ops")),
	foreignKey({
			columns: [table.employeeId],
			foreignColumns: [employeesEmployee.id],
			name: "pathways_pathwayoffe_employee_id_f11f973c_fk_employees"
		}),
	foreignKey({
			columns: [table.pathwayofferingId],
			foreignColumns: [pathwaysPathwayoffering.id],
			name: "pathways_pathwayoffe_pathwayoffering_id_b5a33522_fk_pathways_"
		}),
	unique("pathways_pathwayoffering_pathwayoffering_id_emplo_bd17d2d3_uniq").on(table.pathwayofferingId, table.employeeId),
]);

export const pathwaysPathwayenrollment = pgTable("pathways_pathwayenrollment", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).notNull().$defaultFn(() => new Date().toISOString()),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).notNull().$defaultFn(() => new Date().toISOString()).$onUpdate(() => new Date().toISOString()),
	joinedAt: date("joined_at").notNull(),
	leftAt: date("left_at"),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	enrollmentId: bigint("enrollment_id", { mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	offeringId: bigint("offering_id", { mode: "number" }).notNull(),
}, (table) => [
	index("pathways_pathwayenrollment_enrollment_id_eeac6deb").using("btree", table.enrollmentId.asc().nullsLast().op("int8_ops")),
	index("pathways_pathwayenrollment_offering_id_08b21a2c").using("btree", table.offeringId.asc().nullsLast().op("int8_ops")),
	foreignKey({
			columns: [table.enrollmentId],
			foreignColumns: [enrollmentsEnrollment.id],
			name: "pathways_pathwayenro_enrollment_id_eeac6deb_fk_enrollmen"
		}),
	foreignKey({
			columns: [table.offeringId],
			foreignColumns: [pathwaysPathwayoffering.id],
			name: "pathways_pathwayenro_offering_id_08b21a2c_fk_pathways_"
		}),
	unique("unique_pathway_enrollment").on(table.enrollmentId, table.offeringId),
	check("pathway_enrollment_left_after_joined", sql`(left_at IS NULL) OR (left_at >= joined_at)`),
]);

export const pathwaysPathwaysession = pgTable("pathways_pathwaysession", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).notNull().$defaultFn(() => new Date().toISOString()),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).notNull().$defaultFn(() => new Date().toISOString()).$onUpdate(() => new Date().toISOString()),
	date: date().notNull(),
	topic: varchar({ length: 200 }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	offeringId: bigint("offering_id", { mode: "number" }).notNull(),
}, (table) => [
	index("pathways_pathwaysession_offering_id_01d939b5").using("btree", table.offeringId.asc().nullsLast().op("int8_ops")),
	foreignKey({
			columns: [table.offeringId],
			foreignColumns: [pathwaysPathwayoffering.id],
			name: "pathways_pathwaysess_offering_id_01d939b5_fk_pathways_"
		}),
]);

export const pathwaysPathwayattendance = pgTable("pathways_pathwayattendance", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
	status: varchar({ length: 1 }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	pathwayEnrollmentId: bigint("pathway_enrollment_id", { mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	sessionId: bigint("session_id", { mode: "number" }).notNull(),
}, (table) => [
	index("pathways_pathwayattendance_pathway_enrollment_id_b9541429").using("btree", table.pathwayEnrollmentId.asc().nullsLast().op("int8_ops")),
	index("pathways_pathwayattendance_session_id_3d1b960c").using("btree", table.sessionId.asc().nullsLast().op("int8_ops")),
	foreignKey({
			columns: [table.pathwayEnrollmentId],
			foreignColumns: [pathwaysPathwayenrollment.id],
			name: "pathways_pathwayatte_pathway_enrollment_i_b9541429_fk_pathways_"
		}),
	foreignKey({
			columns: [table.sessionId],
			foreignColumns: [pathwaysPathwaysession.id],
			name: "pathways_pathwayatte_session_id_3d1b960c_fk_pathways_"
		}),
	unique("unique_pathway_attendance").on(table.sessionId, table.pathwayEnrollmentId),
]);

export const pathwaysPathwaygrade = pgTable("pathways_pathwaygrade", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).notNull().$defaultFn(() => new Date().toISOString()),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).notNull().$defaultFn(() => new Date().toISOString()).$onUpdate(() => new Date().toISOString()),
	bimester: smallint().notNull(),
	score: numeric({ precision: 4, scale:  2 }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	pathwayEnrollmentId: bigint("pathway_enrollment_id", { mode: "number" }).notNull(),
}, (table) => [
	index("pathways_pathwaygrade_pathway_enrollment_id_02ecf4bd").using("btree", table.pathwayEnrollmentId.asc().nullsLast().op("int8_ops")),
	foreignKey({
			columns: [table.pathwayEnrollmentId],
			foreignColumns: [pathwaysPathwayenrollment.id],
			name: "pathways_pathwaygrad_pathway_enrollment_i_02ecf4bd_fk_pathways_"
		}),
	unique("unique_pathway_grade_per_bimester").on(table.pathwayEnrollmentId, table.bimester),
	check("pathway_grade_bimester_range", sql`(bimester >= 1) AND (bimester <= 4)`),
	check("pathway_grade_score_not_negative", sql`score >= (0)::numeric`),
	check("pathways_pathwaygrade_bimester_check", sql`bimester >= 0`),
]);

export const pathwaysPathway = pgTable("pathways_pathway", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
	name: varchar({ length: 50 }).notNull(),
	description: text().notNull(),
	extraPoints: numeric("extra_points", { precision: 4, scale:  2 }).notNull(),
	workloadHours: numeric("workload_hours", { precision: 6, scale:  2 }).notNull(),
	workloadType: varchar("workload_type", { length: 1 }).notNull(),
}, (table) => [
	index("pathways_pathway_name_de1f8ad2_like").using("btree", table.name.asc().nullsLast().op("varchar_pattern_ops")),
	unique("pathways_pathway_name_key").on(table.name),
	check("pathway_extra_points_not_negative", sql`extra_points >= (0)::numeric`),
	check("pathway_workload_hours_only_when_fixed", sql`((workload_hours > (0)::numeric) AND ((workload_type)::text = 'F'::text)) OR ((NOT ((workload_type)::text = 'F'::text)) AND (workload_hours = (0)::numeric))`),
]);

// Not in Django: early exits (Liberações), a motive picked from a list the staff edit
export const releasesExitreason = pgTable("releases_exitreason", {
	id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
	reason: varchar({ length: 100 }).notNull(),
}, (table) => [
	unique("releases_exitreason_reason_key").on(table.reason),
]);

export const releasesEarlyexit = pgTable("releases_earlyexit", {
	id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).notNull().$defaultFn(() => new Date().toISOString()),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).notNull().$defaultFn(() => new Date().toISOString()).$onUpdate(() => new Date().toISOString()),
	exitDate: date("exit_date").notNull(),
	enrollmentId: bigint("enrollment_id", { mode: "number" }).notNull(),
	reasonId: bigint("reason_id", { mode: "number" }).notNull(),
}, (table) => [
	index("releases_earlyexit_reason_id_idx").using("btree", table.reasonId.asc().nullsLast().op("int8_ops")),
	index("releases_earlyexit_exit_date_idx").using("btree", table.exitDate.asc().nullsLast().op("date_ops")),
	foreignKey({
			columns: [table.enrollmentId],
			foreignColumns: [enrollmentsEnrollment.id],
			name: "releases_earlyexit_enrollment_id_fk_enrollments_enrollment_id"
		}),
	foreignKey({
			columns: [table.reasonId],
			foreignColumns: [releasesExitreason.id],
			name: "releases_earlyexit_reason_id_fk_releases_exitreason_id"
		}),
	// Also serves lookups by enrollment (leading column)
	unique("releases_earlyexit_enrollment_date_reason_key").on(table.enrollmentId, table.exitDate, table.reasonId),
]);

// Not in Django: documents staff receive from a student (Recebimento de documentos), a type picked from a list the staff edit
export const documentsDocumenttype = pgTable("documents_documenttype", {
	id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
	type: varchar({ length: 100 }).notNull(),
}, (table) => [
	unique("documents_documenttype_type_key").on(table.type),
]);

export const documentsReceiveddocument = pgTable("documents_receiveddocument", {
	id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).notNull().$defaultFn(() => new Date().toISOString()),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).notNull().$defaultFn(() => new Date().toISOString()).$onUpdate(() => new Date().toISOString()),
	receivedDate: date("received_date").notNull(),
	enrollmentId: bigint("enrollment_id", { mode: "number" }).notNull(),
	documentTypeId: bigint("document_type_id", { mode: "number" }).notNull(),
}, (table) => [
	index("documents_receiveddocument_enrollment_id_idx").using("btree", table.enrollmentId.asc().nullsLast().op("int8_ops")),
	index("documents_receiveddocument_document_type_id_idx").using("btree", table.documentTypeId.asc().nullsLast().op("int8_ops")),
	foreignKey({
			columns: [table.enrollmentId],
			foreignColumns: [enrollmentsEnrollment.id],
			name: "documents_receiveddocument_enrollment_id_fk"
		}),
	foreignKey({
			columns: [table.documentTypeId],
			foreignColumns: [documentsDocumenttype.id],
			name: "documents_receiveddocument_document_type_id_fk"
		}),
]);

// Not in Django: a notice staff send to guardians (src/app/(app)/alerts), listed on the portal home; no class = every guardian.
export const portalAlert = pgTable("portal_alert", {
	id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).notNull().$defaultFn(() => new Date().toISOString()),
	title: varchar({ length: 120 }).notNull(),
	body: text().notNull(),
	schoolClassId: bigint("school_class_id", { mode: "number" }),
}, (table) => [
	index("portal_alert_school_class_id").using("btree", table.schoolClassId.asc().nullsLast().op("int8_ops")),
	foreignKey({
			columns: [table.schoolClassId],
			foreignColumns: [classesClass.id],
			name: "portal_alert_school_class_id_fk_classes_class_id"
		}).onDelete("cascade"),
]);
