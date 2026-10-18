import { runCleanup } from "../src/server/cleanup";

runCleanup().catch((err) => {
  console.error(err);
  process.exit(1);
});
