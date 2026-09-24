import { defineApp } from "convex/server";
import migrationsComponent from "@convex-dev/migrations/convex.config.js";

const app = defineApp();
app.use(migrationsComponent);

export default app;
