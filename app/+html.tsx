import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

/**
 * カスタムHTMLテンプレート
 * PWAでピンチズームを無効化するためのviewport設定を含む
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="ja">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, minimum-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover"
        />

        {/* PWA設定 */}
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="GOCHISOKOJI" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#BFAB90" />
        
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
