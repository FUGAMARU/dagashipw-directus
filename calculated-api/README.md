# calculated-api

麩菓子の雑記帳のBFF（Backend for Frontend）として動作するDirectus endpoint拡張。

記事・コメントの計算済みデータを返すカスタムAPIを提供する。

※このリポジトリのソースコードはほぼ全てAIが書いています。

## エンドポイント一覧

全エンドポイントで認証が必須。

### 記事

| メソッド | パス                                                        | 説明                                     |
| -------- | ----------------------------------------------------------- | ---------------------------------------- |
| GET      | `/calculated-api/articles/all-article-url-id`               | 公開記事の全 `articleUrlId` を配列で返す |
| GET      | `/calculated-api/articles/calculated/:articleUrlId`         | 記事詳細（backNumber等の計算値付き）     |
| GET      | `/calculated-api/articles/calculated`                       | 記事一覧（ページネーション付き）         |
| GET      | `/calculated-api/articles/calculated/:articleUrlId/related` | 関連記事（タグの希少度ベース）           |

### コメント

| メソッド | パス                                                | 説明                                       |
| -------- | --------------------------------------------------- | ------------------------------------------ |
| GET      | `/calculated-api/comments/calculated/:articleUrlId` | 指定記事のコメント一覧（親子階層構造付き） |

## クエリパラメータ

### 開発環境フラグ（記事系エンドポイント共通）

| パラメータ            | 型     | デフォルト | 説明                                                                 |
| --------------------- | ------ | ---------- | -------------------------------------------------------------------- |
| `include-dev-article` | string | -          | 指定時は `DEVELOPMENT_ARTICLE_URL_ID` の記事を除外せずレスポンスする |

### 記事一覧 (`/articles/calculated`)

| パラメータ                                     | 型     | デフォルト | 説明                         |
| ---------------------------------------------- | ------ | ---------- | ---------------------------- |
| `pagination[page]` / `pagination.page`         | number | 1          | ページ番号                   |
| `pagination[pageSize]` / `pagination.pageSize` | number | 10         | 1ページあたり件数（最大100） |

ソートは `force_created_at` 降順、同値時は `article_url_id` 昇順で固定。

### BackNumber仕様

- `backNumber` は公開記事集合における順位（古い記事数 + 1）として算出する。
- 記事詳細・記事一覧・キーワード検索・タグ検索では、表示順と `backNumber` の整合を保証する。
- 関連記事はタグ希少度とシャッフルを使ったレコメンド順で返すため、`backNumber` と表示順の整合対象外とする。

### 関連記事 (`/articles/calculated/:articleUrlId/related`)

| パラメータ | 型     | デフォルト | 説明               |
| ---------- | ------ | ---------- | ------------------ |
| `limit`    | number | 4          | 取得件数（最大20） |

## 環境変数

| 変数名                       | デフォルト | 説明                                                                   |
| ---------------------------- | ---------- | ---------------------------------------------------------------------- |
| `PUBLIC_URL`                 | -          | Directusの公開URL（アセットURL生成に使用）                             |
| `DEVELOPMENT_ARTICLE_URL_ID` | -          | 通常はAPI結果から除外する開発用 `article_url_id`（未設定時は除外なし） |

## ビルド

```bash
cd calculated-api
npm install
npm run build
```

## 検証

```bash
npm run build
npm run validate
```
