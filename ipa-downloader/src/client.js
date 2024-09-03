import { build, parse } from './plist-worker.js';

export class Store {
    static get guid() {
        return 'XXXXXXXXXXXXXXXX'.replace(/X/g, () => Math.floor(Math.random() * 16).toString(16));
    }

    static async authenticate(email, password, mfa) {
        console.log("Bắt đầu xác thực với:", { email, passwordLength: password?.length, mfa: !!mfa });
        const dataJson = {
            appleId: email,
            attempt: mfa ? 2 : 1,
            createSession: 'true',
            guid: this.guid,
            password: mfa ? mfa : password,
            rmp: 0,
            why: 'signIn',
        };
        const body = build(dataJson);
        const url = `https://p25-buy.itunes.apple.com/WebObjects/MZFinance.woa/wa/authenticate?guid=${this.guid}`;

        try {
            console.log("Gửi yêu cầu xác thực đến:", url);
            console.log("Headers của yêu cầu:", JSON.stringify(this.Headers));
            console.log("Body của yêu cầu:", body);

            const resp = await fetch(url, {
                method: 'POST', 
                body, 
                headers: this.Headers
            });

            console.log("Trạng thái phản hồi xác thực:", resp.status);
            const responseText = await resp.text();
            console.log("Nội dung phản hồi thô:", responseText);

            if (!resp.ok) {
                console.error("Máy chủ trả về mã trạng thái không phải 200:", resp.status);
                throw new Error(`Máy chủ trả về trạng thái ${resp.status}: ${responseText}`);
            }

            if (!responseText.trim()) {
                throw new Error("Phản hồi từ máy chủ xác thực trống");
            }

            let parsedResp;
            try {
                parsedResp = parse(responseText);
            } catch (parseError) {
                console.error("Lỗi khi phân tích phản hồi:", parseError);
                console.log("Nội dung phản hồi gây lỗi:", responseText);
                throw new Error(`Không thể phân tích phản hồi xác thực: ${parseError.message}`);
            }

            console.log("Phản hồi xác thực đã được phân tích:", JSON.stringify(parsedResp, null, 2));

            if (!parsedResp || typeof parsedResp !== 'object') {
                console.error("Phản hồi đã phân tích không hợp lệ:", parsedResp);
                throw new Error("Phản hồi xác thực không hợp lệ");
            }

            if (parsedResp.m) {
                return { needsMFA: true, mfaType: parsedResp.m };
            }

            if (parsedResp.customerMessage || parsedResp.failureType) {
                return {
                    error: parsedResp.customerMessage || "Xác thực thất bại",
                    details: parsedResp,
                    _state: 'failure'
                };
            }

            // Kiểm tra các trường dữ liệu cần thiết
            const requiredFields = ['passwordToken', 'dsPersonId'];
            for (const field of requiredFields) {
                if (!parsedResp[field]) {
                    throw new Error(`Phản hồi xác thực thiếu trường dữ liệu cần thiết: ${field}`);
                }
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

    static async download(appId, appVerId, user) {
        // Phương thức download giữ nguyên như cũ
    }

    static Headers = {
        'User-Agent': 'Configurator/2.15 (Macintosh; OS X 11.0.0; 16G29) AppleWebKit/2603.3.8',
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-Apple-Store-Front': '143441-19,32',
        'X-Apple-I-MD-M': Store.guid,
        'Accept': 'application/xml',
        'Accept-Language': 'en-us',
        'Connection': 'keep-alive'
    };
}

console.log("client.js đã được tải, đối tượng Store:", Store);