'use client';

import Script from 'next/script';

const META_APP_ID = process.env.NEXT_PUBLIC_META_APP_ID || '';

export default function FacebookSDK() {
  if (!META_APP_ID) return null;

  return (
    <Script
      src="https://connect.facebook.net/en_US/sdk.js"
      strategy="afterInteractive"
      onLoad={() => {
        window.FB?.init({
          appId: META_APP_ID,
          autoLogAppEvents: true,
          cookie: true,
          xfbml: true,
          version: 'v25.0',
        });
      }}
    />
  );
}
