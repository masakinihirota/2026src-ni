# displayName フィールドの表示用分離設計案

**作成日**: 2026-05-18
**背景**: `displayName` に #番号 識別子が含まれているため、表示層で文字列加工が必要

## 問題点

現在のアーキテクチャ：
```
DB: displayName = "藍の絆の魚座#96"
              ↓ (フロント側で抽出)
UI: "藍の絆の魚座" (ユーティリティで #96 を除去)
```

**課題**:
- フロント側で `extractAnonymousBaseName()` を複数箇所に適用しないといけない
- 見落とした場所ではユーザーに UUID が見える可能性
- API スキーマの責務曖昧化

## 推奨改善案

### Phase 1: API スキーマ分離（推奨）

**新しい構造**:
```typescript
// ProfileOption (API レスポンス)
{
  id: string;
  displayName: string;            // 内部用（#番号付き）"藍の絆の魚座#96"
  displayNameForUI: string;       // UI用（#番号なし）"藍の絆の魚座"
}

// DB クエリ層では両方返す
SELECT
  id,
  display_name,
  CONCAT(display_name, '#', id) AS display_name_for_ui  // または SUBSTRING()
FROM user_profiles
```

**利点**:
- UI側は常に `displayNameForUI` を使用 → 加工不要
- バックエンド責務で一元化 → フロント側の見落とし防止
- 新しいコンポーネント作成時に自動的に正しい値を使用可能

### Phase 2: フロント側統一（現在実施中）

```typescript
// ✅ 既に実装済み
import { extractAnonymousBaseName } from "@/lib/display";

// すべての displayName 表示に適用
{extractAnonymousBaseName(profile.displayName)}
```

**実装状況**:
- ✅ `profile-switcher.tsx` (2026-05-18)
- ⏳ `public-profile-page.tsx`
- ⏳ `profiles-page.tsx`
- ⏳ `profile-warehouse-page.tsx`
- ⏳ `profile-list-management.tsx` など

## 実装順序（推奨）

1. **短期（現在）**: Phase 2 を進める
   - 既存ユーティリティ活用で全ての直接表示を統一
   - 見落とし防止のため grep + regex で全スキャン
   - テストケースを fixture 化

2. **中期（3-6ヶ月後）**: Phase 1 を計画
   - API 設計レビュー
   - `displayNameForUI` フィールド追加
   - マイグレーション（既存クライアント互換性確保）

3. **長期（6ヶ月後以降）**: Phase 1 完全移行
   - 全クライアント・テストを `displayNameForUI` に統一
   - 内部用フィールドは別名（`_id_suffix` など）に変更

## DB マイグレーション例

```sql
-- 新カラム追加（互換性維持）
ALTER TABLE user_profiles ADD COLUMN display_name_for_ui TEXT;

-- 既存データを一括更新
UPDATE user_profiles
SET display_name_for_ui = CONCAT(display_name, '#', id);

-- 今後は INSERT/UPDATE で両方を管理
```

## チェックリスト（実装者向け）

- [ ] **新しい表示箇所** でプロフィール名を表示するときは、必ず `extractAnonymousBaseName()` ユーティリティ経由で取得
- [ ] **既存表示箇所** の見落とし修正は grep で `profile.displayName` / `selectedProfile.displayName` を検索
- [ ] **テスト** で #番号が見えていないか確認
- [ ] **API 改善案** は `.agents/prompts/api-improvements.md` に記録し、バックエンド チームへ展開

## 参考実装

**短期解決策（Phase 2）**:
```typescript
// ✅ 推奨パターン
import { extractAnonymousBaseName } from "@/lib/display";

// 直接表示の場所すべてで統一
<div>{extractAnonymousBaseName(profile.displayName)}</div>

// ❌ 避けるべき
<div>{profile.displayName.split("#")[0]}</div>
<div>{profile.displayName.replace(/#\d+$/, "")}</div>
```

## 関連ファイル

- ユーティリティ: `src/lib/display/anonymous-name-display.ts`
- テスト: `src/lib/display/anonymous-name-display.test.ts`
- 教訓: `.agents/rules/lessons.md` (displayName セクション)
- API ドキュメント（期待）: `src/lib/api/routes/root-accounts.ts`
