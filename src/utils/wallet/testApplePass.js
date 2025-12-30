import { PKPass } from 'passkit-generator';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function generateTestPass() {
  try {
    const passFolder = path.join(__dirname, '../../pass-templates/employee.pass');
    const passJsonPath = path.join(passFolder, 'pass.json');

    // Minimal pass.json (must exist)
    if (!fs.existsSync(passJsonPath)) {
      const passJson = {
        formatVersion: 1,
        passTypeIdentifier: 'pass.com.eurosystemsint.nfc',
        teamIdentifier: 'KCJLX2RW95',
        serialNumber: '1234567890',
        organizationName: 'My Company',
        description: 'Employee Card',
        generic: {
          primaryFields: [{ key: 'name', label: 'Name', value: 'Test User' }],
        },
      };
      fs.writeFileSync(passJsonPath, JSON.stringify(passJson, null, 2));
    }

    // Make sure icon files exist
    ['icon.png', 'icon@2x.png'].forEach((icon) => {
      const iconPath = path.join(passFolder, icon);
      if (!fs.existsSync(iconPath)) {
        throw new Error(`Missing required icon file: ${iconPath}`);
      }
    });

    // Load certificates
    const certsPath = path.join(__dirname, '../../../certificates/apple');
    const wwdr = fs.readFileSync(path.join(certsPath, 'wwdr.pem'));
    const signerCert = fs.readFileSync(path.join(certsPath, 'signerCert.pem'));
    const signerKey = fs.readFileSync(path.join(certsPath, 'signerKey.pem'));

    // Generate pass
    const pass = await PKPass.from({
      model: passFolder, // folder containing pass.json + icons
      certificates: { wwdr, signerCert, signerKey },
    });

    // Save output
    const outputPath = path.join(__dirname, '../../temp/apple-passes/test_pass.pkpass');
    if (!fs.existsSync(path.dirname(outputPath)))
      fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, pass.getAsBuffer());

    console.log('✅ Test Apple Wallet pass generated at:', outputPath);
  } catch (err) {
    console.error('❌ Failed to generate test pass:', err);
  }
}

generateTestPass();
