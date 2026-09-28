"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";

const plausibleDomain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;
const metaPixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;

/**
 * The Meta Pixel (ad measurement) loads only on public pages and the Plus page,
 * never on the private money screens. It sends a page view on load and our own
 * signup / trial events; automatic page-change and button tracking are off.
 * Plausible is cookieless and keeps no personal data.
 */
function pixelAllowed(path: string): boolean {
  return !path.startsWith("/app") || path === "/app/plus";
}

export function AnalyticsScripts() {
  const path = usePathname() ?? "/";
  return (
    <>
      {plausibleDomain && (
        <Script
          defer
          data-domain={plausibleDomain}
          src="https://plausible.io/js/script.tagged-events.pageview-props.js"
          strategy="afterInteractive"
        />
      )}
      {metaPixelId && pixelAllowed(path) && (
        <Script id="meta-pixel" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq.disablePushState=true;fbq('set','autoConfig',false,'${metaPixelId}');fbq('init','${metaPixelId}');fbq('track','PageView');`}
        </Script>
      )}
    </>
  );
}
