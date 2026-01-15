import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

/**
 * カスタムHTMLテンプレート
 * PWAでピンチズームを無効化するためのviewport設定を含む
 */
export default function Root({ children }: PropsWithChildren) {
  const ogTitle = 'GOCHISOKOJI｜麹レシピアプリ';
  const ogDescription = '麹レシピをAIがサポート。手軽においしく、健康的な食卓へ。';
  const ogImage = 'https://www.gochisokoji.com/ogp.png?v=20260115';
  const ogUrl = 'https://www.gochisokoji.com/';

  return (
    <html lang="ja">
      <head>
        <title>{ogTitle}</title>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, minimum-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover"
        />
        <meta name="description" content={ogDescription} />

        {/* PWA設定 */}
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="GOCHISOKOJI" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#BFAB90" />

        {/* OGP / Twitter */}
        <meta property="og:title" content={ogTitle} />
        <meta property="og:description" content={ogDescription} />
        <meta property="og:image" content={ogImage} />
        <meta property="og:url" content={ogUrl} />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="GOCHISOKOJI" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={ogTitle} />
        <meta name="twitter:description" content={ogDescription} />
        <meta name="twitter:image" content={ogImage} />
        
        {/* ズーム無効化CSS */}
        <style dangerouslySetInnerHTML={{ __html: `
          html, body, #root {
            touch-action: manipulation;
            -webkit-text-size-adjust: 100%;
            -ms-text-size-adjust: 100%;
            height: 100%;
            overflow: hidden;
            position: fixed;
            width: 100%;
          }
          body {
            -webkit-touch-callout: none;
            -webkit-user-select: none;
            user-select: none;
          }
          input, textarea {
            -webkit-user-select: auto;
            user-select: auto;
          }
        `}} />

        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
