import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

let ffmpegInstance: FFmpeg | null = null;
let isFFmpegLoaded = false;

/**
 * Inicializa o FFmpeg.wasm
 */
export async function loadFFmpeg(onProgress?: (message: string) => void): Promise<FFmpeg> {
    if (ffmpegInstance && isFFmpegLoaded) {
        return ffmpegInstance;
    }

    try {
        onProgress?.('Carregando FFmpeg...');

        ffmpegInstance = new FFmpeg();

        // Configurar logs
        ffmpegInstance.on('log', ({ message }) => {
            console.log('[FFmpeg]', message);
        });

        // Configurar progresso
        ffmpegInstance.on('progress', ({ progress }) => {
            const percent = Math.round(progress * 100);
            onProgress?.(`Comprimindo vídeo: ${percent}%`);
        });

        // Carregar arquivos WASM do CDN
        const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';

        await ffmpegInstance.load({
            coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
            wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
        });

        isFFmpegLoaded = true;
        onProgress?.('FFmpeg carregado!');

        return ffmpegInstance;
    } catch (error) {
        console.error('Erro ao carregar FFmpeg:', error);
        throw new Error('Não foi possível carregar o compressor de vídeo');
    }
}

/**
 * Comprime um vídeo para reduzir o tamanho
 * @param file Arquivo de vídeo original
 * @param targetSizeMB Tamanho alvo em MB (padrão: 45MB para margem de segurança)
 * @param onProgress Callback de progresso
 * @returns Arquivo comprimido
 */
export async function compressVideo(
    file: File,
    targetSizeMB: number = 45,
    onProgress?: (message: string) => void
): Promise<File> {
    try {
        const ffmpeg = await loadFFmpeg(onProgress);

        onProgress?.('Preparando vídeo...');

        // Escrever arquivo de entrada
        const inputName = 'input.mp4';
        const outputName = 'output.mp4';

        await ffmpeg.writeFile(inputName, await fetchFile(file));

        // Calcular bitrate necessário para atingir tamanho alvo
        // Fórmula: bitrate (kbps) = (target_size_MB * 8192) / duration_seconds
        // Como não temos a duração, usamos valores conservadores

        // Configurações de compressão agressiva mas com qualidade aceitável
        const compressionArgs = [
            '-i', inputName,
            '-c:v', 'libx264',           // Codec H.264
            '-preset', 'medium',          // Balanço velocidade/qualidade
            '-crf', '28',                 // Qualidade (18-28, maior = menor qualidade/tamanho)
            '-vf', 'scale=1280:-2',       // Redimensionar para 720p mantendo aspect ratio
            '-c:a', 'aac',                // Codec de áudio
            '-b:a', '128k',               // Bitrate de áudio
            '-movflags', '+faststart',    // Otimizar para streaming
            '-y',                         // Sobrescrever sem perguntar
            outputName
        ];

        onProgress?.('Comprimindo vídeo (isso pode levar alguns minutos)...');

        await ffmpeg.exec(compressionArgs);

        onProgress?.('Finalizando...');

        // Ler arquivo de saída
        const data = await ffmpeg.readFile(outputName);

        // Converter para Blob e depois para File
        const blob = new Blob([data], { type: 'video/mp4' });
        const compressedFile = new File(
            [blob],
            file.name.replace(/\.[^/.]+$/, '') + '_compressed.mp4',
            { type: 'video/mp4' }
        );

        // Limpar arquivos temporários
        await ffmpeg.deleteFile(inputName);
        await ffmpeg.deleteFile(outputName);

        const originalSizeMB = (file.size / 1024 / 1024).toFixed(2);
        const compressedSizeMB = (compressedFile.size / 1024 / 1024).toFixed(2);
        const reduction = ((1 - compressedFile.size / file.size) * 100).toFixed(1);

        console.log(`Compressão concluída:`);
        console.log(`  Original: ${originalSizeMB}MB`);
        console.log(`  Comprimido: ${compressedSizeMB}MB`);
        console.log(`  Redução: ${reduction}%`);

        onProgress?.(`Vídeo comprimido: ${originalSizeMB}MB → ${compressedSizeMB}MB (${reduction}% menor)`);

        return compressedFile;
    } catch (error) {
        console.error('Erro ao comprimir vídeo:', error);
        throw new Error('Erro ao comprimir vídeo. Tente um arquivo menor.');
    }
}

/**
 * Verifica se o arquivo é um vídeo
 */
export function isVideoFile(file: File): boolean {
    return file.type.startsWith('video/');
}

/**
 * Verifica se o vídeo precisa ser comprimido
 */
export function needsCompression(file: File, maxSizeMB: number = 50): boolean {
    return isVideoFile(file) && file.size > maxSizeMB * 1024 * 1024;
}
