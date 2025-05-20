import { supabase } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

/**
 * Service for handling reimbursement-related operations
 */

// Interface for reimbursement attachment
export interface ReimbursementAttachment {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
}

/**
 * Upload a file to Supabase storage for reimbursement attachments
 * @param file The file to upload
 * @returns Promise with the attachment details
 */
export async function uploadReimbursementAttachment(file: File): Promise<ReimbursementAttachment> {
  try {
    // Generate a unique file name to avoid collisions
    const fileExtension = file.name.split('.').pop() || '';
    const fileName = `${uuidv4()}.${fileExtension}`;

    // Check if the bucket exists first
    try {
      const { data: buckets, error: listError } = await supabase.storage.listBuckets();

      if (listError) {
        console.warn('Error checking if comprovantes bucket exists:', listError);
        // Continue with upload attempt
      } else {
        const comprovantesBucket = buckets?.find(bucket => bucket.name === 'comprovantes');

        if (!comprovantesBucket) {
          console.warn('Comprovantes bucket does not exist, attempting to create it...');

          // Try to create the bucket
          try {
            const { error: createError } = await supabase.storage.createBucket('comprovantes', {
              public: true
            });

            if (createError) {
              console.error('Error creating comprovantes bucket:', createError);
              // Continue with upload attempt anyway
            } else {
              console.log('Successfully created comprovantes bucket');
            }
          } catch (createError) {
            console.error('Exception creating comprovantes bucket:', createError);
            // Continue with upload attempt anyway
          }
        }
      }
    } catch (checkError) {
      console.warn('Exception checking if comprovantes bucket exists:', checkError);
      // Continue with upload attempt
    }

    // Upload the file to the 'comprovantes' bucket
    const { data, error } = await supabase.storage
      .from('comprovantes')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Error uploading file to Supabase:', error);

      // If the error is related to the bucket not existing, provide a more helpful error message
      if (error.message && (
          error.message.includes('bucket') ||
          error.message.includes('not found') ||
          error.message.includes('does not exist')
        )) {
        throw new Error(
          'O bucket de armazenamento "comprovantes" não existe. ' +
          'Por favor, crie o bucket manualmente no painel do Supabase ou contate o administrador do sistema.'
        );
      }

      // If the error is related to RLS policies, provide a more helpful error message
      if (error.message && (
          error.message.includes('row-level security') ||
          error.message.includes('RLS') ||
          error.message.includes('policy') ||
          error.message.includes('permission denied')
        )) {
        throw new Error(
          'Erro de permissão ao fazer upload do arquivo. ' +
          'As políticas de segurança (RLS) do Supabase estão impedindo o upload. ' +
          'Por favor, contate o administrador do sistema para configurar as políticas de segurança do bucket "comprovantes".'
        );
      }

      throw error;
    }

    // Get the public URL for the file
    const { data: urlData } = supabase.storage
      .from('comprovantes')
      .getPublicUrl(data.path);

    // Return the attachment details
    return {
      id: fileName,
      name: file.name,
      url: urlData.publicUrl,
      type: file.type,
      size: file.size
    };
  } catch (error) {
    console.error('Error in uploadReimbursementAttachment:', error);
    throw error;
  }
}

/**
 * Delete a reimbursement attachment from Supabase storage
 * @param fileName The file name to delete
 * @returns Promise<boolean> indicating success
 */
export async function deleteReimbursementAttachment(fileName: string): Promise<boolean> {
  try {
    // Extract just the filename if a full URL was provided
    const fileNameOnly = fileName.includes('/')
      ? fileName.split('/').pop() || fileName
      : fileName;

    // Delete the file from the 'comprovantes' bucket
    const { error } = await supabase.storage
      .from('comprovantes')
      .remove([fileNameOnly]);

    if (error) {
      console.error('Error deleting file from Supabase:', error);
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Error in deleteReimbursementAttachment:', error);
    throw error;
  }
}

/**
 * Fetch reimbursements for a user
 * @param email User's email
 * @param status Optional status filter
 * @param page Page number for pagination
 * @param limit Items per page
 * @returns Promise with the reimbursements
 */
export async function fetchUserReimbursements(
  email: string,
  status?: string,
  page: number = 1,
  limit: number = 10
) {
  try {
    // Normalize email for case-insensitive search
    const normalizedEmail = email.toLowerCase().trim();

    // Build the query
    let query = supabase
      .from('Reimbursement')
      .select('*', { count: 'exact' })
      .ilike('email', `%${normalizedEmail}%`);

    // Add status filter if provided
    if (status) {
      query = query.eq('status', status);
    }

    // Add pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // Execute the query with ordering
    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      console.error('Error fetching reimbursements:', error);
      throw error;
    }

    return { data, count };
  } catch (error) {
    console.error('Error in fetchUserReimbursements:', error);
    throw error;
  }
}
