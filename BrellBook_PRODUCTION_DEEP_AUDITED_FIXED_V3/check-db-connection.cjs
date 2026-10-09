const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.$queryRawUnsafe(`
    SELECT
      current_database() AS database_name,
      current_schema() AS schema_name,
      current_user AS database_user,
      current_setting('search_path') AS search_path,
      (
        SELECT COUNT(*)::int
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_type = 'BASE TABLE'
      ) AS table_count,
      (
        SELECT string_agg(table_name, ', ' ORDER BY table_name)
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_type = 'BASE TABLE'
      ) AS tables
  `);

  console.table(result);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
