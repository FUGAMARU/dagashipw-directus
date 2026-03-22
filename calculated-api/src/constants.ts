// ============================================================
// 記事
// ============================================================

/** backNumber計算から除外する記事のID */
export const EXCLUDED_ARTICLE_ID = "development"

/** 記事一覧のデフォルト1ページあたり件数 */
export const DEFAULT_PAGE_SIZE = 10

/** 記事一覧の1ページあたり最大件数 */
export const MAX_PAGE_SIZE = 100

/** 関連記事のデフォルト取得件数 */
export const DEFAULT_RELATED_LIMIT = 4

/** 関連記事の最大取得件数 */
export const MAX_RELATED_LIMIT = 20

/** 記事一覧APIの最大取得件数 */
export const MAX_ARTICLE_FETCH_LIMIT = 10000

/** 記事本文要約の最大文字数 */
export const BODY_SUMMARY_MAX_LENGTH = 100

// ============================================================
// コメント
// ============================================================

/** コメント取得の最大件数 */
export const MAX_COMMENT_FETCH_LIMIT = 1000

/** ユーザー名未設定時の表示名 */
export const ANONYMOUS_USER_NAME = "匿名ユーザー"

// ============================================================
// URL
// ============================================================

/** DirectusのURL */
export const DIRECTUS_URL = "https://directus.dagashi.pw"

// ============================================================
// エラーメッセージ
// ============================================================

/** 認証エラー */
export const ERROR_AUTH_REQUIRED = "認証が必要です"

/** 記事URLのID未指定エラー */
export const ERROR_ARTICLE_URL_ID_REQUIRED = "記事URLのIDは必須です"

/** 記事が見つからないエラー */
export const ERROR_ARTICLE_NOT_FOUND = "記事が見つかりません"
