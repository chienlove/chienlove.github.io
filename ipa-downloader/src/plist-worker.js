const xmlHeader = '<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">';

export function parse(str) {
    try {
        const cleanStr = str.replace(/<\?xml.*?\?>/, '').replace(/<!DOCTYPE.*?>/, '').trim();
        return parseNode(cleanStr);
    } catch (error) {
        console.error("Lỗi khi phân tích chuỗi:", error);
        console.log("Chuỗi gây lỗi:", str);
        throw new Error(`Không thể phân tích chuỗi: ${error.message}`);
    }
}

function parseNode(str) {
    str = str.trim();
    if (str.startsWith('<dict>')) {
        return parseDict(str);
    } else if (str.startsWith('<array>')) {
        return parseArray(str);
    } else if (str.startsWith('<string>')) {
        return str.match(/<string>(.*?)<\/string>/s)[1];
    } else if (str.startsWith('<integer>')) {
        return parseInt(str.match(/<integer>(.*?)<\/integer>/)[1], 10);
    } else if (str.startsWith('<real>')) {
        return parseFloat(str.match(/<real>(.*?)<\/real>/)[1]);
    } else if (str.startsWith('<true/>')) {
        return true;
    } else if (str.startsWith('<false/>')) {
        return false;
    } else if (str.startsWith('<date>')) {
        return new Date(str.match(/<date>(.*?)<\/date>/)[1]);
    } else if (str.startsWith('<data>')) {
        return atob(str.match(/<data>(.*?)<\/data>/s)[1].replace(/\s/g, ''));
    }
    console.warn('Unhandled node type:', str.substring(0, 20));
    return null;
}

function parseDict(str) {
    const dict = {};
    const matches = str.match(/<key>.*?<\/key>(?:.*?<\/.*?>)+/g);
    if (matches) {
        matches.forEach(match => {
            const [key, ...value] = match.split(/<\/key>/);
            dict[key.replace(/<key>/, '')] = parseNode(value.join('</key>'));
        });
    }
    return dict;
}

function parseArray(str) {
    const items = str.match(/<(?!array).*?<\/.*?>/g);
    return items ? items.map(parseNode) : [];
}

export function build(obj) {
    return xmlHeader + '<plist version="1.0">' + buildNode(obj) + '</plist>';
}

function buildNode(obj) {
    if (typeof obj === 'string') {
        return `<string>${escapeXml(obj)}</string>`;
    } else if (typeof obj === 'number') {
        return Number.isInteger(obj) ? `<integer>${obj}</integer>` : `<real>${obj}</real>`;
    } else if (typeof obj === 'boolean') {
        return obj ? '<true/>' : '<false/>';
    } else if (obj instanceof Date) {
        return `<date>${obj.toISOString()}</date>`;
    } else if (Array.isArray(obj)) {
        return `<array>${obj.map(buildNode).join('')}</array>`;
    } else if (typeof obj === 'object') {
        let result = '<dict>';
        for (let [key, value] of Object.entries(obj)) {
            result += `<key>${escapeXml(key)}</key>${buildNode(value)}`;
        }
        return result + '</dict>';
    }
    console.warn('Unhandled type:', typeof obj);
    return '';
}

function escapeXml(unsafe) {
    return unsafe.replace(/[<>&'"]/g, function (c) {
        switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case "'": return '&apos;';
            case '"': return '&quot;';
        }
    });
}