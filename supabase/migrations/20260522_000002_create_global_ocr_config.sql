INSERT INTO settings (key, value, description)
VALUES (
  'ocr',
  '{"qualidade": "normal", "automatico_upload": true, "fallback_api_url": "", "fallback_api_key": "", "idioma": "por"}',
  'Configuração global do módulo OCR. Suporta fallback para API externa, idioma do Tesseract, e qualidade de processamento.'
)
ON CONFLICT (key) DO NOTHING;
