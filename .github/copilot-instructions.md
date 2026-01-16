# Copilot instructions for AI coding agents

短い概要
- 現在このリポジトリにはソースファイルや既存のエージェント指示ファイルが見つかりませんでした。まずリポジトリ構造を探索し、実際に存在する言語・ツールを把握してから作業を始めてください。

優先すべき最初の手順
- ルートでファイル一覧（隠しファイル含む）を確認する: `ls -la` / `git status`
- 技術検出のために次のファイルを探す（存在したらその内容が最優先）：
  - `README.md`, `package.json`, `pyproject.toml`, `requirements.txt`, `Podfile`, `build.gradle`, `Dockerfile`, `.github/workflows/*`
  - ソースディレクトリ候補: `src/`, `app/`, `android/`, `ios/`, `server/`, `backend/`

アーキテクチャを素早く把握する方法
- `README.md` と `package.json` の `scripts`、`Dockerfile`、CIワークフローをまず読む。これらが「どう動くか」「CIで何が実行されているか」を示す最も確実な手がかりです。
- 大きなコンポーネント境界を特定する際は、ディレクトリ名（`android/` vs `server/` 等）、APIクライアント／サーバ実装、設定ファイル（`config/`, `env` 系）を探してください。

プロジェクト固有のワークフロー（発見時に優先実行するコマンド）
- Node.js: `npm ci` または `yarn install` → `npm test` を確認。`package.json` の `scripts` を優先。
- Python: 仮想環境を作り `pip install -r requirements.txt` → `pytest` を実行。
- iOS: `pod install` を実行してから Xcode ビルド（`xcodebuild`）を使う。ワークスペース/ターゲット名を `xcworkspace` から取得。
- Android: `./gradlew assembleDebug` または `./gradlew test`。
- Docker/CICD: `.github/workflows` や `Dockerfile` を確認し、CIで使われるコマンドに従う。
- 実行前に必ず該当ツールが存在するかをチェックし（例: `which node`, `which python3`, `./gradlew` の有無）、ローカルで修正せずにCIのやり方を優先すること。

プロジェクト特有の慣習を見つける手順
- リント/フォーマット設定を探す: `.eslintrc`, `prettierrc`, `pyproject.toml` の設定に従う。
- 環境変数や外部サービスの接続情報は `.env`, `config/*.yml`, `config/*.json` にあるか確認。実行時に環境を汚さないよう、機密はローカルにハードコーディングしない。

統合ポイントと外部依存
- `package.json`, `requirements.txt`, `Podfile`, `build.gradle`, `Dockerfile` の依存を読み、外部APIのエンドポイントや必須環境変数を `README.md` または `config` ファイルから抽出する。

既存の `.github/copilot-instructions.md` がある場合のマージルール
- 既存ファイルの先頭セクションは保持し、当ファイルからの追記は「AI agent additions」セクションとして末尾に付ける。
- 元コンテンツの語調や命令スタイルを壊さないこと。

注意点（このリポジトリに固有）
- 現在、リポジトリのルートが空のため、まずは上の「優先すべき最初の手順」に従って環境を検出してください。

最後に
- このファイルは短く、実行可能な手順に集中しています。不明点や追加してほしい検出ルール（例: モノレポ構造、モバイル／バックエンドの判断基準）があれば教えてください。

----
署名: AI エージェント補助用テンプレート
