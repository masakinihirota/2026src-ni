import { Hono } from "hono";
import { ok } from "@/lib/api/types";
import { UNITS } from "@/lib/housing-data";

export const unitsRoute = new Hono();

unitsRoute.get("/", (c) => {
  return c.json(ok({ units: UNITS }));
});
