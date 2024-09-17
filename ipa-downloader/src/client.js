import { build, parse } from './plist-worker.js';

export class Store {
    static get guid() {
        return 'XXXXXXXXXXXXXXXX'.replace(/X/g, () => Math.floor(Math.random() * 16).toString(16));
    }

    static async authenticate(email, password, mfa) {
        console.log("Bắt đầu xác thực với:", { email, passwordLength: password?.length, mfa: !!mfa });
        const dataJson = {
            accountName: email,
            password: password,
            rememberMe: true,
            trustTokens: []
        };
        const body = JSON.stringify(dataJson);
        const url = `https://idmsa.apple.com/appleauth/auth/signin`;

        try {
            console.log("Gửi yêu cầu xác thực đến:", url);
            console.log("Headers của yêu cầu:", JSON.stringify(this.Headers));
            console.log("Body của yêu cầu:", body);

            const resp = await fetch(url, {
                method: 'POST', 
                body, 
                headers: {
                    ...this.Headers,
                    'X-Apple-ID-Session-Id': this.generateSessionId(),
                    'X-Apple-Widget-Key': this.generateWidgetKey()
                }
            });

            console.log("Trạng thái phản hồi xác thực:", resp.status);
            
            if (resp.status === 409) {
                const scnt = resp.headers.get('scnt');
                const xAppleSessionToken = resp.headers.get('x-apple-session-token');
                return { needsMFA: true, scnt, xAppleSessionToken };
            }

            const responseText = await resp.text();
            console.log("Nội dung phản hồi thô:", responseText);

            if (!resp.ok) {
                console.error("Máy chủ trả về mã trạng thái không phải 200:", resp.status);
                throw new Error(`Máy chủ trả về trạng thái ${resp.status}: ${responseText}`);
            }

            let parsedResp;
            try {
                parsedResp = JSON.parse(responseText);
            } catch (parseError) {
                console.error("Lỗi khi phân tích phản hồi:", parseError);
                console.log("Nội dung phản hồi gây lỗi:", responseText);
                throw new Error(`Không thể phân tích phản hồi xác thực: ${parseError.message}`);
            }

            console.log("Phản hồi xác thực đã được phân tích:", JSON.stringify(parsedResp, null, 2));

            if (parsedResp.authType === "hsa2") {
                return { needsMFA: true, authType: parsedResp.authType };
            }

            if (parsedResp.serviceErrors || parsedResp.hasError) {
                return {
                    error: parsedResp.serviceErrors?.[0]?.message || "Xác thực thất bại",
                    details: parsedResp,
                    _state: 'failure'
                };
            }

            return {
                ...parsedResp, 
                _state: 'success'
            };
        } catch (error) {
            console.error("Lỗi xác thực:", error);
            throw new Error(`Xác thực thất bại: ${error.message}`);
        }
    }

    static async handleMFA(email, code, scnt, xAppleSessionToken) {
        const url = 'https://idmsa.apple.com/appleauth/auth/verify/trusteddevice/securitycode';
        const headers = {
            ...this.Headers,
            'scnt': scnt,
            'X-Apple-ID-Session-Id': xAppleSessionToken,
        };
        const body = JSON.stringify({ securityCode: { code } });

        const resp = await fetch(url, { method: 'POST', headers, body });
        
        if (resp.status === 204) {
            // MFA successful, proceed with signin
            return this.authenticate(email, null, true);
        } else {
            const responseText = await resp.text();
            throw new Error(`MFA failed: ${resp.status} ${responseText}`);
        }
    }

    static async download(appId, appVerId, user) {
        // Phương thức download giữ nguyên như cũ
    }

    static Headers = {
        'User-Agent': 'iTunes/12.12.4 (Macintosh; OS X 10.15.7) AppleWebKit/537.36 (KHTML, like Gecko)',
        'Content-Type': 'application/json',
        'X-Apple-Store-Front': '143441-19,32',
        'X-Apple-I-MD-M': Store.guid,
        'Accept': 'application/json, text/javascript',
        'Accept-Language': 'en-US,en;q=0.9',
        'Connection': 'keep-alive',
        'X-Apple-I-MD': Store.generateAppleIMD(),
        'X-Apple-I-MD-RINFO': '17106176',
        'X-Requested-With': 'XMLHttpRequest',
        'Origin': 'https://idmsa.apple.com',
        'Referer': 'https://idmsa.apple.com/',
    };

    static generateSessionId() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    static generateWidgetKey() {
        return '83545bf919730e51dbfba24e7e8a78d2';
    }

    static generateAppleIMD() {
        return btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))));
    }
}

console.log("client.js đã được tải, đối tượng Store:", Store);