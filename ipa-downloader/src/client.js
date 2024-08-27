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
            guid: Store.guid,
            password: `${password}${mfa ?? ''}`,
            rmp: 0,
            why: 'signIn',
        };
        const body = build(dataJson);
        const url = `https://auth.itunes.apple.com/auth/v1/native/fast?guid=${Store.guid}`;
        try {
            console.log("Sending authentication request to:", url);
            console.log("Request headers:", JSON.stringify(Store.Headers));
            console.log("Request body:", body);

            const resp = await fetch(url, {
                method: 'POST', 
                body, 
                headers: Store.Headers
            });
            
            console.log("Authentication response status:", resp.status);
            const responseText = await resp.text();
            console.log("Authentication response text:", responseText);

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

    static async download(appIdentifier, appVerId, Cookie) {
        console.log("download method called with:", { appIdentifier, appVerId, Cookie });
        if (!appVerId) {
            throw new Error("appVerId is undefined");
        }
        const dataJson = {
            creditDisplay: '',
            guid: Store.guid,
            salableAdamId: appIdentifier,
            externalVersionId: appVerId
        };
        const body = build(dataJson);
        const url = `https://p25-buy.itunes.apple.com/WebObjects/MZFinance.woa/wa/volumeStoreDownloadProduct?guid=${Store.guid}`;
        try {
            console.log("Sending download request to:", url);
            console.log("Download request body:", body);
            const resp = await fetch(url, {
                method: 'POST', 
                body,
                headers: {...Store.Headers, 'X-Dsid': Cookie.dsPersonId, 'iCloud-DSID': Cookie.dsPersonId}
            });
            console.log("Download response status:", resp.status);
            if (resp.status !== 200) {
                console.error("Server returned non-200 status code:", resp.status);
                const errorText = await resp.text();
                console.error("Error response from server:", errorText);
                throw new Error(`Server returned status ${resp.status}: ${errorText}`);
            }
            const responseText = await resp.text();
            console.log("Download response text:", responseText);
            
            if (!responseText.trim()) {
                throw new Error("Empty response from download server");
            }
            
            let parsedResp;
            try {
                parsedResp = parse(responseText);
                console.log("Parsed download response:", JSON.stringify(parsedResp, null, 2));
            } catch (parseError) {
                console.error("Error parsing download response:", parseError);
                throw new Error(`Failed to parse download response: ${parseError.message}`);
            }
            
            if (!parsedResp) {
                throw new Error("Download response is empty or invalid");
            }
            
            return {
                ...parsedResp, 
                _state: parsedResp.failureType ? 'failure' : 'success'
            };
        } catch (error) {
            console.error("Download error:", error);
            throw new Error(`Download failed: ${error.message}`);
        }
    }

    static Headers = {
        'User-Agent': 'Configurator/2.15 (Macintosh; OS X 11.0.0; 16G29) AppleWebKit/2603.3.8',
        'Content-Type': 'application/x-www-form-urlencoded',
    };
}

console.log("client.js has been loaded, Store object:", Store);