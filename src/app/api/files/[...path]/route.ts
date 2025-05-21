import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { extractTokenFromHeader, verifyToken } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/db';

/**
 * API endpoint to download files
 * This endpoint handles file downloads with proper authentication
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    console.log('File download request received:', params.path);

    // Check authentication
    const authHeader = request.headers.get('authorization') || '';
    const token = extractTokenFromHeader(authHeader);

    // If no token is provided, try to get it from the cookie or query parameter
    // This allows direct downloads from browser links
    let isAuthenticated = false;
    let userId = '';
    let userRole = '';

    if (token) {
      // Verify token if provided
      const payload = verifyToken(token);
      if (payload) {
        isAuthenticated = true;
        userId = payload.userId;
        userRole = payload.role;
        console.log('User authenticated via token:', userId, 'Role:', userRole);
      }
    } else {
      // Try to get session from Supabase
      const { data: { session } } = await supabaseAdmin.auth.getSession();
      if (session) {
        isAuthenticated = true;
        userId = session.user.id;

        // Get user role from database
        const { data: userData } = await supabaseAdmin
          .from('users')
          .select('role')
          .eq('id', userId)
          .single();

        userRole = userData?.role || '';
        console.log('User authenticated via session:', userId, 'Role:', userRole);
      }
    }

    // Join path segments
    const filePath = params.path.join('/');
    console.log('Requested file path:', filePath);

    // Check if the file is a reimbursement attachment
    const isReimbursementAttachment = filePath.includes('comprovantes/');

    // For reimbursement attachments, check if user is admin, manager, or the owner of the reimbursement
    if (isReimbursementAttachment && isAuthenticated) {
      const isAdmin = userRole === 'ADMIN';
      const isManager = userRole === 'MANAGER';

      // If user is admin or manager, allow access
      if (isAdmin || isManager) {
        console.log('Admin/Manager access granted for reimbursement attachment');
      } else {
        // Check if user is the owner of the reimbursement
        // Extract reimbursement ID from path if possible
        const pathParts = filePath.split('/');
        const attachmentId = pathParts[pathParts.length - 1];

        // Try to find the reimbursement that contains this attachment
        const { data: reimbursements, error } = await supabaseAdmin
          .from('Reimbursement')
          .select('email')
          .contains('comprovantes', [{ url: attachmentId }])
          .single();

        if (error || !reimbursements) {
          console.error('Error checking reimbursement ownership:', error);
          return NextResponse.json(
            { error: 'Acesso não autorizado' },
            { status: 403 }
          );
        }

        // Get user email
        const { data: userProfile } = await supabaseAdmin
          .from('users')
          .select('email')
          .eq('id', userId)
          .single();

        // Check if user email matches reimbursement email
        if (!userProfile || userProfile.email !== reimbursements.email) {
          console.error('User is not the owner of this reimbursement');
          return NextResponse.json(
            { error: 'Acesso não autorizado' },
            { status: 403 }
          );
        }

        console.log('Owner access granted for reimbursement attachment');
      }
    }

    // Try to get the file from Supabase storage first
    try {
      console.log('Attempting to download from Supabase storage:', filePath);

      // Determine the bucket based on the file path
      let bucket = 'documents';
      if (filePath.includes('comprovantes') || filePath.includes('reembolso')) {
        bucket = 'comprovantes';
      }

      console.log(`Using bucket: ${bucket} for file: ${filePath}`);

      // Extract just the filename without path for Supabase storage
      const fileName = filePath.split('/').pop() || filePath;
      console.log('Attempting to download file with name:', fileName);

      // Clean the filename to handle any URL encoding or special characters
      const cleanFileName = decodeURIComponent(fileName).replace(/[^\w\s.-]/g, '');
      console.log('Cleaned filename:', cleanFileName);

      // Try to list files in the bucket to find a match
      try {
        console.log(`Listing files in ${bucket} bucket to find a match`);
        const { data: fileList, error: listError } = await supabaseAdmin
          .storage
          .from(bucket)
          .list();

        if (listError) {
          console.error('Error listing files in bucket:', listError);
        } else if (fileList && fileList.length > 0) {
          console.log(`Found ${fileList.length} files in bucket`);

          // Look for exact match first
          const exactMatch = fileList.find(file => file.name === fileName);
          if (exactMatch) {
            console.log('Found exact match in bucket:', exactMatch.name);

            // Download the exact match
            const { data: exactData, error: exactError } = await supabaseAdmin
              .storage
              .from(bucket)
              .download(exactMatch.name);

            if (!exactError && exactData) {
              console.log('Successfully downloaded exact match');

              // Get file type from path
              const fileExtension = path.extname(exactMatch.name).toLowerCase();
              const mimeType = getMimeType(fileExtension);

              // Convert blob to array buffer
              const arrayBuffer = await exactData.arrayBuffer();

              // Return the file
              return new NextResponse(arrayBuffer, {
                headers: {
                  'Content-Type': mimeType,
                  'Content-Disposition': `attachment; filename="${exactMatch.name}"`,
                },
              });
            }
          }

          // If no exact match, look for similar files
          const similarFiles = fileList.filter(file =>
            file.name.includes(cleanFileName) ||
            cleanFileName.includes(file.name) ||
            file.name.includes(fileName) ||
            fileName.includes(file.name)
          );

          if (similarFiles.length > 0) {
            console.log(`Found ${similarFiles.length} similar files:`, similarFiles.map(f => f.name));

            // Try to download the first similar file
            const { data: similarData, error: similarError } = await supabaseAdmin
              .storage
              .from(bucket)
              .download(similarFiles[0].name);

            if (!similarError && similarData) {
              console.log('Successfully downloaded similar file:', similarFiles[0].name);

              // Get file type from path
              const fileExtension = path.extname(similarFiles[0].name).toLowerCase();
              const mimeType = getMimeType(fileExtension);

              // Convert blob to array buffer
              const arrayBuffer = await similarData.arrayBuffer();

              // Return the file
              return new NextResponse(arrayBuffer, {
                headers: {
                  'Content-Type': mimeType,
                  'Content-Disposition': `attachment; filename="${similarFiles[0].name}"`,
                },
              });
            }
          }
        }
      } catch (listError) {
        console.error('Error listing files in bucket:', listError);
      }

      // If listing approach failed, try direct download approaches

      // Try direct download first with the original path
      const { data, error } = await supabaseAdmin
        .storage
        .from(bucket)
        .download(filePath);

      if (error) {
        console.error('Error downloading from Supabase storage with full path:', error);

        // Try with just the filename
        const { data: fileData, error: fileError } = await supabaseAdmin
          .storage
          .from(bucket)
          .download(fileName);

        if (fileError) {
          console.error('Error downloading from Supabase storage with filename only:', fileError);

          // Try with cleaned filename
          const { data: cleanData, error: cleanError } = await supabaseAdmin
            .storage
            .from(bucket)
            .download(cleanFileName);

          if (cleanError) {
            console.error('Error downloading with cleaned filename:', cleanError);

            // Try to get a public URL and download from there
            const { data: publicUrlData } = supabaseAdmin
              .storage
              .from(bucket)
              .getPublicUrl(fileName);

            if (publicUrlData && publicUrlData.publicUrl) {
              console.log('Attempting to download via public URL:', publicUrlData.publicUrl);

              try {
                // Add cache-busting parameter to avoid cached 400 responses
                const publicUrl = new URL(publicUrlData.publicUrl);
                publicUrl.searchParams.append('t', Date.now().toString());

                console.log('Using cache-busted URL:', publicUrl.toString());

                // Use fetch with appropriate headers
                const publicResponse = await fetch(publicUrl.toString(), {
                  method: 'GET',
                  headers: {
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                  }
                });

                if (publicResponse.ok) {
                  console.log('File downloaded via public URL successfully');
                  const blob = await publicResponse.blob();
                  const arrayBuffer = await blob.arrayBuffer();

                  // Get file type from path
                  const fileExtension = path.extname(fileName).toLowerCase();
                  const mimeType = getMimeType(fileExtension);

                  // Return the file
                  return new NextResponse(arrayBuffer, {
                    headers: {
                      'Content-Type': mimeType,
                      'Content-Disposition': `attachment; filename="${fileName}"`,
                    },
                  });
                } else {
                  console.error('Error downloading via public URL:', publicResponse.status, publicResponse.statusText);

                  // Try with cleaned filename public URL as last resort
                  const { data: cleanPublicUrlData } = supabaseAdmin
                    .storage
                    .from(bucket)
                    .getPublicUrl(cleanFileName);

                  if (cleanPublicUrlData && cleanPublicUrlData.publicUrl) {
                    console.log('Attempting with cleaned filename public URL:', cleanPublicUrlData.publicUrl);

                    const cleanPublicUrl = new URL(cleanPublicUrlData.publicUrl);
                    cleanPublicUrl.searchParams.append('t', Date.now().toString());

                    const cleanPublicResponse = await fetch(cleanPublicUrl.toString(), {
                      method: 'GET',
                      headers: {
                        'Cache-Control': 'no-cache',
                        'Pragma': 'no-cache'
                      }
                    });

                    if (cleanPublicResponse.ok) {
                      console.log('File downloaded via cleaned public URL successfully');
                      const cleanBlob = await cleanPublicResponse.blob();
                      const cleanArrayBuffer = await cleanBlob.arrayBuffer();

                      // Return the file
                      return new NextResponse(cleanArrayBuffer, {
                        headers: {
                          'Content-Type': getMimeType(path.extname(cleanFileName).toLowerCase()),
                          'Content-Disposition': `attachment; filename="${cleanFileName}"`,
                        },
                      });
                    } else {
                      console.error('Error downloading via cleaned public URL:', cleanPublicResponse.status, cleanPublicResponse.statusText);
                      // Continue to try local file system
                    }
                  }
                }
              } catch (publicUrlError) {
                console.error('Error fetching from public URL:', publicUrlError);
                // Continue to try local file system
              }
            }
          } else if (fileData) {
            console.log('File downloaded from Supabase storage with filename only successfully');

            // Get file type from path
            const fileExtension = path.extname(fileName).toLowerCase();
            const mimeType = getMimeType(fileExtension);

            // Convert blob to array buffer
            const arrayBuffer = await fileData.arrayBuffer();

            // Return the file
            return new NextResponse(arrayBuffer, {
              headers: {
                'Content-Type': mimeType,
                'Content-Disposition': `attachment; filename="${fileName}"`,
              },
            });
          }
        } else if (data) {
          console.log('File downloaded from Supabase storage successfully');

          // Get file type from path
          const fileExtension = path.extname(filePath).toLowerCase();
          const mimeType = getMimeType(fileExtension);

          // Convert blob to array buffer
          const arrayBuffer = await data.arrayBuffer();

          // Return the file
          return new NextResponse(arrayBuffer, {
            headers: {
              'Content-Type': mimeType,
              'Content-Disposition': `attachment; filename="${path.basename(filePath)}"`,
            },
          });
        }
      }
    } catch (storageError) {
      console.error('Error accessing Supabase storage:', storageError);
      // Continue to try local file system
    }

    // If not found in Supabase storage, try local file system
    // Normalize the path to avoid path traversal attacks
    const normalizedPath = path.normalize(filePath).replace(/^(\.\.(\/|\\|$))+/, '');

    // Construct the full path
    let fullPath = path.join(process.cwd(), 'public', normalizedPath);

    console.log('Checking local file system path:', fullPath);

    // Check if the file exists
    if (!fs.existsSync(fullPath)) {
      console.error('File not found in local file system:', fullPath);
      return NextResponse.json(
        { error: 'Arquivo não encontrado' },
        { status: 404 }
      );
    }

    // Get file stats
    const stats = fs.statSync(fullPath);

    // Check if it's a file
    if (!stats.isFile()) {
      console.error('Path is not a file:', fullPath);
      return NextResponse.json(
        { error: 'O caminho não é um arquivo' },
        { status: 400 }
      );
    }

    // Read the file
    const fileBuffer = fs.readFileSync(fullPath);

    // Get file type from path
    const fileExtension = path.extname(fullPath).toLowerCase();
    const mimeType = getMimeType(fileExtension);

    console.log('File found in local file system, serving:', fullPath);

    // Return the file
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `attachment; filename="${path.basename(fullPath)}"`,
      },
    });
  } catch (error) {
    console.error('Error serving file:', error);
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
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.txt': 'text/plain',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.ppt': 'application/vnd.ms-powerpoint',
    '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    '.zip': 'application/zip',
    '.rar': 'application/x-rar-compressed',
    '.7z': 'application/x-7z-compressed',
    '.mp4': 'video/mp4',
    '.mp3': 'audio/mpeg',
  };

  return mimeTypes[extension] || 'application/octet-stream';
}
