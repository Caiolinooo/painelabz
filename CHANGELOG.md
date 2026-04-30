# Changelog

## [Unreleased] - $(date +%Y-%m-%d)

### Added
- Enhanced IA system context memory (increased from 6000 to 25000 characters)
- Increased message history limit (from 16 to 30 messages)
- Real PDF generation capability for reports
- Real email sending capability with attachments
- Debug logging for IA context building
- Improved session management using React refs

### Changed
- **src/lib/ia/context-builder.ts**: 
  - Increased MAX_CONTEXT_TOKENS_ESTIMATE from 6000 to 25000
  - Increased MAX_HISTORY_MESSAGES from 16 to 30
  - Added debug logging for session context
  - Updated database table references (avaliacoes → avaliacoes_desempenho)
  - Fixed various text strings (accent removal for consistency)
  
- **src/components/IA/ChatWindow.tsx**:
  - Added useRef for activeSessionId to avoid React latency issues
  - Added useEffect to sync ref with state
  - Modified handleSend to use ref for session_id
  - Corrected session_id handling in streaming and non-streaming paths
  - Fixed activeSessionId updates when receiving new session IDs

- **src/lib/ia/tools.ts**:
  - Completely rewrote gerar_relatorio_pdf to generate real PDFs
  - Completely rewrote enviar_email_relatorio to send real emails
  - Added proper data fetching from database for report generation
  - Implemented actual PDF generation using existing pdf-generator utilities
  - Implemented actual email sending using nodemailer/SMTP
  - Added proper error handling and success responses
  - Added import for sendEmailWithNodemailer

- **src/lib/ia/email-tool.ts**:
  - Enhanced getTransporter() with debug logging
  - Added fallback values for development when env vars missing
  - Default to Office 365 SMTP configuration for development
  - Maintained compatibility with existing email sending logic

### Fixed
- IA system now properly maintains conversation history (30 messages vs previous limit)
- Session ID persistence between messages in the same conversation
- PDF generation now creates actual PDF files instead of simulating
- Email sending now actually sends emails instead of simulating
- React state update latency issues affecting session management
- Database query corrections for various data types

### Removed
- None