const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient({
  log: ["error"],
  errorFormat: "pretty",
});

/*
 * Handle graceful shutdown
 * @see: https://expressjs.com/en/advanced/healthcheck-graceful-shutdown.html
 * */
process.on("beforeExit", async () => {
  await prisma.$disconnect();
});

process.on("SIGINT", async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await prisma.$disconnect();
  process.exit(0);
});

module.exports = prisma;
