import { supabase } from './supabase';

const SUPABASE_URL = 'https://rkmvrfqhcleibdtlcwwh.supabase.co';

// Bucket names
export const BUCKETS = {
    STORE_PROFILE: 'perfil-store',
    PRODUCT_IMAGES: 'product-images',
} as const;

type BucketName = typeof BUCKETS[keyof typeof BUCKETS];

/**
 * Upload an image to Supabase Storage
 * @param uri - Local file URI (from expo-image-picker)
 * @param bucket - Storage bucket name
 * @param folder - Optional folder path within the bucket
 * @returns Public URL of the uploaded image
 */
export async function uploadImage(
    uri: string,
    bucket: BucketName,
    folder?: string
): Promise<string> {
    try {
        console.log('[UPLOAD] Starting upload for:', uri);

        // Fetch the image as blob with timeout
        console.log('[UPLOAD] Fetching image...');
        const fetchPromise = fetch(uri);
        const timeoutPromise = new Promise<Response>((_, reject) =>
            setTimeout(() => reject(new Error('Fetch timeout')), 10000)
        );

        const response = await Promise.race([fetchPromise, timeoutPromise]);
        console.log('[UPLOAD] Image fetched, getting blob...');

        const blob = await response.blob();
        console.log('[UPLOAD] Blob size:', blob.size);

        // Convert blob to ArrayBuffer
        const arrayBuffer = await new Response(blob).arrayBuffer();
        console.log('[UPLOAD] ArrayBuffer size:', arrayBuffer.byteLength);

        // Generate unique filename
        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substring(2, 8);
        const extension = uri.split('.').pop()?.toLowerCase() || 'jpg';
        const fileName = `${timestamp}_${randomId}.${extension}`;

        // Build full path
        const filePath = folder ? `${folder}/${fileName}` : fileName;

        // Determine content type
        const contentType = extension === 'png' ? 'image/png' : 'image/jpeg';

        console.log('[UPLOAD] Uploading to Supabase:', bucket, filePath);

        // Upload to Supabase Storage with timeout
        const uploadPromise = supabase.storage
            .from(bucket)
            .upload(filePath, arrayBuffer, {
                contentType,
                upsert: false,
            });

        const uploadTimeout = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Upload timeout - Supabase não respondeu')), 15000)
        );

        const { data, error } = await Promise.race([uploadPromise, uploadTimeout]);

        if (error) {
            console.error('[UPLOAD] Supabase error:', error);
            throw new Error(`Erro ao fazer upload: ${error.message}`);
        }

        // Get public URL
        const { data: urlData } = supabase.storage
            .from(bucket)
            .getPublicUrl(data.path);

        console.log('[UPLOAD] Success:', urlData.publicUrl);
        return urlData.publicUrl;
    } catch (error: any) {
        console.error('[UPLOAD] Failed:', error.message);
        throw new Error(error.message || 'Falha ao fazer upload da imagem');
    }
}

/**
 * Upload store profile image
 * @param uri - Local file URI
 * @param storeId - Optional store ID for organizing files
 */
export async function uploadStoreProfile(uri: string, storeId?: string): Promise<string> {
    const folder = storeId || 'new';
    return uploadImage(uri, BUCKETS.STORE_PROFILE, folder);
}

/**
 * Upload product image
 * @param uri - Local file URI
 * @param productId - Product ID for organizing files
 * @param imageNumber - 1 or 2 for photo1/photo2
 */
export async function uploadProductImage(
    uri: string,
    productId: string,
    imageNumber: 1 | 2
): Promise<string> {
    const folder = `${productId}`;
    return uploadImage(uri, BUCKETS.PRODUCT_IMAGES, folder);
}

/**
 * Delete an image from Supabase Storage
 * @param publicUrl - The public URL of the image to delete
 * @param bucket - Storage bucket name
 */
export async function deleteImage(publicUrl: string, bucket: BucketName): Promise<void> {
    try {
        // Extract file path from public URL
        const baseUrl = `${SUPABASE_URL}/storage/v1/object/public/${bucket}/`;
        const filePath = publicUrl.replace(baseUrl, '');

        if (!filePath) {
            console.warn('Could not extract file path from URL');
            return;
        }

        const { error } = await supabase.storage
            .from(bucket)
            .remove([filePath]);

        if (error) {
            console.error('Delete error:', error);
        } else {
            console.log('Image deleted:', filePath);
        }
    } catch (error) {
        console.error('Delete failed:', error);
    }
}
