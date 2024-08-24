import JSZip from 'jszip';

export class SignatureClient {
    constructor(songList0, email) {
        this.archive = new JSZip();
        this.metadata = { ...songList0.metadata, 'apple-id': email, userName: email, 'appleId': email };
        this.signature = songList0.sinfs.find(sinf => sinf.id === 0);
        if (!this.signature) throw new Error('Invalid signature.');
        this.email = email;
    }

    async loadBuffer(arrayBuffer) {
        this.archive = await JSZip.loadAsync(arrayBuffer);
    }

    appendMetadata() {
        const metadataPlist = this.buildPlist(this.metadata);
        this.archive.file('iTunesMetadata.plist', metadataPlist);
        return this;
    }

    async appendSignature() {
        const manifestFile = this.archive.file(/\.app\/SC_Info\/Manifest\.plist$/)[0];
        if (!manifestFile) throw new Error('Invalid app bundle.');
        const manifestContent = await manifestFile.async('string');
        const manifest = this.parsePlist(manifestContent || '<plist></plist>');
        const sinfPath = manifest.SinfPaths?.[0];
        if (!sinfPath) throw new Error('Invalid signature.');
        const appBundleName = manifestFile.name.split('/')[1].replace(/\.app$/, '');
        const signatureTargetPath = `Payload/${appBundleName}.app/${sinfPath}`;
        this.archive.file(signatureTargetPath, this.signature.sinf, {base64: true});
        return this;
    }

    async getBuffer() {
        return await this.archive.generateAsync({type: "arraybuffer", compression: "DEFLATE", compressionOptions: {level: 9}});
    }

    // Simplified plist builder (you might want to use a more robust solution)
    buildPlist(obj) {
        const plistObj = {
            plist: {
                $: {version: "1.0"},
                dict: Object.entries(obj).map(([key, value]) => ({
                    key: key,
                    string: value.toString()
                }))
            }
        };
        return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
${this.jsonToXml(plistObj)}
</plist>`;
    }

    // Simplified plist parser (you might want to use a more robust solution)
    parsePlist(xmlString) {
        const regex = /<key>(.*?)<\/key>\s*<string>(.*?)<\/string>/g;
        const result = {};
        let match;
        while ((match = regex.exec(xmlString)) !== null) {
            result[match[1]] = match[2];
        }
        return result;
    }

    // Helper function to convert JSON to XML
    jsonToXml(obj) {
        let xml = '';
        for (const prop in obj) {
            if (Array.isArray(obj[prop])) {
                for (const item of obj[prop]) {
                    xml += `<${prop}>${this.jsonToXml(item)}</${prop}>`;
                }
            } else if (typeof obj[prop] === 'object') {
                xml += `<${prop}${obj[prop].$ ? ' ' + Object.entries(obj[prop].$).map(([k, v]) => `${k}="${v}"`).join(' ') : ''}>${this.jsonToXml(obj[prop])}</${prop}>`;
            } else {
                xml += `<${prop}>${obj[prop]}</${prop}>`;
            }
        }
        return xml;
    }
}