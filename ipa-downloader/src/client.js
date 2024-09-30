export class Store {
    static generateGuid() {
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
            const resp = await fetch(url, {
                method: 'POST', 
                body, 
                headers: {
                    ...this.getHeaders(),
                    'X-Apple-ID-Session-Id': this.generateSessionId(),
                    'X-Apple-Widget-Key': this.generateWidgetKey()
                }
            });

            // Rest of the authenticate method remains the same
            // ...
        } catch (error) {
            console.error("Lỗi xác thực:", error);
            throw error;
        }
    }

    // Other methods remain the same
    // ...

    static getHeaders() {
        return {
            'User-Agent': 'iTunes/12.12.4 (iPhone; iOS 15.0; Scale/3.00)',
            'Content-Type': 'application/json',
            'X-Apple-Store-Front': '143441-19,32',
            'X-Apple-I-MD-M': this.generateGuid(),
            'Accept': 'application/json',
            'Accept-Language': 'en-us',
            'Connection': 'keep-alive',
            'X-Apple-I-MD': this.generateAppleIMD(),
            'X-Apple-I-MD-RINFO': '17106176',
            'X-Requested-With': 'XMLHttpRequest',
            'Origin': 'https://idmsa.apple.com',
            'Referer': 'https://idmsa.apple.com/',
            'X-Apple-Widget-Key': this.generateWidgetKey(),
            'X-Apple-I-FD-Client-Info': JSON.stringify({
                'U': 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
                'L': 'en-US',
                'Z': 'GMT+07:00',
                'V': '1.1',
                'F': ''
            })
        };
    }

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
        const array = new Uint8Array(32);
        for (let i = 0; i < 32; i++) {
            array[i] = Math.floor(Math.random() * 256);
        }
        return btoa(String.fromCharCode.apply(null, array));
    }
}