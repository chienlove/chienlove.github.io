import { build, parse } from './plist-worker.js';

export class Store {
    static get guid() {
        return 'XXXXXXXXXXXXXXXX'.replace(/X/g, () => Math.floor(Math.random() * 16).toString(16));
    }

    static async authenticate(email, password, mfa) {
        console.log("Bắt đầu xác thực với:", { email, passwordLength: password?.length, mfa: !!mfa });
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
                console.log("Phản hồi xác thực đã được phân tích:", JSON.stringify(parsedResp, null, 2));
            } catch (parseError) {
                console.error("Lỗi khi phân tích phản hồi:", parseError);
                throw new Error(`Không thể phân tích phản hồi xác thực: ${parseError.message}`);
            }

            if (!parsedResp || typeof parsedResp !== 'object' || Object.keys(parsedResp).length === 0) {
                throw new Error("Phản hồi xác thực không hợp lệ hoặc trống");
            }

            return {
                ...parsedResp, 
                _state: parsedResp.failureType ? 'failure' : 'success'
            };
        } catch (error) {
            console.error("Lỗi xác thực:", error);
            throw new Error(`Xác thực thất bại: ${error.message}`);
        }
    }

    static Headers = {
        'User-Agent': 'Configurator/2.15 (Macintosh; OS X 11.0.0; 16G29) AppleWebKit/2603.3.8',
        'Content-Type': 'application/x-www-form-urlencoded',
    };
}

console.log("client.js đã được tải, đối tượng Store:", Store);