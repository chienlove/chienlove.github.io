exports.handler = async function(event, context) {
     const code = event.queryStringParameters.code;
     
     return {
       statusCode: 200,
       headers: {
         "Content-Type": "text/html",
         "Access-Control-Allow-Origin": "*" // Thêm header CORS
       },
       body: `
         <html>
           <body>
             <script>
               if (window.opener) {
                 window.opener.postMessage({ type: 'oauth', code: '${code}' }, '*');
                 window.close();
               } else {
                 document.body.innerHTML = 'Authentication successful. You can close this window.';
               }
             </script>
           </body>
         </html>
       `
     };
   };