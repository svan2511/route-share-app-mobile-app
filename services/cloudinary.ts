const CLOUDINARY_CLOUD_NAME = 'du33cvn3j';
const CLOUDINARY_UPLOAD_PRESET = 'YOUR_UNSIGNED_UPLOAD_PRESET';

export async function uploadToCloudinary(uri: string): Promise<string | null> {
  const filename = uri.split('/').pop() || 'upload.jpg';
  const ext = filename.split('.').pop() || 'jpg';

  const formData = new FormData();
  formData.append('file', {
    uri,
    type: `image/${ext === 'png' ? 'png' : 'jpeg'}`,
    name: filename,
  } as any);
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

  try {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
      { method: 'POST', body: formData }
    );
    const data = await response.json();
    return data.secure_url || null;
  } catch {
    return null;
  }
}
