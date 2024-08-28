import plist from 'plist';

class Store {
    static get guid() {
        // Tạo một GUID ngẫu nhiên thay vì sử dụng getMAC
        return 'xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = (Math.random() * 16) | 0, v = c === 'x' ? r : (r & 0x3) | 0x8;
            return v.toString(16).toUpperCase();
        });
    }

    static extractAppId(url) {
        const match = url.match(/id(\d+)/);
        return match ? match[1] : null;
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
        const resp = await fetch(url, { method: 'POST', body, headers: this.Headers });
        const parsedResp = plist.parse(await resp.text());
        return { ...parsedResp, _state: parsedResp.failureType ? 'failure' : 'success' };
    }

    static async getLatestAppVersion(appId) {
        const url = `https://itunes.apple.com/lookup?id=${appId}`;
        const resp = await fetch(url);
        const data = await resp.json();

        if (!data.results || data.results.length === 0) {
            throw new Error("Không thể tìm thấy ứng dụng với appId này.");
        }

        return data.results[0].versionExternalId;
    }

    static async download(appIdentifier, appVerId, Cookie) {
        if (appIdentifier.startsWith('http')) {
            appIdentifier = this.extractAppId(appIdentifier);
            if (!appIdentifier) {
                throw new Error("Không thể trích xuất appId từ URL.");
            }
        }

        if (!appVerId) {
            appVerId = await this.getLatestAppVersion(appIdentifier);
        }

        const dataJson = {
            creditDisplay: '',
            guid: this.guid,
            salableAdamId: appIdentifier,
            ...(appVerId && { externalVersionId: appVerId })
        };
        const body = plist.build(dataJson);
        const url = `https://p25-buy.itunes.apple.com/WebObjects/MZFinance.woa/wa/volumeStoreDownloadProduct?guid=${this.guid}`;
        const resp = await fetch(url, {
            method: 'POST',
            body,
            headers: {
                ...this.Headers,
                'X-Dsid': Cookie.dsPersonId,
                'iCloud-DSID': Cookie.dsPersonId,
            }
        });
        const parsedResp = plist.parse(await resp.text());
        return { ...parsedResp, _state: parsedResp.failureType ? 'failure' : 'success' };
    }
}

Store.Headers = {
    'User-Agent': 'Configurator/2.15 (Macintosh; OS X 11.0.0; 16G29) AppleWebKit/2603.3.8',
    'Content-Type': 'application/x-www-form-urlencoded',
};

export { Store };