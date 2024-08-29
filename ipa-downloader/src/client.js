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
        password: `${password}${mfa ?? ''}`,
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
            // Thử phân tích như JSON trước
            parsedResp = JSON.parse(responseText);
        } catch (jsonError) {
            console.log("Không thể phân tích phản hồi như JSON, thử phân tích bằng hàm parse tùy chỉnh");
            try {
                parsedResp = parse(responseText);
            } catch (parseError) {
                console.error("Lỗi khi phân tích phản hồi:", parseError);
                console.log("Nội dung phản hồi gây lỗi:", responseText);
                throw new Error(`Không thể phân tích phản hồi xác thực: ${parseError.message}`);
            }
        }

        console.log("Phản hồi xác thực đã được phân tích:", JSON.stringify(parsedResp, null, 2));

        if (!parsedResp || typeof parsedResp !== 'object') {
            console.error("Phản hồi đã phân tích không hợp lệ:", parsedResp);
            throw new Error("Phản hồi xác thực không hợp lệ");
        }

        if (parsedResp.failureType || parsedResp.errorMessage) {
            return {
                error: parsedResp.errorMessage || "Xác thực thất bại",
                details: parsedResp,
                _state: 'failure'
            };
        }

        // Kiểm tra các trường dữ liệu cần thiết
        const requiredFields = ['v', 'r', 's'];
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
        console.log("Bắt đầu tải xuống với:", { appId, appVerId });
        const url = `https://p27-buy.itunes.apple.com/WebObjects/MZBuy.woa/wa/buyProduct?guid=${this.guid}`;
        const dataJson = {
            appExtVrsId: appVerId,
            buyAndDownload: "",
            guid: this.guid,
            hasAskedToFulfillPreorder: "true",
            isInApp: "true",
            kbsync: user.s,
            machineName: "iPhone",
            mediaSignature: user.r,
            mtApp: "",
            mtClientId: "",
            mtEventTime: Date.now(),
            mtPageId: "",
            mtPageType: "",
            needDiv: "",
            origPage: "",
            origPageStatus: "",
            origPageTimestamp: "",
            price: "0",
            pricingParameters: "STDQ",
            productType: "C",
            salableAdamId: appId,
            sbsync: user.v,
            signedRedownloadAttrs: "",
        };
        const body = build(dataJson);

        try {
            console.log("Gửi yêu cầu tải xuống đến:", url);
            console.log("Headers của yêu cầu:", JSON.stringify(this.Headers));
            console.log("Body của yêu cầu:", body);

            const resp = await fetch(url, {
                method: 'POST',
                body,
                headers: this.Headers,
            });

            console.log("Trạng thái phản hồi tải xuống:", resp.status);
            const responseText = await resp.text();
            console.log("Nội dung phản hồi thô:", responseText);

            if (!resp.ok) {
                console.error("Máy chủ trả về mã trạng thái không phải 200:", resp.status);
                throw new Error(`Máy chủ trả về trạng thái ${resp.status}: ${responseText}`);
            }

            if (!responseText.trim()) {
                throw new Error("Phản hồi từ máy chủ tải xuống trống");
            }

            let parsedResp;
            try {
                parsedResp = parse(responseText);
                console.log("Phản hồi tải xuống đã được phân tích:", JSON.stringify(parsedResp, null, 2));
            } catch (parseError) {
                console.error("Lỗi khi phân tích phản hồi tải xuống:", parseError);
                console.log("Nội dung phản hồi gây lỗi:", responseText);
                throw new Error(`Không thể phân tích phản hồi tải xuống: ${parseError.message}`);
            }

            if (!parsedResp || typeof parsedResp !== 'object') {
                console.error("Phản hồi tải xuống đã phân tích không hợp lệ:", parsedResp);
                throw new Error("Phản hồi tải xuống không hợp lệ");
            }

            if (parsedResp.failureType || parsedResp.errorMessage) {
                return {
                    error: parsedResp.errorMessage || "Tải xuống thất bại",
                    details: parsedResp,
                    _state: 'failure'
                };
            }

            // Kiểm tra các trường dữ liệu cần thiết
            if (!parsedResp.songList || !Array.isArray(parsedResp.songList) || parsedResp.songList.length === 0) {
                throw new Error("Phản hồi tải xuống không chứa thông tin ứng dụng");
            }

            return parsedResp;
        } catch (error) {
            console.error("Lỗi tải xuống:", error);
            throw new Error(`Tải xuống thất bại: ${error.message}`);
        }
    }

    static Headers = {
        'User-Agent': 'Configurator/2.15 (Macintosh; OS X 11.0.0; 16G29) AppleWebKit/2603.3.8',
        'Content-Type': 'application/x-www-form-urlencoded',
    };
}

console.log("client.js đã được tải, đối tượng Store:", Store);