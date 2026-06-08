export {
  processarDocumentoOCR,
  processarImagensPreRenderizadas,
  invalidateConfigCache,
  extrairDadosTexto,
} from './ocr-processor';

export type {
  OCRTipoDocumento,
  OCRStatus,
  OCRResult,
  OCRProcessOptions,
  OCRExtractResult,
  OCRConfig,
} from '@/types/ocr';
