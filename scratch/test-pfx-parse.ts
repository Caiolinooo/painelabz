import { supabaseAdmin } from '../src/lib/supabase';
import { decryptPassword } from '../src/lib/e-social/certificado';
import forge from 'node-forge';
import * as dotenv from 'dotenv';
dotenv.config();

async function run() {
  const { data: certRow } = await supabaseAdmin
    .from('esocial_certificados')
    .select('arquivo_path, senha_criptografada, nome')
    .eq('ativo', true)
    .maybeSingle();

  if (!certRow) {
    console.error("No active cert found");
    return;
  }

  console.log("Loading cert:", certRow.nome);

  const { data: blob, error: downloadError } = await supabaseAdmin.storage
    .from('esocial-certificados')
    .download(certRow.arquivo_path);

  if (downloadError || !blob) {
    console.error("Download error:", downloadError);
    return;
  }

  const passphrase = decryptPassword(certRow.senha_criptografada);
  const pfx = Buffer.from(await blob.arrayBuffer());

  try {
    console.log("Attempt 1: forge.pkcs12.pkcs12FromAsn1(p12Asn1, passphrase)");
    const p12Asn1_1 = forge.asn1.fromDer(pfx.toString('binary'));
    const p12_1 = forge.pkcs12.pkcs12FromAsn1(p12Asn1_1, passphrase);
    console.log("Success with Attempt 1!");
  } catch (err: any) {
    console.error("Attempt 1 failed:", err.message || err);
  }

  try {
    console.log("Attempt 2: forge.pkcs12.pkcs12FromAsn1(p12Asn1, false, passphrase)");
    const p12Asn1_2 = forge.asn1.fromDer(pfx.toString('binary'), false);
    const p12_2 = forge.pkcs12.pkcs12FromAsn1(p12Asn1_2, false, passphrase);
    console.log("Success with Attempt 2!");
  } catch (err: any) {
    console.error("Attempt 2 failed:", err.message || err);
  }
}

run();
