import React from 'react';
import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html lang="en-IN" className="dark">
      <Head>
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0A0A0A" />
        <meta name="application-name" content="The Humours Hub" />
        
        {/* Preconnect & DNS-Prefetch for faster external resource loading */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://checkout.razorpay.com" />
        <link rel="dns-prefetch" href="https://api.razorpay.com" />
        {/* Non-blocking font load with display=swap to avoid FOIT */}
        <link
          rel="preload"
          as="style"
          href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;1,9..40,400&family=Hind:wght@400;600;700&display=swap"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;1,9..40,400&family=Hind:wght@400;600;700&display=swap"
          rel="stylesheet"
        />
        {/* Material Symbols — load non-blocking */}
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@400,0..1&display=swap"
          rel="stylesheet"
        />
      </Head>
      <body className="font-body-md antialiased overflow-x-hidden">
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
