import {
  BODY_SUMMARY_MAX_LENGTH,
  DIRECTUS_URL,
  DEFAULT_PAGE_SIZE,
  DEVELOPMENT_ARTICLE_URL_ID,
  ERROR_AUTH_REQUIRED,
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

/** 公開記事のみに絞り込み、必要に応じて開発用article_url_idを除外する */
export const isPublishedFilter = (query: any, includeDevelopmentArticle = false) =>
  query
    .where((builder: any) => {
      builder.where("is_unpublished", false).orWhereNull("is_unpublished")
    })
    .modify((builder: any) => {
      if (!includeDevelopmentArticle && !isBlank(DEVELOPMENT_ARTICLE_URL_ID)) {
        builder.whereNot("article_url_id", DEVELOPMENT_ARTICLE_URL_ID)
      }
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

/** 開発用記事を含めるフラグ（include-dev-article）が付与されているか判定する */
export const parseIncludeDevArticle = (query: Record<string, unknown>) =>
  query["include-dev-article"] !== undefined

// ============================================================
// アセットURL
// ============================================================

/** サムネイルIDからDirectusアセットURLを生成する */
export const toAssetUrl = (thumbnailId: string | null, req: RequestWithAccountability) => {
  if (!thumbnailId) return ""

  const raw = DIRECTUS_URL
  const publicUrl = raw?.endsWith("/") ? raw.slice(0, -1) : raw

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

/** 表示順で対象記事より前に来る公開記事数 + 1 を返す */
export const calculateBackNumber = async (
  database: EndpointContext["database"],
  article: ArticleRow,
  includeDevelopmentArticle = false
) => {
  const countResult = await isPublishedFilter(database.from("articles"), includeDevelopmentArticle)
    .andWhere((builder: any) => {
      builder
        .where("force_created_at", ">", article.force_created_at)
        .orWhere((sameCreatedAtBuilder: any) => {
          sameCreatedAtBuilder
            .where("force_created_at", "=", article.force_created_at)
            .andWhere("article_url_id", "<", article.article_url_id)
        })
    })
    .count("article_url_id as count")

  return Number(countResult[0]?.count ?? 0) + 1
}

/** DBの記事行をAPI応答用のオブジェクトに変換する */
export const toCalculatedArticle = async (
  database: EndpointContext["database"],
  article: ArticleRow,
  req: RequestWithAccountability,
  includeDevelopmentArticle = false
) => {
  const tags = parseTags(article.tags)
  const originalThumbnailUrl = toAssetUrl(article.thumbnail, req)

  return {
    articleUrlId: article.article_url_id,
    backNumber: await calculateBackNumber(database, article, includeDevelopmentArticle),
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
