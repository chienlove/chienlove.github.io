import React from "react";

export default function Adsterra300x250() {
 Adsterra (tránh useEffect với document.write)
  return (
    <div
      className="w-full flex justify-center"
      suppressHydrationWarning
    >
      <script
        dangerouslySetInnerHTML={{
          __html: `
            atOptions = {
              'key' : '8364c9f21c2692159fe80054178f5488',
              'format' : 'iframe',
              'height' : 250,
              'width' : 300,
              'params' : {}
            };
          `,
        }}
      />
      <script src="https://www.highperformanceformat.com/8364c9f21c2692159fe80054178f5488/invoke.js"></script>
    </div>
  );
}