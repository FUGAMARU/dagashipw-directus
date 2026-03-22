import {
  DEFAULT_RELATED_LIMIT,
  ERROR_ARTICLE_NOT_FOUND,
  ERROR_ARTICLE_URL_ID_REQUIRED,
  MAX_ARTICLE_FETCH_LIMIT,
  MAX_RELATED_LIMIT
} from "../constants"
import type { ArticleRow, EndpointContext, RequestWithAccountability, ResponseLike } from "../types"
import {
  ensureAuthenticated,
  isBlank,
  isPublishedFilter,
  normalizeArticleUrlId,
  parsePagination,
  parseTags,
  sendError,
  shuffleArray,
  toCalculatedArticle,
  toPositiveInt
} from "../utils"

export const registerArticleRoutes = (router: any, database: EndpointContext["database"]) => {
  // 全記事URLのID一覧
  router.get(
    "/articles/all-article-url-id",
    async (req: RequestWithAccountability, res: ResponseLike) => {
      if (!ensureAuthenticated(req, res)) return

      const rows = (await isPublishedFilter(database.from("articles"))
        .select("article_url_id")
        .orderBy("force_created_at", "desc")
        .limit(MAX_ARTICLE_FETCH_LIMIT)) as Array<Pick<ArticleRow, "article_url_id">>

      res.json(rows.map(row => row.article_url_id))
    }
  )

  // 記事詳細
  router.get(
    "/articles/calculated/:articleUrlId",
    async (req: RequestWithAccountability, res: ResponseLike) => {
      if (!ensureAuthenticated(req, res)) return

      const articleUrlId = normalizeArticleUrlId(req.params.articleUrlId)
      if (isBlank(articleUrlId)) {
        sendError(res, 400, ERROR_ARTICLE_URL_ID_REQUIRED)
        return
      }

      const article = (await isPublishedFilter(database.from("articles"))
        .where("article_url_id", articleUrlId)
        .first()) as ArticleRow | undefined

      if (!article) {
        sendError(res, 404, ERROR_ARTICLE_NOT_FOUND)
        return
      }

      res.json(await toCalculatedArticle(database, article, req))
    }
  )

  // 記事一覧（ページネーション付き）
  router.get("/articles/calculated", async (req: RequestWithAccountability, res: ResponseLike) => {
    if (!ensureAuthenticated(req, res)) return

    const { page, pageSize } = parsePagination(req.query)
    const offset = (page - 1) * pageSize

    const rows = (await isPublishedFilter(database.from("articles"))
      .orderBy("force_created_at", "desc")
      .offset(offset)
      .limit(pageSize)) as ArticleRow[]

    const totalResult = await isPublishedFilter(database.from("articles")).count(
      "article_url_id as count"
    )
    const total = Number(totalResult[0]?.count ?? 0)
    const pageCount = Math.max(1, Math.ceil(total / pageSize))

    const data = await Promise.all(rows.map(row => toCalculatedArticle(database, row, req)))

    res.json({
      data,
      meta: { pagination: { page, pageSize, pageCount, total } }
    })
  })

  // 関連記事
  router.get(
    "/articles/calculated/:articleUrlId/related",
    async (req: RequestWithAccountability, res: ResponseLike) => {
      if (!ensureAuthenticated(req, res)) return

      const articleUrlId = normalizeArticleUrlId(req.params.articleUrlId)
      if (isBlank(articleUrlId)) {
        sendError(res, 400, ERROR_ARTICLE_URL_ID_REQUIRED)
        return
      }

      const limit = Math.min(
        toPositiveInt(req.query.limit, DEFAULT_RELATED_LIMIT),
        MAX_RELATED_LIMIT
      )

      const currentArticle = (await isPublishedFilter(database.from("articles"))
        .select("article_url_id", "tags")
        .where("article_url_id", articleUrlId)
        .first()) as Pick<ArticleRow, "article_url_id" | "tags"> | undefined

      if (!currentArticle) {
        sendError(res, 404, ERROR_ARTICLE_NOT_FOUND)
        return
      }

      const currentTags = parseTags(currentArticle.tags).map(t => t.toLowerCase())
      if (currentTags.length === 0 || limit <= 0) {
        res.json({ data: [] })
        return
      }

      // 全公開記事のタグ情報を取得
      const allArticles = (await isPublishedFilter(database.from("articles")).select(
        "article_url_id",
        "tags"
      )) as Array<Pick<ArticleRow, "article_url_id" | "tags">>

      // タグの出現頻度を集計
      const tagFrequencies: Record<string, number> = {}
      for (const article of allArticles) {
        for (const tag of parseTags(article.tags)) {
          const lower = tag.toLowerCase()
          tagFrequencies[lower] = (tagFrequencies[lower] ?? 0) + 1
        }
      }

      // 現在の記事のタグを希少度が高い順（出現頻度が少ない順）にソート
      const sortedTags = [...new Set(currentTags)].sort(
        (a, b) => (tagFrequencies[a] ?? 0) - (tagFrequencies[b] ?? 0)
      )

      // 各タグごとに候補記事をシャッフルして選出
      let recommendations: string[] = []
      for (const tag of sortedTags) {
        if (recommendations.length >= limit) break

        const candidates = allArticles
          .filter(a => {
            const tags = parseTags(a.tags).map(t => t.toLowerCase())
            return (
              a.article_url_id !== articleUrlId &&
              !recommendations.includes(a.article_url_id) &&
              tags.includes(tag)
            )
          })
          .map(a => a.article_url_id)

        if (candidates.length === 0) continue

        const needed = limit - recommendations.length
        recommendations = [...recommendations, ...shuffleArray(candidates).slice(0, needed)]
      }

      if (recommendations.length === 0) {
        res.json({ data: [] })
        return
      }

      // 選出順を維持して記事詳細を取得
      const relatedRows = (await isPublishedFilter(database.from("articles")).whereIn(
        "article_url_id",
        recommendations
      )) as ArticleRow[]

      const sortedRows = recommendations
        .map(id => relatedRows.find(row => row.article_url_id === id))
        .filter((row): row is ArticleRow => Boolean(row))

      const data = await Promise.all(sortedRows.map(row => toCalculatedArticle(database, row, req)))

      res.json({ data })
    }
  )
}
