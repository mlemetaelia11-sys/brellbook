const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const columns = await prisma.$queryRaw`
    SELECT table_name, column_name, data_type, udt_name, is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND (
        (table_name = 'Business' AND column_name = 'logoKey')
        OR (table_name = 'User' AND column_name = 'timezone')
        OR (table_name = 'BusinessMembership' AND column_name = 'role')
      )
    ORDER BY table_name, column_name
  `;

  console.log("\nTARGET COLUMNS");
  console.table(columns);

  const roles = await prisma.$queryRaw`
    SELECT role::text AS role_value, COUNT(*)::int AS total
    FROM "BusinessMembership"
    GROUP BY role::text
    ORDER BY role_value
  `;

  console.log("\nSAVED MEMBERSHIP ROLES");
  console.table(roles);

  const enums = await prisma.$queryRaw`
    SELECT t.typname AS enum_type, e.enumlabel AS enum_value
    FROM pg_type t
    JOIN pg_enum e ON e.enumtypid = t.oid
    WHERE t.typnamespace = 'public'::regnamespace
      AND t.typname ILIKE '%role%'
    ORDER BY t.typname, e.enumsortorder
  `;

  console.log("\nROLE ENUM DEFINITIONS");
  console.table(enums);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
