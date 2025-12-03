export function generateVCard(employee) {
  const { name, email, phone_number, second_phone_number, designation, address } = employee;

  const vCardLines = ['BEGIN:VCARD', 'VERSION:3.0', `FN:${name || ''}`, `N:${name || ''};;;;`];

  if (designation) vCardLines.push(`TITLE:${designation}`);
  if (address) vCardLines.push(`ADR;TYPE=WORK:;;${address};;;;`);
  if (email) vCardLines.push(`EMAIL;TYPE=INTERNET:${email}`);
  if (phone_number) vCardLines.push(`TEL;TYPE=CELL:${phone_number}`);
  if (second_phone_number) vCardLines.push(`TEL;TYPE=CELL:${second_phone_number}`);

  vCardLines.push('END:VCARD');

  return vCardLines.join('\r\n');
}
