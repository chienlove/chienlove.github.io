console.log("client.js is being loaded");

import { build, parse } from './plist-worker.js';

export class Store {
    static get guid() {
        return 'XXXXXXXXXXXXXXXX'.replace(/X/g, () => Math.floor(Math.random() * 16).toString(16));
    }

static async authenticate(email, password, mfa) {
    console.log("authenticate method called with:", { email, passwordLength: password?.length, mfa: !!mfa });
    const dataJson = {
        appleId: email,
        attempt: mfa ? 2 : 4,
        createSession: 'true',
        guid: this.guid,
        password: `${password}${mfa || ''}`,
        rmp: 0,
        why: 'signIn',
    };
    const body = build(dataJson);
    const url = `https://auth.itunes.apple.com/auth/v1/native/fast?guid=${this.guid}`;
    
    try {
        console.log("Sending authentication request to:", url);
        console.log("Request headers:", JSON.stringify(this.Headers));
        console.log("Request body:", body);
        
        const resp = await fetch(url, {
            method: 'POST', 
            body, 
            headers: this.Headers
        });
        
        console.log("Authentication response status:", resp.status);
        const responseText = await resp.text();
        console.log("Raw response text:", responseText); // Ghi nhật ký phản hồi thô

        if (!resp.ok) {
            console.error("Server returned non-200 status code:", resp.status);
            throw new Error(`Server returned status ${resp.status}: ${responseText}`);
        }
        
        if (!responseText.trim()) {
            throw new Error("Empty response from authentication server");
        }
        
        let parsedResp;
        try {
            parsedResp = parse(responseText);
            console.log("Parsed authentication response:", JSON.stringify(parsedResp, null, 2));
        } catch (parseError) {
            console.error("Error parsing response:", parseError);
            throw new Error(`Failed to parse authentication response: ${parseError.message}`);
        }
        
        if (!parsedResp || typeof parsedResp !== 'object' || Object.keys(parsedResp).length === 0) {
            throw new Error("Authentication response is invalid or empty");
        }
        
        return {
            ...parsedResp, 
            _state: parsedResp.failureType ? 'failure' : 'success'
        };
    } catch (error) {
        console.error("Authentication error:", error);
        throw new Error(`Authentication failed: ${error.message}`);
    }
}

    static Headers = {
        'User-Agent': 'Configurator/2.15 (Macintosh; OS X 11.0.0; 16G29) AppleWebKit/2603.3.8',
        'Content-Type': 'application/x-www-form-urlencoded',
    };
}

console.log("client.js has been loaded, Store object:", Store);