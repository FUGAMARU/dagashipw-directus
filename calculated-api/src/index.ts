import { defineEndpoint } from "@directus/extensions-sdk";

export default defineEndpoint((router) => {
  router.get("/", (_req, res) => res.json({ message: "Hello, World!" }));
});
