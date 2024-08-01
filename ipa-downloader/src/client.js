import plist from 'plist';

export class Store {
    static get guid() {
        return 'XXXXXXXXXXXXXXXX'.replace(/X/g, () => Math.floor(Math.random() * 16).toString(16));
    }

    static async authenticate(email, password, mfa) {
        console.log("Authenticating...");
        const dataJson = {
            appleId: email,
            attempt: mfa ? 2 : 4,
            createSession: 'true',
            guid: this.guid,
            password: `${password}${mfa ?? ''}`,
            rmp: 0,
            why: 'signIn',
        };
        const body = plist.build(dataJson);
        const url = `https://auth.itunes.apple.com/auth/v1/native/fast?guid=${this.guid}`;
        try {
            const resp = await fetch(url, {
                method: 'POST', 
                body, 
                headers: this.Headers
            });
            const responseText = await resp.text();
            const parsedResp = plist.parse(responseText);
            console.log("Authentication response:", parsedResp);
            return {...parsedResp, _state: parsedResp.failureType ? 'failure' : 'success'};
        } catch (error) {
            console.error("Authentication error:", error);
            throw error;
        }
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
        const body = plist.build(dataJson);
        const url = `https://p25-buy.itunes.apple.com/WebObjects/MZFinance.woa/wa/volumeStoreDownloadProduct?guid=${this.guid}`;
        try {
            const resp = await fetch(url, {
                method: 'POST', 
                body,
                headers: {...this.Headers, 'X-Dsid': Cookie.dsPersonId, 'iCloud-DSID': Cookie.dsPersonId}
            });
            const responseText = await resp.text();
            const parsedResp = plist.parse(responseText);
            console.log("Download response:", parsedResp);
            return {...parsedResp, _state: parsedResp.failureType ? 'failure' : 'success'};
        } catch (error) {
            console.error("Download error:", error);
            throw error;
        }
    }

    static Headers = {
        'User-Agent': 'Configurator/2.15 (Macintosh; OS X 11.0.0; 16G29) AppleWebKit/2603.3.8',
        'Content-Type': 'application/x-www-form-urlencoded',
    };
}