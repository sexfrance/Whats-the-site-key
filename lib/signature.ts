const SECRET_KEY = process.env.API_SECRET_KEY || 'your-secret-key';

export async function sign(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const encodedData = encoder.encode(data);
  const encodedKey = encoder.encode(process.env.API_SECRET_KEY || 'default-secret-key');
  
  const key = await crypto.subtle.importKey(
    'raw',
    encodedKey,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encodedData
  );
  
  return Buffer.from(signature).toString('hex');
}

export async function verify(data: string, signature: string): Promise<boolean> {
  const computed = await sign(data);
  return computed === signature;
}
