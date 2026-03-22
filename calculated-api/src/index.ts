import { defineEndpoint } from "@directus/extensions-sdk"
import type { EndpointContext } from "./types"
import { registerArticleRoutes } from "./routes/articles"
import { registerCommentRoutes } from "./routes/comments"

export default defineEndpoint((router, context: EndpointContext) => {
  const { database } = context
  registerArticleRoutes(router, database)
  registerCommentRoutes(router, database)
})
