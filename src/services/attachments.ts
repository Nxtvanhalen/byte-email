import * as XLSX from 'xlsx'
import { logger } from '../lib/logger'

const log = logger.child({ service: 'attachments' })

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface AttachmentInfo {
  id: string
  filename: string
  content_type: string
}

export interface ProcessedAttachment {
  filename: string
  type: 'image' | 'pdf' | 'excel' | 'unsupported'
  content?: string // For Excel: extracted text
  base64?: string // For images and PDFs: base64 data
  mediaType?: string // For images: media type. For PDFs: 'application/pdf'
  error?: string
}

// Supported content types
const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp']
const PDF_TYPES = ['application/pdf']
const EXCEL_TYPES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
  'application/vnd.ms-excel', // xls
  'text/csv',
]

// ═══════════════════════════════════════════════════════════════════════════
// FETCH ATTACHMENT FROM RESEND
// ═══════════════════════════════════════════════════════════════════════════

async function fetchAttachment(emailId: string, attachmentId: string): Promise<Buffer | null> {
  try {
    // First get the attachment metadata with download URL
    const metaResponse = await fetch(
      `https://api.resend.com/emails/receiving/${emailId}/attachments/${attachmentId}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        },
      },
    )

    if (!metaResponse.ok) {
      log.error({ status: metaResponse.status }, 'Failed to get attachment metadata')
      return null
    }

    const metadata = (await metaResponse.json()) as { download_url?: string; content?: string }

    // If there's a download URL, fetch the actual content
    if (metadata.download_url) {
      const contentResponse = await fetch(metadata.download_url)
      if (!contentResponse.ok) {
        log.error({ status: contentResponse.status }, 'Failed to download attachment')
        return null
      }
      const arrayBuffer = await contentResponse.arrayBuffer()
      return Buffer.from(arrayBuffer)
    }

    // Some attachments might have base64 content directly
    if (metadata.content) {
      return Buffer.from(metadata.content, 'base64')
    }

    log.error('No download_url or content in metadata')
    return null
  } catch (error) {
    log.error({ err: error }, 'Error fetching attachment')
    return null
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// PROCESS ATTACHMENTS
// ═══════════════════════════════════════════════════════════════════════════

export async function processAttachments(
  emailId: string,
  attachments: AttachmentInfo[],
): Promise<ProcessedAttachment[]> {
  const results: ProcessedAttachment[] = []

  for (const attachment of attachments) {
    log.info(
      { filename: attachment.filename, contentType: attachment.content_type },
      'Processing attachment',
    )

    const contentType = attachment.content_type.toLowerCase()

    // Determine type
    let type: ProcessedAttachment['type'] = 'unsupported'
    if (IMAGE_TYPES.some((t) => contentType.includes(t.split('/')[1]))) {
      type = 'image'
    } else if (PDF_TYPES.some((t) => contentType.includes('pdf'))) {
      type = 'pdf'
    } else if (
      EXCEL_TYPES.some(
        (t) =>
          contentType.includes(t.split('/')[1]) ||
          contentType.includes('csv') ||
          contentType.includes('spreadsheet'),
      )
    ) {
      type = 'excel'
    }

    if (type === 'unsupported') {
      results.push({
        filename: attachment.filename,
        type: 'unsupported',
        error: `Unsupported file type: ${attachment.content_type}`,
      })
      continue
    }

    // Fetch the attachment content
    const buffer = await fetchAttachment(emailId, attachment.id)
    if (!buffer) {
      results.push({
        filename: attachment.filename,
        type,
        error: 'Failed to download attachment',
      })
      continue
    }

    // Process based on type
    try {
      switch (type) {
        case 'image':
          results.push({
            filename: attachment.filename,
            type: 'image',
            base64: buffer.toString('base64'),
            mediaType: contentType.includes('png')
              ? 'image/png'
              : contentType.includes('gif')
                ? 'image/gif'
                : contentType.includes('webp')
                  ? 'image/webp'
                  : 'image/jpeg',
          })
          log.info({ filename: attachment.filename }, 'Image processed')
          break

        case 'pdf':
          // Send as base64 for Claude's native PDF document understanding
          // Claude visually processes the PDF, preserving tables, charts, and layout
          results.push({
            filename: attachment.filename,
            type: 'pdf',
            base64: buffer.toString('base64'),
            mediaType: 'application/pdf',
          })
          log.info(
            { filename: attachment.filename, sizeBytes: buffer.length },
            'PDF prepared for Claude vision',
          )
          break

        case 'excel': {
          const workbook = XLSX.read(buffer, { type: 'buffer' })
          let excelContent = ''

          for (const sheetName of workbook.SheetNames) {
            const sheet = workbook.Sheets[sheetName]
            const csv = XLSX.utils.sheet_to_csv(sheet)
            excelContent += `\n--- Sheet: ${sheetName} ---\n${csv}\n`
          }

          results.push({
            filename: attachment.filename,
            type: 'excel',
            content: excelContent.trim() || 'No data extracted from spreadsheet',
          })
          log.info({ filename: attachment.filename }, 'Excel processed')
          break
        }
      }
    } catch (error) {
      log.error({ err: error, filename: attachment.filename }, 'Error processing attachment')
      results.push({
        filename: attachment.filename,
        type,
        error: `Failed to process: ${error instanceof Error ? error.message : 'Unknown error'}`,
      })
    }
  }

  return results
}

// ═══════════════════════════════════════════════════════════════════════════
// FORMAT FOR CLAUDE PROMPT
// ═══════════════════════════════════════════════════════════════════════════

export function formatAttachmentsForPrompt(attachments: ProcessedAttachment[]): string {
  if (attachments.length === 0) return ''

  const parts: string[] = []

  for (const att of attachments) {
    if (att.error) {
      parts.push(`[Attachment: ${att.filename} - ${att.error}]`)
    } else if (att.type === 'excel') {
      parts.push(
        `\n--- Attachment: ${att.filename} ---\n${att.content}\n--- End of ${att.filename} ---\n`,
      )
    }
    // PDFs are now handled via Claude's native document blocks (not text extraction)
    // Images are handled separately via Claude's vision API
  }

  return parts.join('\n')
}

// ═══════════════════════════════════════════════════════════════════════════
// GET IMAGE ATTACHMENTS FOR CLAUDE VISION
// ═══════════════════════════════════════════════════════════════════════════

export function getImageAttachments(attachments: ProcessedAttachment[]): ProcessedAttachment[] {
  return attachments.filter((a) => a.type === 'image' && a.base64 && !a.error)
}

// ═══════════════════════════════════════════════════════════════════════════
// GET PDF ATTACHMENTS FOR CLAUDE DOCUMENT BLOCKS
// ═══════════════════════════════════════════════════════════════════════════

export function getPdfAttachments(attachments: ProcessedAttachment[]): ProcessedAttachment[] {
  return attachments.filter((a) => a.type === 'pdf' && a.base64 && !a.error)
}
