// Public entry point of the school data layer. The implementation lives in
// lib/school-db/ (one file per concern); import from "@/lib/school-db", not
// from those files, so this list stays the whole public surface.
//
//   base.ts         types, resource columns, value helpers, pg pool
//   schema.ts       CREATE TABLE / migrations / seeding (ensureSchoolDatabase)
//   local-store.ts  JSON file fallback for local development, fetchRawTable
//   access.ts       per-role read filtering and write permission checks
//   resources.ts    list/create/update/delete of school resources
//   payments.ts     QPay settlement and lunch payments
//   registration.ts self-registration and teacher approval
//   placement.ts    English placement test grading

export type { ResourceTable, SchoolRequestContext, SchoolRequestMode, SchoolResource } from "./school-db/base";
export { isSchoolResource } from "./school-db/base";
export { requireSubjectContentAccess } from "./school-db/access";
export { createResource, deleteResource, listResource, updateResource } from "./school-db/resources";
export { requestLunchPayment, settleQpayPayment } from "./school-db/payments";
export { RegistrationError, approveTeacher, registerAccount, registrationOptions } from "./school-db/registration";
export { submitPlacementTest } from "./school-db/placement";
