// ============================================================
// DBスキーマ対応
// ============================================================

/** articlesテーブルの行型 */
export type ArticleRow = {
  article_url_id: string
  is_unpublished: boolean | null
  force_created_at: string
  force_updated_at: string | null
  title: string
  thumbnail: string | null
  tags: unknown
  body: string
  theme_color: string | null
}

/** commentsテーブルの行型 */
export type CommentRow = {
  comment_id: string
  parent_comment_id: string | null
  article_url_id: string
  force_created_at: string
  user_name: string | null
  body: string
  is_administrator_comment: boolean | null
}

// ============================================================
// レスポンス用
// ============================================================

/** コメントのレスポンス型 */
export type FormattedComment = {
  commentId: string
  userName: string
  submittedAt: string
  body: string
  isAdministratorComment: boolean
  replies?: FormattedComment[]
}

/** 親子関係構築用の内部コメント型 */
export type CommentWithParentId = FormattedComment & {
  _parentId: string | null
}

// ============================================================
// クエリパース用
// ============================================================

/** ページネーション情報 */
export type Pagination = {
  page: number
  pageSize: number
}

// ============================================================
// Directus拡張固有
// ============================================================

/** Directus endpoint extensionのコンテキスト */
export type EndpointContext = {
  database: {
    from: (table: string) => any
  }
}

/** Directusの認証情報付きリクエスト */
export type RequestWithAccountability = {
  params: Record<string, string | undefined>
  query: Record<string, unknown>
  headers: Record<string, string | string[] | undefined>
  accountability?: {
    user?: string
    role?: string
    admin?: boolean
  } | null
}

/** Expressライクなレスポンスオブジェクト */
export type ResponseLike = {
  status: (code: number) => ResponseLike
  json: (payload: unknown) => void
}
