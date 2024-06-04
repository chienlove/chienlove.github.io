import express from 'express';
import path from 'path';
import fs, { promises as fsPromises, createWriteStream, createReadStream } from 'fs';
import fetch from 'node-fetch';
import { fileURLToPath } from 'url';
import { Store } from './src/client.js';
import { SignatureClient } from './src/Signature.js';
import { v4 as uuidv4 } from 'uuid';

// Generate a random string of specified length
function generateRandomString(length) {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 5004;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());  // Use express.json() to parse JSON bodies

// Serve static files such as favicon.ico from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Serve files from the '.well-known/acme-challenge' directory
app.use('/.well-known/acme-challenge', express.static(path.join(__dirname, '.well-known', 'acme-challenge')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const CHUNK_SIZE = 5 * 1024 * 1024; 
const MAX_CONCURRENT_DOWNLOADS = 10;
const MAX_RETRIES = 5;
const RETRY_DELAY = 3000;

async function downloadChunk({ url, start, end, output }) {
    const headers = { Range: `bytes=${start}-${end}` };
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
            const response = await fetch(url, { headers });
            if (!response.ok) {
                throw new Error(`Không thể lấy phần: ${response.statusText}`);
            }
            const fileStream = createWriteStream(output, { flags: 'a' });
            await new Promise((resolve, reject) => {
                response.body.pipe(fileStream);
                response.body.on('error', reject);
                fileStream.on('finish', resolve);
            });
            return;
        } catch (error) {
            console.error(`Tải phần thất bại: ${error.message}, Thử lại ${attempt + 1}/${MAX_RETRIES}`);
            if (attempt < MAX_RETRIES - 1) {
                await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
            } else {
                throw error;
            }
        }
    }
}

async function clearCache(cacheDir) {
    try {
        const files = await fsPromises.readdir(cacheDir);
        for (const file of files) {
            await fsPromises.unlink(path.join(cacheDir, file));
        }
    } catch (error) {
        if (error.code !== 'ENOENT') {
            console.error(`Cannot clear cache directory: ${error.message}`);
        }
    }
}

class IPATool {
    async downipa({ path: downloadPath, APPLE_ID, PASSWORD, CODE, APPID, appVerId } = {}) {
        downloadPath = downloadPath || '.';

        console.log('------Preparing to log in------');

        const user = await Store.authenticate(APPLE_ID, PASSWORD, CODE);
        if (user._state !== 'success') {
            console.log(`Login failed: ${user.customerMessage}`);
            throw new Error(user.customerMessage);
        }
        console.log(`Login result: ${user.accountInfo.address.firstName} ${user.accountInfo.address.lastName}`);

        console.log('------Querying app information------');
        const app = await Store.download(APPID, appVerId, user);
        if (app._state !== 'success') {
            console.log(`Query failed: ${app.customerMessage}`);
            throw new Error(app.customerMessage);
        }
        const songList0 = app?.songList[0];
        console.log(`App name: ${songList0.metadata.bundleDisplayName}   Version: ${songList0.metadata.bundleShortVersionString}`);

        await fsPromises.mkdir(downloadPath, { recursive: true });

        const uniqueString = uuidv4();
        const outputFileName = `${songList0.metadata.bundleDisplayName}_${songList0.metadata.bundleShortVersionString}_${uniqueString}.ipa`;
        const outputFilePath = path.join(downloadPath, outputFileName);
        const cacheDir = path.join(downloadPath, 'cache');

        await fsPromises.mkdir(cacheDir, { recursive: true });

        await clearCache(cacheDir);

        const resp = await fetch(songList0.URL);
        if (!resp.ok) {
            throw new Error(`Cannot retrieve file: ${resp.statusText}`);
        }
        const fileSize = Number(resp.headers.get('content-length'));
        const numChunks = Math.ceil(fileSize / CHUNK_SIZE);

        console.log(`File size: ${(fileSize / 1024 / 1024).toFixed(2)} MB  Number of chunks: ${numChunks}`);

        let downloaded = 0;
        const progress = new Array(numChunks).fill(0);
        const downloadQueue = [];

        let lastTime = Date.now();
        let lastDownloaded = 0;

        for (let i = 0; i < numChunks; i++) {
            const start = i * CHUNK_SIZE;
            const end = Math.min(start + CHUNK_SIZE - 1, fileSize - 1);
            const tempOutput = path.join(cacheDir, `part${i}`);

            downloadQueue.push(async () => {
                await downloadChunk({ url: songList0.URL, start, end, output: tempOutput });
                progress[i] = Math.min(CHUNK_SIZE, fileSize - start);
                downloaded = progress.reduce((a, b) => a + b, 0);

                const currentTime = Date.now();
                const elapsedTime = (currentTime - lastTime) / 1000;
                const bytesSinceLast = downloaded - lastDownloaded;
                const speed = bytesSinceLast / elapsedTime / 1024 / 1024;

                lastTime = currentTime;
                lastDownloaded = downloaded;
                process.stdout.write(`Download progress: ${(downloaded / 1024 / 1024).toFixed(2)} MB / ${(fileSize / 1024 / 1024).toFixed(2)} MB (${Math.min(100, Math.round(downloaded / fileSize * 100))}%) - Speed: ${speed.toFixed(2)} MB/s\r`);
            });
        }

        for (let i = 0; i < downloadQueue.length; i += MAX_CONCURRENT_DOWNLOADS) {
            const chunkPromises = downloadQueue.slice(i, i + MAX_CONCURRENT_DOWNLOADS).map(fn => fn());
            await Promise.all(chunkPromises);
        }

        console.log('\nMerging chunks...');
        const finalFile = createWriteStream(outputFilePath);
        for (let i = 0; i < numChunks; i++) {
            const tempOutput = path.join(cacheDir, `part${i}`);
            const tempStream = createReadStream(tempOutput);
            tempStream.pipe(finalFile, { end: false });
            await new Promise((resolve) => tempStream.on('end', resolve));
            await fsPromises.unlink(tempOutput);
        }
        finalFile.end();

        console.log('Signing IPA');
        const sigClient = new SignatureClient(songList0, APPLE_ID);
        await sigClient.loadFile(outputFilePath);
        await sigClient.appendMetadata().appendSignature();
        await sigClient.write();
        console.log('Signing complete');

        await fsPromises.rm(cacheDir, { recursive: true, force: true });

        return { songList0, fileName: outputFileName, filePath: outputFilePath };
    }
}

const ipaTool = new IPATool();

app.post('/download', async (req, res) => {
    const { APPLE_ID, PASSWORD, CODE, APPID, appVerId } = req.body;
    const uniqueDownloadPath = path.join(__dirname, 'app', generateRandomString(16));

    try {
        const { songList0, fileName, filePath } = await ipaTool.downipa({
            path: uniqueDownloadPath,
            APPLE_ID: APPLE_ID,
            PASSWORD: PASSWORD,
            CODE: CODE,
            APPID: APPID,
            appVerId: appVerId
        });

        const fileUrl = `${req.protocol}s://ipadown.thuthuatjb.com/files/${path.basename(uniqueDownloadPath)}/${fileName}`;

        // Schedule file deletion after 30 minutes
        setTimeout(async () => {
            try {
                await fsPromises.unlink(filePath);
                console.log(`File deleted: ${filePath}`);
                await fsPromises.rm(uniqueDownloadPath, { recursive: true, force: true });
            } catch (err) {
                console.error(`Error deleting file: ${err.message}`);
            }
        }, 30 * 60 * 1000); // 30 minutes

        res.json({ url: fileUrl });
    } catch (error) {
        console.error('Error during file processing:', error);
        res.status(500).send(`Error: ${error.message}`);
        console.log(`Error during file processing: ${error.message}`);
    }
});

// Serve files dynamically from the 'app' directory
app.use('/files', express.static(path.join(__dirname, 'app')));

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
