import { SignedXml } from 'xml-crypto';
import forge from 'node-forge';
import { DOMParser, XMLSerializer } from '@xmldom/xmldom';

/**
 * Extrai a chave privada e o certificado em formato PEM de um buffer PFX.
 */
export function extractKeysFromPfx(pfx: Buffer, passphrase: string): { privateKeyPem: string; certPem: string } {
  const p12Asn1 = forge.asn1.fromDer(pfx.toString('binary'));
  const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, passphrase);

  let privateKeyPem = '';
  let certPem = '';

  // Extrair chave privada
  const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
  const keyBag = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag]?.[0];
  if (keyBag?.key) {
    privateKeyPem = forge.pki.privateKeyToPem(keyBag.key);
  } else {
    // Tentar outro tipo de bag se o primeiro falhar
    const keyBags2 = p12.getBags({ bagType: forge.pki.oids.keyBag });
    const keyBag2 = keyBags2[forge.pki.oids.keyBag]?.[0];
    if (keyBag2?.key) {
      privateKeyPem = forge.pki.privateKeyToPem(keyBag2.key);
    }
  }

  // Extrair certificado
  const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
  const certBag = certBags[forge.pki.oids.certBag]?.[0];
  if (certBag?.cert) {
    certPem = forge.pki.certificateToPem(certBag.cert);
  }

  if (!privateKeyPem || !certPem) {
    throw new Error('Não foi possível extrair a chave privada ou o certificado do arquivo PFX.');
  }

  return { privateKeyPem, certPem };
}

/**
 * Assina um XML do e-Social usando o certificado digital (enveloped signature).
 */
export function signESocialXml(xml: string, pfx: Buffer, passphrase: string): string {
  const { privateKeyPem, certPem } = extractKeysFromPfx(pfx, passphrase);
  
  // Limpar o certificado para obter apenas a base64
  const certBase64 = certPem
    .replace(/-----BEGIN CERTIFICATE-----/g, '')
    .replace(/-----END CERTIFICATE-----/g, '')
    .replace(/\s+/g, '');

  const doc = new DOMParser().parseFromString(xml, 'text/xml');
  const eSocialNode = doc.documentElement;
  
  // O e-Social exige que a tag de evento (evtXXXX) tenha um atributo Id para ser assinado
  let eventNode = null;
  const childNodes = eSocialNode.childNodes;
  for (let i = 0; i < childNodes.length; i++) {
    const node = childNodes[i];
    if (node.nodeType === 1 && (node as any).localName?.startsWith('evt')) {
      eventNode = node;
      break;
    }
  }
  
  if (!eventNode) {
    // Se não achou por prefixo, tenta o primeiro elemento filho
    for (let i = 0; i < childNodes.length; i++) {
      if (childNodes[i].nodeType === 1) {
        eventNode = childNodes[i];
        break;
      }
    }
  }
  
  if (!eventNode || (eventNode as any).nodeType !== 1) {
    throw new Error('Não foi possível encontrar a tag de evento para assinar.');
  }

  const tagName = (eventNode as any).localName;
  
  // Garantir que existe um Id (com I maiúsculo conforme padrão e-Social)
  let eventId = (eventNode as any).getAttribute('Id');
  if (!eventId) {
    // Gerar um Id único se não existir
    eventId = `ID${Math.random().toString(36).substring(2, 15)}${Date.now()}`;
    (eventNode as any).setAttribute('Id', eventId);
  }

  const sig = new SignedXml({
    canonicalizationAlgorithm: 'http://www.w3.org/TR/2001/REC-xml-c14n-20010315',
    signatureAlgorithm: 'http://www.w3.org/2001/04/xmldsig-more#rsa-sha256',
    privateKey: privateKeyPem,
    publicCert: certBase64,
    getKeyInfoContent: () => `<X509Data><X509Certificate>${certBase64}</X509Certificate></X509Data>`,
  });

  sig.addReference({
    xpath: "//*[local-name(.)='eSocial']",
    isEmptyUri: true,
    transforms: [
      'http://www.w3.org/2000/09/xmldsig#enveloped-signature',
      'http://www.w3.org/TR/2001/REC-xml-c14n-20010315',
    ],
    digestAlgorithm: 'http://www.w3.org/2001/04/xmlenc#sha256',
  });

  sig.computeSignature(new XMLSerializer().serializeToString(doc));

  
  return sig.getSignedXml();
}
