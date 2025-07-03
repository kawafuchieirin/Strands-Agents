# Strands-Agents

Strands Agents – オープンソース AI エージェント

## 概要

Strands-Agentsは、複数の自律的なAIエージェントが協調して作業を行うマルチエージェントシステムです。各エージェントは特定のタスクに特化し、メッセージパッシングによって連携します。

## 主な機能

- **マルチエージェントアーキテクチャ**: 複数のエージェントが並列で動作
- **タスク管理システム**: 優先度ベースのタスクキューと依存関係管理
- **メッセージングシステム**: エージェント間の非同期通信
- **REST API**: エージェントとタスクの管理API
- **拡張可能**: カスタムエージェントの簡単な追加

## アーキテクチャ

```
┌─────────────────────────────────────────────┐
│            フロントエンド (React)             │
├─────────────────────────────────────────────┤
│             API Gateway (Express)            │
├─────────────────────────────────────────────┤
│            エージェント管理層                 │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐     │
│  │Agent A  │ │Agent B  │ │Agent C  │ ...  │
│  └─────────┘ └─────────┘ └─────────┘     │
├─────────────────────────────────────────────┤
│          メッセージブローカー                 │
│              (EventEmitter)                  │
├─────────────────────────────────────────────┤
│          データストレージ層                   │
│     (Redis/PostgreSQL/VectorDB)             │
└─────────────────────────────────────────────┘
```

## インストール

```bash
# リポジトリのクローン
git clone https://github.com/yourusername/strands-agents.git
cd strands-agents

# 依存関係のインストール
npm install

# 環境変数の設定
cp .env.example .env
```

## 使用方法

### 開発モード

```bash
# 開発サーバーの起動
npm run dev
```

### 本番環境

```bash
# ビルド
npm run build

# 本番サーバーの起動
npm start
```

### Dockerを使用

```bash
# Dockerイメージのビルドと起動
docker-compose up
```

## API エンドポイント

### エージェント管理

- `GET /api/agents` - 全エージェントの取得
- `GET /api/agents/:id` - 特定エージェントの取得
- `POST /api/agents/register` - エージェントの登録
- `DELETE /api/agents/:id` - エージェントの削除
- `GET /api/agents/:id/status` - エージェントステータスの取得

### タスク管理

- `POST /api/tasks` - タスクの作成
- `GET /api/tasks` - タスクの取得
- `GET /api/tasks/:id` - 特定タスクの取得
- `PATCH /api/tasks/:id/status` - タスクステータスの更新
- `GET /api/tasks/metrics` - タスクメトリクスの取得

## エージェントの種類

### 実装済みエージェント

1. **CoordinatorAgent**: タスクの分配と管理
2. **TextProcessorAgent**: テキスト処理（抽出、要約、分析）
3. **DataTransformAgent**: データ変換（フィルタリング、マッピング、集計）

### カスタムエージェントの作成

```typescript
import { Agent } from './agents/base';

export class CustomAgent extends Agent {
  protected async onInitialize(): Promise<void> {
    // 初期化処理
  }

  protected async onExecute(task: Task): Promise<unknown> {
    // タスク実行処理
  }

  protected async onMessage(message: Message): Promise<void> {
    // メッセージ処理
  }

  protected async onTerminate(): Promise<void> {
    // 終了処理
  }
}
```

## 開発

### テスト

```bash
# テストの実行
npm test

# カバレッジ付きテスト
npm run test:coverage
```

### コード品質

```bash
# ESLintの実行
npm run lint

# TypeScriptの型チェック
npm run typecheck
```

## ライセンス

MIT License
