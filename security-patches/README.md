# 未公開修正のローカルバックポート候補

braces 3.0.3（両案件）とnode-forge 1.4.0（Expoのみ）の既知問題に対する検証用候補です。公式修正版ではありません。本番への適用は行っていません。

- braces: https://github.com/micromatch/braces/pull/72 （未マージでクローズ）
- node-forge: https://github.com/digitalbazaar/forge/pull/1152 （未マージ）
- 版番号、dependencies/devDependencies分類、npm監査対象は変更しません。監査の警告件数は残ります。
- 上流PRのruntime差分だけを既存npm版へ適用しました。公開PRブランチ全体にあった無関係な変更は含めません。
- manifest.jsonに元ファイルと修正後のSHA-256、公開PRのコミットを固定しています。*.js.txtは修正後のファイル内容を保存したテキストです。

通常のnpm install/ciはpostinstallで修正を適用します。--ignore-scriptsを使う環境は、使用前に `npm run security:patch` を実行してください。`npm run security:verify` は、未適用・想定外の版・改変されたファイルを失敗させます。npm runの主コマンド先頭で検証するため、ignore-scripts=trueでも未適用なら起動を中止します。Expoはstart/android/ios/web/build:web/lint、Referralはdev/dev:safe/build/start/lintが対象です。lockにない修正対象や本番必須依存の未導入も拒否します。lockでdev:trueまたはoptional:trueの依存だけは未導入を許可します。

bracesは100段を超える入れ子を拒否する動作変更があります。node-forgeはNodeのlib/rsa.js経路が対象です。Expoのネイティブビルド・実機・ストア配布の検証は含みません。公式修正版公開時にこの暫定処置を削除し、公式版へ更新して再検証してください。
