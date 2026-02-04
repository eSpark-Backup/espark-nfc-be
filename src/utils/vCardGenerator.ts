export function generateVCard(employee) {
  const { name, email, phone_number, second_phone_number, designation, address, profile_image } =
    employee;

  const vCardLines = ['BEGIN:VCARD', 'VERSION:3.0', `FN:${name || ''}`, `N:${name || ''};;;;`];

  if (designation) vCardLines.push(`TITLE:${designation}`);
  if (address) vCardLines.push(`ADR;TYPE=WORK:;;${address};;;;`);
  if (email) vCardLines.push(`EMAIL;TYPE=INTERNET:${email}`);
  if (phone_number) vCardLines.push(`TEL;TYPE=CELL:${phone_number}`);
  if (second_phone_number) vCardLines.push(`TEL;TYPE=CELL:${second_phone_number}`);

  // Add embedded base64 photo for better compatibility
  if (profile_image?.base64 && profile_image?.mimeType) {
    vCardLines.push(`PHOTO;ENCODING=b;TYPE=${profile_image.mimeType}:${profile_image.base64}`);
  }
  // Fallback to URL if base64 not available
  else if (profile_image?.presigned_url) {
    vCardLines.push(`PHOTO;VALUE=URI:${profile_image.presigned_url}`);
  }

  vCardLines.push('END:VCARD');

  return vCardLines.join('\r\n');
}
