import {
  ANONYMOUS_USER_NAME,
  ERROR_ARTICLE_URL_ID_REQUIRED,
  MAX_COMMENT_FETCH_LIMIT
} from "../constants"
import type {
  CommentRow,
  CommentWithParentId,
  EndpointContext,
  FormattedComment,
  RequestWithAccountability,
  ResponseLike
} from "../types"
import { ensureAuthenticated, isBlank, normalizeArticleUrlId, sendError } from "../utils"

export const registerCommentRoutes = (router: any, database: EndpointContext["database"]) => {
  router.get(
    "/comments/calculated/:articleUrlId",
    async (req: RequestWithAccountability, res: ResponseLike) => {
      if (!ensureAuthenticated(req, res)) return

      const articleUrlId = normalizeArticleUrlId(req.params.articleUrlId)
      if (isBlank(articleUrlId)) {
        sendError(res, 400, ERROR_ARTICLE_URL_ID_REQUIRED)
        return
      }

      // force_created_at昇順で取得
      const allComments = (await database
        .from("comments")
        .where("article_url_id", articleUrlId)
        .orderBy("force_created_at", "asc")
        .limit(MAX_COMMENT_FETCH_LIMIT)) as CommentRow[]

      const formatted: CommentWithParentId[] = allComments.map(c => ({
        commentId: c.comment_id,
        userName: c.user_name || ANONYMOUS_USER_NAME,
        submittedAt: c.force_created_at,
        body: c.body,
        isAdministratorComment: Boolean(c.is_administrator_comment),
        _parentId: c.parent_comment_id
      }))

      // 親子関係の構築
      const parentComments: FormattedComment[] = []
      const childrenMap: Record<string, FormattedComment[]> = {}

      for (const comment of formatted) {
        const { _parentId, ...payload } = comment

        if (_parentId) {
          // 子コメント: 古い順（DB取得順のまま末尾追加）
          if (!childrenMap[_parentId]) childrenMap[_parentId] = []
          childrenMap[_parentId].push(payload)
        } else {
          // 親コメント: 新しい順（先頭追加でforceCreatedAt降順にする）
          parentComments.unshift({ ...payload, replies: [] })
        }
      }

      for (const parent of parentComments) {
        parent.replies = childrenMap[parent.commentId] ?? []
      }

      res.json({ data: parentComments })
    }
  )
}
