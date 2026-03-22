import {
  BODY_SUMMARY_MAX_LENGTH,
  DIRECTUS_URL,
  DEFAULT_PAGE_SIZE,
  ERROR_AUTH_REQUIRED,
  EXCLUDED_ARTICLE_ID,
  MAX_PAGE_SIZE
} from "./constants"
import type {
  ArticleRow,
  EndpointContext,
  Pagination,
  RequestWithAccountability,
  ResponseLike
} from "./types"

// ============================================================
// 文字列
// ============================================================

/** 文字列が空またはundefinedかどうかを判定する */
export const isBlank = (value: string | undefined) => !value || value.trim() === ""

/** パスパラメータのarticleUrlIdを正規化する */
export const normalizeArticleUrlId = (rawValue: string | undefined) =>
  (typeof rawValue === "string" ? rawValue : "").trim()

// ============================================================
// 数値
// ============================================================

/** 正の整数にパースする。パース不能な場合はfallbackを返す */
export const toPositiveInt = (value: unknown, fallback: number) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback
  return Math.floor(parsed)
}

// ============================================================
// Markdown
// ============================================================

/** Markdownテキストからマークアップを除去してプレーンテキストに変換する */
export const stripMarkdown = (text: string) => {
  if (!text) return ""
  return text
    .replace(/^#+\s+/gm, "")
    .replace(/(\*\*|__)(.*?)\1/g, "$2")
    .replace(/(\*|_)(.*?)\1/g, "$2")
    .replace(/!\[.*?\]\(.*?\)/g, "")
    .replace(/\[(.*?)\]\(.*?\)/g, "$1")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\n+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

/** 記事本文をプレーンテキスト化して先頭を切り出す */
export const summarizeBody = (body: string) => {
  const plain = stripMarkdown(body)
  if (plain.length <= BODY_SUMMARY_MAX_LENGTH) return plain
  return `${plain.substring(0, BODY_SUMMARY_MAX_LENGTH)}...`
}

// ============================================================
// タグ
// ============================================================

/** DBから取得したタグ値（JSON文字列 or 配列）をstring[]にパースする */
export const parseTags = (rawTags: unknown): string[] => {
  if (Array.isArray(rawTags)) {
    return rawTags.filter((tag): tag is string => typeof tag === "string")
  }
  if (typeof rawTags === "string") {
    try {
      const parsed: unknown = JSON.parse(rawTags)
      if (Array.isArray(parsed)) {
        return parsed.filter((tag): tag is string => typeof tag === "string")
      }
    } catch {
      // パース失敗時は空配列
    }
  }
  return []
}

// ============================================================
// 認証・レスポンス
// ============================================================

/** エラーレスポンスを返す */
export const sendError = (res: ResponseLike, code: number, message: string) => {
  res.status(code).json({ message })
}

/** 認証済みかチェックし、未認証なら401を返してfalseを返す */
export const ensureAuthenticated = (req: RequestWithAccountability, res: ResponseLike) => {
  if (req.accountability?.user || req.accountability?.admin) return true
  sendError(res, 401, ERROR_AUTH_REQUIRED)
  return false
}

// ============================================================
// DB
// ============================================================

/** 公開記事のみに絞り込むWHERE句を付与する */
export const isPublishedFilter = (query: any) =>
  query.where((builder: any) => {
    builder.where("is_unpublished", false).orWhereNull("is_unpublished")
  })

// ============================================================
// クエリパース
// ============================================================

/** リクエストクエリからページネーション情報を抽出する */
export const parsePagination = (query: Record<string, unknown>): Pagination => {
  const paginationObj = (query.pagination as Record<string, unknown> | undefined) ?? {}
  const dotPage = query["pagination.page"]
  const dotPageSize = query["pagination.pageSize"]

  const page = toPositiveInt(paginationObj.page ?? dotPage, 1)
  const pageSize = Math.min(
    toPositiveInt(paginationObj.pageSize ?? dotPageSize, DEFAULT_PAGE_SIZE),
    MAX_PAGE_SIZE
  )

  return { page, pageSize }
}

// ============================================================
// アセットURL
// ============================================================

/** サムネイルIDからDirectusアセットURLを生成する */
export const toAssetUrl = (thumbnailId: string | null, req: RequestWithAccountability) => {
  if (!thumbnailId) return ""

  const raw = DIRECTUS_URL
  const publicUrl = raw.endsWith("/") ? raw.slice(0, -1) : raw

  const forwardedProto = req.headers["x-forwarded-proto"]
  const forwardedHost = req.headers["x-forwarded-host"]

  if (typeof forwardedProto === "string" && typeof forwardedHost === "string") {
    return `${forwardedProto}://${forwardedHost}/assets/${thumbnailId}`
  }

  return `${publicUrl}/assets/${thumbnailId}`
}

// ============================================================
// 配列
// ============================================================

/** 配列をFisher-Yatesアルゴリズムでシャッフルする（非破壊） */
export const shuffleArray = <T>(array: T[]): T[] => {
  const copied = [...array]
  for (let i = copied.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copied[i], copied[j]] = [copied[j]!, copied[i]!]
  }
  return copied
}

// ============================================================
// 記事変換
// ============================================================

/** 対象記事より古い公開記事数 + 1 を返す。除外対象記事は0を返す */
export const calculateBackNumber = async (
  database: EndpointContext["database"],
  article: ArticleRow
) => {
  if (article.article_url_id === EXCLUDED_ARTICLE_ID) return 0

  const countResult = await isPublishedFilter(database.from("articles"))
    .whereNot("article_url_id", EXCLUDED_ARTICLE_ID)
    .andWhere("force_created_at", "<", article.force_created_at)
    .count("article_url_id as count")

  return Number(countResult[0]?.count ?? 0) + 1
}

/** DBの記事行をAPI応答用のオブジェクトに変換する */
export const toCalculatedArticle = async (
  database: EndpointContext["database"],
  article: ArticleRow,
  req: RequestWithAccountability
) => {
  const tags = parseTags(article.tags)
  const originalThumbnailUrl = toAssetUrl(article.thumbnail, req)

  return {
    articleUrlId: article.article_url_id,
    backNumber: await calculateBackNumber(database, article),
    title: article.title,
    thumbnail: {
      normal: {
        pc1x: originalThumbnailUrl,
        pc2x: originalThumbnailUrl,
        sp1x: originalThumbnailUrl,
        sp2x: originalThumbnailUrl
      },
      smaller: {
        pc1x: originalThumbnailUrl,
        pc2x: originalThumbnailUrl,
        sp1x: originalThumbnailUrl,
        sp2x: originalThumbnailUrl
      }
    },
    originalThumbnailUrl,
    themeColor: article.theme_color,
    tags,
    bodyBeginningParagraph: summarizeBody(article.body),
    body: article.body,
    createdAt: article.force_created_at,
    updatedAt: article.force_updated_at
  }
}
