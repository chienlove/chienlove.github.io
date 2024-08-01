import { plist } from 'plist';

export class Store {
    static get guid() {
        // Trong môi trường Cloudflare Worker, chúng ta không thể sử dụng getmac
        // Thay vào đó, chúng ta sẽ tạo một GUID giả
        return 'XXXXXXXXXXXXXXXX'.replace(/X/g, () => Math.floor(Math.random() * 16).toString(16));
    }

    static async authenticate(email, password, mfa) {
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
        const resp = await fetch(url, {
            method: 'POST', 
            body, 
            headers: this.Headers
        });
        const parsedResp = plist.parse(await resp.text());
        return {...parsedResp, _state: parsedResp.failureType ? 'failure' : 'success'};
    }

    static async download(appIdentifier, appVerId, Cookie) {
        const dataJson = {
            creditDisplay: '',
            guid: this.guid,
            salableAdamId: appIdentifier,
            ...(appVerId && {externalVersionId: appVerId})
        };
        const body = plist.build(dataJson);
        const url = `https://p25-buy.itunes.apple.com/WebObjects/MZFinance.woa/wa/volumeStoreDownloadProduct?guid=${this.guid}`;
        const resp = await fetch(url, {
            method: 'POST', 
            body,
            headers: {...this.Headers, 'X-Dsid': Cookie.dsPersonId, 'iCloud-DSID': Cookie.dsPersonId}
        });
        const parsedResp = plist.parse(await resp.text());
        return {...parsedResp, _state: parsedResp.failureType ? 'failure' : 'success'};
    }

    static Headers = {
        'User-Agent': 'Configurator/2.15 (Macintosh; OS X 11.0.0; 16G29) AppleWebKit/2603.3.8',
        'Content-Type': 'application/x-www-form-urlencoded',
    };
}