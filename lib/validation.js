export const TOKEN_PATTERN = /^[A-Za-z0-9]{1,64}$/;
export const FILE_PATTERN = /^[A-Za-z0-9._-]{1,256}$/;

export function isValidToken(token) {
  return typeof token === 'string' && TOKEN_PATTERN.test(token);
}

export function isValidFile(file) {
  return typeof file === 'string' && FILE_PATTERN.test(file);
}
