import { Hono } from "hono";

import { chatsRoute } from "@/lib/api/routes/chats";
import { unitsRoute } from "@/lib/api/routes/units";
import { wishesRoute } from "@/lib/api/routes/wishes";

const app = new Hono().basePath("/api");

app.route("/units", unitsRoute);
app.route("/wishes", wishesRoute);
app.route("/chats", chatsRoute);

app.get("/health", (c) => c.json({ success: true, data: { status: "ok" } }));

export type AppType = typeof app;
export { app };
