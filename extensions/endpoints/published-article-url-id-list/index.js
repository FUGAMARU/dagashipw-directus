export default {
  id: "published-article-url-id-list",
  handler: (router, { database, logger }) => {
    router.get("/", async (_req, res, next) => {
      try {
        const rows = await database("articles")
          .select("article_url_id")
          .where((query) => {
            query.where("is_unpublished", false).orWhereNull("is_unpublished");
          });

        const articleUrlIds = rows
          .map((row) => row.article_url_id)
          .filter((value) => typeof value === "string" && value.length > 0);

        res.json(articleUrlIds);
      } catch (error) {
        logger.error(
          error,
          "[published-article-url-id-list] 公開記事のURL ID一覧の取得に失敗しました",
        );
        next(error);
      }
    });
  },
};
