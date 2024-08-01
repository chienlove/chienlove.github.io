import { build, parse } from './plist-worker.js';

export class Store {
    static get guid() {
        return 'XXXXXXXXXXXXXXXX'.replace(/X/g, () => Math.floor(Math.random() * 16).toString(16));
    }

    

    static async download(appIdentifier, appVerId, Cookie) {
        console.log("Downloading app...");
        if (!appVerId) {
            throw new Error("appVerId is undefined");
        }
        const dataJson = {
            creditDisplay: '',
            guid: this.guid,
            salableAdamId: appIdentifier,
            externalVersionId: appVerId
        };
        const body = build(dataJson);
        const url = `https://p25-buy.itunes.apple.com/WebObjects/MZFinance.woa/wa/volumeStoreDownloadProduct?guid=${this.guid}`;
        try {
            console.log("Sending download request to:", url);
            console.log("Download request body:", body);
            const resp = await fetch(url, {
                method: 'POST', 
                body,
                headers: {...this.Headers, 'X-Dsid': Cookie.dsPersonId, 'iCloud-DSID': Cookie.dsPersonId}
            });
            console.log("Download response status:", resp.status);
            const responseText = await resp.text();
            console.log("Download response text:", responseText);
            
            if (!responseText.trim()) {
                throw new Error("Empty response from download server");
            }
            
            let parsedResp;
            try {
                parsedResp = parse(responseText);
            } catch (parseError) {
                console.error("Error parsing download response:", parseError);
                throw new Error(`Failed to parse download response: ${parseError.message}`);
            }
            
            console.log("Parsed download response:", parsedResp);
            
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