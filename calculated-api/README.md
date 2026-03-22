# calculated-api

麩菓子の雑記帳のBFF（Backend for Frontend）として動作するDirectus endpoint拡張。
記事・コメントの計算済みデータを返すカスタムAPIを提供する。

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

### 記事一覧 (`/articles/calculated`)

| パラメータ                                     | 型     | デフォルト | 説明                         |
| ---------------------------------------------- | ------ | ---------- | ---------------------------- |
| `pagination[page]` / `pagination.page`         | number | 1          | ページ番号                   |
| `pagination[pageSize]` / `pagination.pageSize` | number | 10         | 1ページあたり件数（最大100） |

ソートは `force_created_at` 降順で固定。

### 関連記事 (`/articles/calculated/:articleUrlId/related`)

| パラメータ | 型     | デフォルト | 説明               |
| ---------- | ------ | ---------- | ------------------ |
| `limit`    | number | 4          | 取得件数（最大20） |

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
