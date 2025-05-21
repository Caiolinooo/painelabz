            });
          } else {
            console.error('PDF buffer is empty or invalid');
          }

          // Try to download and attach the original attachments
          if (reimbursement.comprovantes && Array.isArray(reimbursement.comprovantes) && reimbursement.comprovantes.length > 0) {
            console.log(`Attempting to attach ${reimbursement.comprovantes.length} original files`);

            for (const attachment of reimbursement.comprovantes) {
              try {
                // Get the file from Supabase storage
                const fileName = attachment.url.split('/').pop() || attachment.url;
                console.log(`Downloading attachment: ${fileName}`);

                const { data, error } = await supabaseAdmin
                  .storage
                  .from('comprovantes')
                  .download(fileName);

                if (error) {
                  console.error(`Error downloading attachment ${fileName}:`, error);
                  continue;
                }

                if (data) {
                  console.log(`Successfully downloaded attachment ${fileName}`);
                  const arrayBuffer = await data.arrayBuffer();

                  attachments.push({
                    filename: attachment.nome,
                    content: Buffer.from(arrayBuffer),
                    contentType: attachment.tipo || 'application/octet-stream'
                  });
                }
              } catch (attachError) {
                console.error('Error processing attachment:', attachError);
              }
            }
          }
        } catch (pdfError) {
          console.error('Error generating PDF:', pdfError);
        }
      }

      console.log(`Sending email notification to ${reimbursement.email} with ${attachments.length} attachments`);

      await sendEmail({
        to: reimbursement.email,
        subject,
        html: emailBody,
        attachments
      });

      console.log('Email notification sent successfully');
    } catch (emailError) {
      console.error('Error sending email notification:', emailError);
      // Continue even if email fails
    }

    return NextResponse.json({
      success: true,
      message: `Reembolso ${status === 'APPROVED' ? 'aprovado' : 'rejeitado'} com sucesso`
    });
  } catch (error) {
    console.error('Error approving reimbursement:', error);
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}

/**
 * Helper function to get MIME type from file extension
 */
function getMimeType(extension: string): string {
  const mimeTypes: Record<string, string> = {
    '.pdf': 'application/pdf',
// ... existing code ... 