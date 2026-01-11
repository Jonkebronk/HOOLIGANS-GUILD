// Cloudinary configuration for image uploads
const CLOUD_NAME = 'dwcotdjen';
const UPLOAD_PRESET = 'hooligans_unsigned'; // You need to create this preset in Cloudinary dashboard

export interface CloudinaryUploadResult {
  secure_url: string;
  public_id: string;
  width: number;
  height: number;
  format: string;
}

export async function uploadToCloudinary(file: File): Promise<CloudinaryUploadResult> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', UPLOAD_PRESET);
  formData.append('folder', 'applications');

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    {
      method: 'POST',
      body: formData,
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to upload image');
  }

  return response.json();
}

export function getCloudinaryUrl(publicId: string, options?: {
  width?: number;
  height?: number;
  crop?: string;
}): string {
  const transforms: string[] = [];

  if (options?.width) transforms.push(`w_${options.width}`);
  if (options?.height) transforms.push(`h_${options.height}`);
  if (options?.crop) transforms.push(`c_${options.crop}`);

  const transformString = transforms.length > 0 ? `${transforms.join(',')}/` : '';
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/${transformString}${publicId}`;
}
