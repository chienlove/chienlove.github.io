const fetch = require('node-fetch');

exports.handler = async (event, context) => {
    try {
        const data = new URLSearchParams(event.body);
        const fileUrl = data.get('file'); // URL của tệp tải lên

        const payload = {
            event_type: 'upload',
            client_payload: {
                file_url: fileUrl,
                release_tag: data.get('release_tag'),
                release_name: data.get('release_name'),
                release_notes: data.get('release_notes')
            }
        };

        const response = await fetch(`https://api.github.com/repos/chienlove/chienlove.github.io/dispatches`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `token ${process.env.GITHUB_TOKEN}`
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorResponse = await response.text();
            console.error('Error response from GitHub:', errorResponse);
            return {
                statusCode: response.status,
                body: JSON.stringify({ error: errorResponse })
            };
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Webhook triggered', file_url: fileUrl })
        };
    } catch (error) {
        console.error('Error in Netlify Function:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Internal Server Error' })
        };
    }
};